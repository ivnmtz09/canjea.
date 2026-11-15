import { all, count, get, run } from '../../lib/db.js';
import { AppError } from '../../lib/errors.js';
import { nowIso } from '../../lib/ids.js';
import { can, type Role } from '../../lib/rbac.js';
import { LISTING_SELECT, listingDTO, publicUser } from '../../lib/serialize.js';
import { logAudit, notify } from '../../lib/audit.js';
import type { AuthUser } from '../../middleware/auth.js';

interface UserRow extends Record<string, unknown> {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  created_at: string;
}

export async function getProfile(username: string, viewer?: AuthUser) {
  const row = await get<UserRow>('SELECT * FROM users WHERE lower(username) = lower(?)', username);
  if (!row || row.status === 'DELETED') throw AppError.notFound('Perfil no encontrado');
  const isModerator = viewer ? can(viewer.role, 'user:read') : false;
  if (row.status === 'SUSPENDED' && !isModerator && viewer?.id !== row.id) {
    throw AppError.notFound('Perfil no encontrado');
  }

  const listings = (
    await all(
      `${LISTING_SELECT} WHERE l.user_id = ? AND l.status = 'ACTIVE' ORDER BY l.created_at DESC LIMIT 12`,
      viewer?.id ?? null,
      row.id,
    )
  ).map(listingDTO);

  const reviews = await all<{
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    author_username: string;
    author_display_name: string;
    author_avatar_url: string | null;
  }>(
    `SELECT r.id, r.rating, r.comment, r.created_at,
            a.username AS author_username, a.display_name AS author_display_name, a.avatar_url AS author_avatar_url
     FROM reviews r JOIN users a ON a.id = r.author_id
     WHERE r.target_id = ? ORDER BY r.created_at DESC LIMIT 8`,
    row.id,
  );

  const completed = await count(
    "SELECT COUNT(*) AS n FROM deals WHERE status = 'COMPLETED' AND (owner_id = ? OR proposer_id = ?)",
    row.id,
    row.id,
  );

  return {
    user: publicUser(row, { includePrivate: viewer?.id === row.id || isModerator }),
    listings,
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: Number(review.rating),
      comment: review.comment,
      createdAt: review.created_at,
      author: {
        username: review.author_username,
        displayName: review.author_display_name,
        avatarUrl: review.author_avatar_url,
      },
    })),
    stats: {
      activeListings: listings.length,
      completedDeals: completed,
      memberSince: row.created_at,
      responseTime: '~2 h',
    },
    isSelf: viewer?.id === row.id,
  };
}

export async function updateProfile(userId: string, input: Record<string, unknown>) {
  const mapping: Record<string, string> = {
    displayName: 'display_name',
    bio: 'bio',
    city: 'city',
    country: 'country',
    phone: 'phone',
    avatarUrl: 'avatar_url',
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, column] of Object.entries(mapping)) {
    if (input[key] === undefined) continue;
    sets.push(`${column} = ?`);
    values.push(typeof input[key] === 'string' ? (input[key] as string).trim() : input[key]);
  }
  if (sets.length === 0) throw AppError.badRequest('No enviaste cambios.');
  sets.push('updated_at = ?');
  values.push(nowIso(), userId);
  await run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, ...values);
  await logAudit({ actorId: userId, action: 'user.update_profile', entity: 'user', entityId: userId, meta: { fields: Object.keys(input) } });
  const row = await get<UserRow>('SELECT * FROM users WHERE id = ?', userId);
  return publicUser(row! as unknown as Record<string, unknown>, { includePrivate: true });
}

export async function listUsers(query: { q?: string; role?: string; status?: string; page: number; limit: number }) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (query.q) {
    conditions.push('(u.username ILIKE ? OR u.email ILIKE ? OR u.display_name ILIKE ?)');
    const term = `%${query.q}%`;
    params.push(term, term, term);
  }
  if (query.role) {
    conditions.push('u.role = ?');
    params.push(query.role);
  }
  if (query.status) {
    conditions.push('u.status = ?');
    params.push(query.status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = query.limit;
  const offset = (query.page - 1) * limit;

  const rows = await all(
    `SELECT u.*, (SELECT COUNT(*) FROM listings l WHERE l.user_id = u.id AND l.status = 'ACTIVE') AS listings_count,
            (SELECT COUNT(*) FROM deals d WHERE d.status = 'COMPLETED' AND (d.owner_id = u.id OR d.proposer_id = u.id)) AS deals_count,
            w.balance_cents, w.escrow_cents
     FROM users u LEFT JOIN wallets w ON w.user_id = u.id
     ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset,
  );
  const total = await count(`SELECT COUNT(*) AS n FROM users u ${where}`, ...params);
  return {
    items: rows.map((row) => ({
      ...publicUser(row, { includePrivate: true }),
      listingsCount: Number(row.listings_count ?? 0),
      dealsCount: Number(row.deals_count ?? 0),
      balanceCents: Number(row.balance_cents ?? 0),
      escrowCents: Number(row.escrow_cents ?? 0),
    })),
    meta: { page: query.page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function setRole(actor: AuthUser, targetId: string, role: Role) {
  if (actor.id === targetId) throw AppError.forbidden('No puedes cambiar tu propio rol.');
  const target = await get<UserRow>('SELECT * FROM users WHERE id = ?', targetId);
  if (!target) throw AppError.notFound('Usuario no encontrado');
  if (target.role === role) return publicUser(target as unknown as Record<string, unknown>, { includePrivate: true });

  const admins = await count("SELECT COUNT(*) AS n FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'");
  if (target.role === 'ADMIN' && admins <= 1) throw AppError.conflict('Debe existir al menos un administrador activo.');

  await run('UPDATE users SET role = ?, token_version = token_version + 1, updated_at = ? WHERE id = ?', role, nowIso(), targetId);
  await run('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', nowIso(), targetId);
  await notify({
    userId: targetId,
    type: 'ROLE_CHANGED',
    title: 'Tu rol cambió',
    body: `Ahora eres ${role}. Vuelve a iniciar sesión para aplicar los permisos.`,
    link: '/app/perfil',
  });
  await logAudit({ actorId: actor.id, action: 'user.set_role', entity: 'user', entityId: targetId, meta: { from: target.role, to: role } });
  const updated = await get<UserRow>('SELECT * FROM users WHERE id = ?', targetId);
  return publicUser(updated! as unknown as Record<string, unknown>, { includePrivate: true });
}

export async function setStatus(actor: AuthUser, targetId: string, status: 'ACTIVE' | 'SUSPENDED', reason?: string) {
  if (actor.id === targetId) throw AppError.forbidden('No puedes suspender tu propia cuenta.');
  const target = await get<UserRow>('SELECT * FROM users WHERE id = ?', targetId);
  if (!target) throw AppError.notFound('Usuario no encontrado');
  if (target.role === 'ADMIN') throw AppError.forbidden('No se puede suspender a un administrador.');
  if (actor.role === 'MODERATOR' && target.role !== 'USER') {
    throw AppError.forbidden('Un moderador solo puede suspender cuentas USER.');
  }
  if (target.status === status) return { status };

  await run('UPDATE users SET status = ?, token_version = token_version + 1, updated_at = ? WHERE id = ?', status, nowIso(), targetId);
  if (status === 'SUSPENDED') {
    await run('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', nowIso(), targetId);
  }
  await notify({
    userId: targetId,
    type: 'ACCOUNT_STATUS',
    title: status === 'SUSPENDED' ? 'Cuenta suspendida' : 'Cuenta reactivada',
    body: status === 'SUSPENDED' ? reason ?? 'Contacta a soporte para más información.' : 'Ya puedes volver a usar CANJEA.',
    link: '/app',
  });
  await logAudit({ actorId: actor.id, action: 'user.set_status', entity: 'user', entityId: targetId, meta: { status, reason: reason ?? null } });
  return { status };
}

export async function favoriteListings(userId: string) {
  const rows = await all(
    `${LISTING_SELECT} JOIN favorites fav ON fav.listing_id = l.id AND fav.user_id = ? WHERE l.status = 'ACTIVE' ORDER BY fav.created_at DESC`,
    userId,
    userId,
  );
  return rows.map((row) => listingDTO(row));
}

export async function userStats(userId: string) {
  const listings = await count("SELECT COUNT(*) AS n FROM listings WHERE user_id = ? AND status = 'ACTIVE'", userId);
  const completed = await count(
    "SELECT COUNT(*) AS n FROM deals WHERE status = 'COMPLETED' AND (owner_id = ? OR proposer_id = ?)",
    userId,
    userId,
  );
  const incoming = await count("SELECT COUNT(*) AS n FROM deals WHERE owner_id = ? AND status = 'PROPOSED'", userId);
  const wallet = await get<{ balance_cents: number; escrow_cents: number }>(
    'SELECT balance_cents, escrow_cents FROM wallets WHERE user_id = ?',
    userId,
  );
  return {
    activeListings: listings,
    completedDeals: completed,
    pendingProposals: incoming,
    balanceCents: Number(wallet?.balance_cents ?? 0),
    escrowCents: Number(wallet?.escrow_cents ?? 0),
  };
}
