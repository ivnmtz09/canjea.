import { all, count, get, run, tx } from '../../lib/db.js';
import { AppError } from '../../lib/errors.js';
import { newId, nowIso } from '../../lib/ids.js';
import { can } from '../../lib/rbac.js';
import { DEAL_SELECT, dealDTO } from '../../lib/serialize.js';
import { logAudit, notify } from '../../lib/audit.js';
import type { AuthUser } from '../../middleware/auth.js';
import { ensureWallet, holdEscrow, refundEscrow, releaseEscrow } from '../wallet/wallet.service.js';
import type { CreateDealInput } from './deals.schemas.js';

interface DealRow {
  id: string;
  listing_id: string;
  owner_id: string;
  proposer_id: string;
  message: string;
  offer_listing_id: string | null;
  cash_cents: number;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface ListingRow {
  id: string;
  user_id: string;
  title: string;
  kind: string;
  status: string;
  modality: string;
  price_cents: number;
  currency: string;
}

async function rawDeal(id: string): Promise<DealRow> {
  const deal = await get<DealRow>('SELECT * FROM deals WHERE id = ?', id);
  if (!deal) throw AppError.notFound('Negociación no encontrada');
  return deal;
}

function assertParticipant(deal: DealRow, user: AuthUser) {
  if (deal.owner_id !== user.id && deal.proposer_id !== user.id && !can(user.role, 'deal:moderate')) {
    throw AppError.forbidden('No participas en esta negociación.');
  }
}

export async function createDeal(input: CreateDealInput, proposer: AuthUser) {
  const listing = await get<ListingRow>('SELECT * FROM listings WHERE id = ?', input.listingId);
  if (!listing) throw AppError.notFound('Publicación no encontrada');
  if (listing.user_id === proposer.id) throw AppError.badRequest('No puedes negociar contigo mismo.');
  if (listing.status !== 'ACTIVE') throw AppError.conflict('Esta publicación ya no está disponible.');

  if (listing.modality === 'BARTER' && input.cashCents > 0) {
    throw AppError.unprocessable('Esta publicación solo acepta trueque, no dinero.', { cashCents: 'No se acepta dinero' });
  }
  if (listing.modality === 'CASH' && input.cashCents <= 0) {
    throw AppError.unprocessable('Esta publicación solo se canjea por dinero.', { cashCents: 'Indica un monto' });
  }

  if (input.offerListingId) {
    const offer = await get<ListingRow>('SELECT * FROM listings WHERE id = ?', input.offerListingId);
    if (!offer || offer.user_id !== proposer.id)
      throw AppError.unprocessable('La publicación que ofreces no es tuya.', { offerListingId: 'Oferta inválida' });
    if (offer.status !== 'ACTIVE') throw AppError.conflict('La publicación que ofreces no está activa.');
    if (offer.id === listing.id) throw AppError.badRequest('No puedes ofrecer la misma publicación.');
  }

  const duplicate = await get(
    `SELECT 1 FROM deals WHERE listing_id = ? AND proposer_id = ? AND status = 'PROPOSED'`,
    input.listingId,
    proposer.id,
  );
  if (duplicate) throw AppError.conflict('Ya tienes una propuesta abierta para esta publicación.');

  if (input.cashCents > 0) {
    const wallet = await ensureWallet(proposer.id);
    if (wallet.balanceCents < input.cashCents) {
      throw new AppError(409, 'INSUFFICIENT_FUNDS', 'Necesitas saldo en tu billetera para respaldar una oferta con dinero.', {
        balanceCents: wallet.balanceCents,
        requiredCents: input.cashCents,
        action: 'TOPUP',
      });
    }
  }

  const id = newId('deal');
  const timestamp = nowIso();
  await run(
    `INSERT INTO deals (id, listing_id, owner_id, proposer_id, message, offer_listing_id, cash_cents, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PROPOSED', ?, ?)`,
    id,
    listing.id,
    listing.user_id,
    proposer.id,
    input.message.trim(),
    input.offerListingId ?? null,
    input.cashCents,
    timestamp,
    timestamp,
  );

  await run(
    'INSERT INTO deal_messages (id, deal_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
    newId('msg'),
    id,
    proposer.id,
    input.message.trim(),
    timestamp,
  );

  await notify({
    userId: listing.user_id,
    type: 'DEAL_RECEIVED',
    title: 'Nueva propuesta de canje',
    body: `${proposer.displayName} quiere negociar «${listing.title}».`,
    link: `/app/negociaciones/${id}`,
  });
  await logAudit({
    actorId: proposer.id,
    action: 'deal.create',
    entity: 'deal',
    entityId: id,
    meta: { listingId: listing.id, cashCents: input.cashCents },
  });

  return getDeal(id, proposer);
}

export async function listDeals(user: AuthUser, query: { role: string; status: string }) {
  const conditions = ['(d.owner_id = ? OR d.proposer_id = ?)'];
  const params: unknown[] = [user.id, user.id];
  if (query.role === 'incoming') conditions.push('d.owner_id = ?'), params.push(user.id);
  if (query.role === 'outgoing') conditions.push('d.proposer_id = ?'), params.push(user.id);
  if (query.status !== 'all') conditions.push('d.status = ?'), params.push(query.status);

  const rows = await all(`${DEAL_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY d.updated_at DESC LIMIT 80`, ...params);
  const counts = await all<{ status: string; n: number }>(
    'SELECT status, COUNT(*) AS n FROM deals WHERE owner_id = ? OR proposer_id = ? GROUP BY status',
    user.id,
    user.id,
  );
  const pendingIncoming = await count("SELECT COUNT(*) AS n FROM deals WHERE owner_id = ? AND status = 'PROPOSED'", user.id);
  return {
    items: rows.map((row) => dealDTO(row, user.id)),
    counts: Object.fromEntries(counts.map((row) => [row.status, Number(row.n)])),
    pendingIncoming,
  };
}

export async function getDeal(id: string, user: AuthUser) {
  const deal = await rawDeal(id);
  assertParticipant(deal, user);
  const row = await get(`${DEAL_SELECT} WHERE d.id = ?`, id);
  if (!row) throw AppError.notFound('Negociación no encontrada');
  const reviewed = await get('SELECT 1 FROM reviews WHERE deal_id = ? AND author_id = ?', id, user.id);
  const isOwner = deal.owner_id === user.id;
  return {
    ...dealDTO(row, user.id),
    flags: {
      canRespond: isOwner && deal.status === 'PROPOSED',
      canComplete: deal.status === 'ACCEPTED' && (isOwner || deal.proposer_id === user.id),
      canCancel: ['PROPOSED', 'ACCEPTED'].includes(deal.status) && (isOwner || deal.proposer_id === user.id),
      canReview: deal.status === 'COMPLETED' && !reviewed,
      isOwner,
    },
  };
}

export async function respondToDeal(id: string, actor: AuthUser, action: 'accept' | 'reject') {
  const deal = await rawDeal(id);
  if (deal.owner_id !== actor.id) throw AppError.forbidden('Solo el dueño de la publicación puede responder.');
  if (deal.status !== 'PROPOSED') throw AppError.conflict('Esta propuesta ya fue respondida.');

  if (action === 'accept') {
    const listing = await get<ListingRow>('SELECT * FROM listings WHERE id = ?', deal.listing_id);
    if (!listing || listing.status !== 'ACTIVE') throw AppError.conflict('La publicación ya no está disponible.');

    await tx(async () => {
      await holdEscrow({
        dealId: deal.id,
        proposerId: deal.proposer_id,
        ownerId: deal.owner_id,
        cents: Number(deal.cash_cents),
      });
      await run("UPDATE deals SET status = 'ACCEPTED', updated_at = ? WHERE id = ?", nowIso(), deal.id);
      await run("UPDATE listings SET status = 'MATCHED', updated_at = ? WHERE id = ?", nowIso(), deal.listing_id);
      if (deal.offer_listing_id) {
        await run("UPDATE listings SET status = 'MATCHED', updated_at = ? WHERE id = ?", nowIso(), deal.offer_listing_id);
      }
      const others = await all<{ id: string; proposer_id: string }>(
        "SELECT id, proposer_id FROM deals WHERE listing_id = ? AND id <> ? AND status = 'PROPOSED'",
        deal.listing_id,
        deal.id,
      );
      for (const other of others) {
        await run("UPDATE deals SET status = 'REJECTED', updated_at = ? WHERE id = ?", nowIso(), other.id);
        await notify({
          userId: other.proposer_id,
          type: 'DEAL_REJECTED',
          title: 'Propuesta cerrada',
          body: `«${listing.title}» encontró otro canje.`,
          link: '/app/negociaciones',
        });
      }
      await notify({
        userId: deal.proposer_id,
        type: 'DEAL_ACCEPTED',
        title: '¡Aceptaron tu propuesta!',
        body: `«${listing.title}» está listo para coordinar.`,
        link: `/app/negociaciones/${deal.id}`,
      });
    });
    await logAudit({ actorId: actor.id, action: 'deal.accept', entity: 'deal', entityId: deal.id });
  } else {
    await run("UPDATE deals SET status = 'REJECTED', updated_at = ? WHERE id = ?", nowIso(), deal.id);
    const listing = await get<{ title: string }>('SELECT title FROM listings WHERE id = ?', deal.listing_id);
    await notify({
      userId: deal.proposer_id,
      type: 'DEAL_REJECTED',
      title: 'Propuesta rechazada',
      body: `La propuesta para «${listing?.title ?? 'la publicación'}» no fue aceptada.`,
      link: `/app/negociaciones/${deal.id}`,
    });
    await logAudit({ actorId: actor.id, action: 'deal.reject', entity: 'deal', entityId: deal.id });
  }

  return getDeal(id, actor);
}

export async function completeDeal(id: string, actor: AuthUser) {
  const deal = await rawDeal(id);
  assertParticipant(deal, actor);
  if (deal.status !== 'ACCEPTED') throw AppError.conflict('Solo puedes completar negociaciones aceptadas.');

  const listing = await get<ListingRow>('SELECT * FROM listings WHERE id = ?', deal.listing_id);
  let feeCents = 0;
  await tx(async () => {
    if (Number(deal.cash_cents) > 0) {
      const result = await releaseEscrow({ dealId: deal.id, ownerId: deal.owner_id, cents: Number(deal.cash_cents) });
      feeCents = result.feeCents;
    }
    await run(
      "UPDATE deals SET status = 'COMPLETED', completed_at = ?, updated_at = ? WHERE id = ?",
      nowIso(),
      nowIso(),
      deal.id,
    );
    await run("UPDATE listings SET status = 'MATCHED', updated_at = ? WHERE id = ?", nowIso(), deal.listing_id);
    const counterpart = deal.owner_id === actor.id ? deal.proposer_id : deal.owner_id;
    await notify({
      userId: counterpart,
      type: 'DEAL_COMPLETED',
      title: 'Canje completado',
      body: `«${listing?.title ?? 'La publicación'}» se completó. Deja una reseña a tu contraparte.`,
      link: `/app/negociaciones/${deal.id}`,
    });
    await notify({
      userId: deal.owner_id,
      type: 'WALLET',
      title: 'Fondos liberados',
      body:
        Number(deal.cash_cents) > 0
          ? `Recibiste $${((Number(deal.cash_cents) - feeCents) / 100).toFixed(2)} (comisión $${(feeCents / 100).toFixed(2)}).`
          : 'El trueque quedó registrado en tu historial.',
      link: '/app/billetera',
    });
  });
  await logAudit({ actorId: actor.id, action: 'deal.complete', entity: 'deal', entityId: deal.id, meta: { feeCents } });
  return getDeal(id, actor);
}

export async function cancelDeal(id: string, actor: AuthUser, reason?: string) {
  const deal = await rawDeal(id);
  assertParticipant(deal, actor);
  if (!['PROPOSED', 'ACCEPTED'].includes(deal.status)) throw AppError.conflict('Esta negociación ya está cerrada.');

  await tx(async () => {
    if (deal.status === 'ACCEPTED' && Number(deal.cash_cents) > 0) {
      await refundEscrow({
        dealId: deal.id,
        proposerId: deal.proposer_id,
        ownerId: deal.owner_id,
        cents: Number(deal.cash_cents),
      });
    }
    await run("UPDATE deals SET status = 'CANCELLED', updated_at = ? WHERE id = ?", nowIso(), deal.id);
    const stillMatched = await count(
      "SELECT COUNT(*) AS n FROM deals WHERE listing_id = ? AND status IN ('ACCEPTED','COMPLETED')",
      deal.listing_id,
    );
    if (stillMatched === 0) {
      await run("UPDATE listings SET status = 'ACTIVE', updated_at = ? WHERE id = ? AND status = 'MATCHED'", nowIso(), deal.listing_id);
    }
    const counterpart = deal.owner_id === actor.id ? deal.proposer_id : deal.owner_id;
    await notify({
      userId: counterpart,
      type: 'DEAL_CANCELLED',
      title: 'Negociación cancelada',
      body: reason?.trim() ? reason.trim() : 'La otra parte canceló la negociación.',
      link: `/app/negociaciones/${deal.id}`,
    });
  });
  await logAudit({
    actorId: actor.id,
    action: 'deal.cancel',
    entity: 'deal',
    entityId: deal.id,
    meta: { reason: reason ?? null },
  });
  return getDeal(id, actor);
}

export async function reviewDeal(id: string, actor: AuthUser, rating: number, comment: string) {
  const deal = await rawDeal(id);
  assertParticipant(deal, actor);
  if (deal.status !== 'COMPLETED') throw AppError.conflict('Solo puedes reseñar canjes completados.');
  const existing = await get('SELECT 1 FROM reviews WHERE deal_id = ? AND author_id = ?', id, actor.id);
  if (existing) throw AppError.conflict('Ya dejaste una reseña para este canje.');
  const targetId = deal.owner_id === actor.id ? deal.proposer_id : deal.owner_id;

  await tx(async () => {
    await run(
      'INSERT INTO reviews (id, deal_id, author_id, target_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      newId('review'),
      id,
      actor.id,
      targetId,
      rating,
      comment.trim(),
      nowIso(),
    );
    await run(
      `UPDATE users SET rating_avg = ROUND(((rating_avg * rating_count) + ?) / (rating_count + 1), 2),
                        rating_count = rating_count + 1, updated_at = ?
       WHERE id = ?`,
      rating,
      nowIso(),
      targetId,
    );
    await notify({
      userId: targetId,
      type: 'REVIEW',
      title: 'Nueva reseña recibida',
      body: `${actor.displayName} te dejó ${rating} de 5 estrellas.`,
      link: `/u/${actor.username}`,
    });
  });
  await logAudit({ actorId: actor.id, action: 'deal.review', entity: 'deal', entityId: id, meta: { rating, targetId } });
  return getDeal(id, actor);
}

export interface DealMessageDTO {
  id: string;
  dealId: string;
  senderId: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  content: string;
  createdAt: string;
}

export async function listDealMessages(dealId: string, user: AuthUser): Promise<DealMessageDTO[]> {
  const deal = await rawDeal(dealId);
  assertParticipant(deal, user);

  const rows = await all<{
    id: string;
    deal_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    u_id: string;
    u_username: string;
    u_display_name: string;
    u_avatar_url: string | null;
  }>(
    `SELECT m.id, m.deal_id, m.sender_id, m.content, m.created_at,
            u.id AS u_id, u.username AS u_username, u.display_name AS u_display_name, u.avatar_url AS u_avatar_url
     FROM deal_messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.deal_id = ?
     ORDER BY m.created_at ASC`,
    dealId,
  );

  return rows.map((r) => ({
    id: r.id,
    dealId: r.deal_id,
    senderId: r.sender_id,
    sender: {
      id: r.u_id,
      username: r.u_username,
      displayName: r.u_display_name,
      avatarUrl: r.u_avatar_url,
    },
    content: r.content,
    createdAt: r.created_at,
  }));
}

export async function sendDealMessage(dealId: string, content: string, user: AuthUser): Promise<DealMessageDTO> {
  const deal = await rawDeal(dealId);
  assertParticipant(deal, user);

  if (deal.status === 'REJECTED' || deal.status === 'CANCELLED') {
    throw AppError.badRequest('No se pueden enviar mensajes en una negociación cerrada.');
  }

  const id = newId('msg');
  const now = nowIso();

  await run(
    'INSERT INTO deal_messages (id, deal_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
    id,
    dealId,
    user.id,
    content,
    now,
  );

  const counterpartId = deal.owner_id === user.id ? deal.proposer_id : deal.owner_id;
  await notify({
    userId: counterpartId,
    type: 'DEAL_RECEIVED',
    title: 'Nuevo mensaje en la negociación',
    body: `${user.displayName}: ${content.slice(0, 100)}`,
    link: `/app/negociaciones/${dealId}`,
  });

  return {
    id,
    dealId,
    senderId: user.id,
    sender: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
    },
    content,
    createdAt: now,
  };
}
