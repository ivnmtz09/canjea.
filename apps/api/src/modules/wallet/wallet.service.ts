import { env } from '../../config/env.js';
import { all, get, run, tx } from '../../lib/db.js';
import { AppError } from '../../lib/errors.js';
import { newId, nowIso } from '../../lib/ids.js';
import { logAudit, notify } from '../../lib/audit.js';

export interface Wallet {
  balanceCents: number;
  escrowCents: number;
  currency: string;
}

export async function ensureWallet(userId: string): Promise<Wallet> {
  let row = await get<{ balance_cents: number; escrow_cents: number; currency: string }>(
    'SELECT balance_cents, escrow_cents, currency FROM wallets WHERE user_id = ?',
    userId,
  );
  if (!row) {
    await run(
      `INSERT INTO wallets (user_id, balance_cents, escrow_cents, currency, updated_at)
       VALUES (?, 0, 0, ?, ?) ON CONFLICT (user_id) DO NOTHING`,
      userId,
      env.CURRENCY,
      nowIso(),
    );
    row = await get<{ balance_cents: number; escrow_cents: number; currency: string }>(
      'SELECT balance_cents, escrow_cents, currency FROM wallets WHERE user_id = ?',
      userId,
    );
  }
  return {
    balanceCents: Number(row?.balance_cents ?? 0),
    escrowCents: Number(row?.escrow_cents ?? 0),
    currency: row?.currency ?? env.CURRENCY,
  };
}

export async function listTransactions(userId: string, limit = 40) {
  return (
    await all<{
      id: string;
      deal_id: string | null;
      type: string;
      amount_cents: number;
      status: string;
      description: string;
      created_at: string;
    }>(
      'SELECT id, deal_id, type, amount_cents, status, description, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      userId,
      Math.min(100, Math.max(1, limit)),
    )
  ).map((row) => ({
    id: row.id,
    dealId: row.deal_id,
    type: row.type,
    amountCents: Number(row.amount_cents),
    status: row.status,
    description: row.description,
    createdAt: row.created_at,
  }));
}

export async function getWallet(userId: string) {
  const wallet = await ensureWallet(userId);
  const totals = await get<{ inflow: number | string; outflow: number | string }>(
    `SELECT COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0) AS inflow,
            COALESCE(SUM(CASE WHEN amount_cents < 0 THEN -amount_cents ELSE 0 END), 0) AS outflow
     FROM transactions WHERE user_id = ? AND status = 'SETTLED'`,
    userId,
  );
  return {
    ...wallet,
    inflowCents: Number(totals?.inflow ?? 0),
    outflowCents: Number(totals?.outflow ?? 0),
    transactions: await listTransactions(userId),
  };
}

async function recordTransaction(input: {
  userId: string;
  dealId?: string | null;
  type: string;
  amountCents: number;
  description: string;
}) {
  await run(
    `INSERT INTO transactions (id, user_id, deal_id, type, amount_cents, status, description, created_at)
     VALUES (?, ?, ?, ?, ?, 'SETTLED', ?, ?)`,
    newId('transaction'),
    input.userId,
    input.dealId ?? null,
    input.type,
    input.amountCents,
    input.description,
    nowIso(),
  );
}

export async function topUp(userId: string, amountCents: number, ip?: string) {
  await tx(async () => {
    await ensureWallet(userId);
    await run('UPDATE wallets SET balance_cents = balance_cents + ?, updated_at = ? WHERE user_id = ?', amountCents, nowIso(), userId);
    await recordTransaction({
      userId,
      type: 'TOPUP',
      amountCents,
      description: 'Recarga de saldo de demostración',
    });
  });
  await logAudit({ actorId: userId, action: 'wallet.topup', entity: 'wallet', entityId: userId, meta: { amountCents }, ip });
  await notify({
    userId,
    type: 'WALLET',
    title: 'Saldo recargado',
    body: `Se acreditaron $${(amountCents / 100).toFixed(2)} a tu billetera.`,
    link: '/app/billetera',
  });
  return getWallet(userId);
}

export async function withdraw(userId: string, amountCents: number, ip?: string) {
  await tx(async () => {
    await ensureWallet(userId);
    const updated = await run(
      'UPDATE wallets SET balance_cents = balance_cents - ?, updated_at = ? WHERE user_id = ? AND balance_cents >= ?',
      amountCents,
      nowIso(),
      userId,
      amountCents,
    );
    if (Number(updated.changes) !== 1) {
      const wallet = await ensureWallet(userId);
      throw new AppError(409, 'INSUFFICIENT_FUNDS', 'No tienes saldo suficiente para este retiro.', {
        balanceCents: wallet.balanceCents,
        requiredCents: amountCents,
      });
    }
    await recordTransaction({ userId, type: 'PAYOUT', amountCents: -amountCents, description: 'Retiro solicitado (simulado)' });
  });
  await logAudit({ actorId: userId, action: 'wallet.withdraw', entity: 'wallet', entityId: userId, meta: { amountCents }, ip });
  await notify({
    userId,
    type: 'WALLET',
    title: 'Retiro solicitado',
    body: `Procesaremos $${(amountCents / 100).toFixed(2)} en un plazo de 2 días hábiles.`,
    link: '/app/billetera',
  });
  return getWallet(userId);
}

export async function holdEscrow(input: { dealId: string; proposerId: string; ownerId: string; cents: number }): Promise<void> {
  if (input.cents <= 0) return;
  await ensureWallet(input.proposerId);
  await ensureWallet(input.ownerId);
  const debited = await run(
    'UPDATE wallets SET balance_cents = balance_cents - ?, updated_at = ? WHERE user_id = ? AND balance_cents >= ?',
    input.cents,
    nowIso(),
    input.proposerId,
    input.cents,
  );
  if (Number(debited.changes) !== 1) {
    throw new AppError(409, 'INSUFFICIENT_FUNDS', 'No tienes saldo suficiente para respaldar esta oferta.', {
      action: 'TOPUP',
    });
  }
  await run('UPDATE wallets SET escrow_cents = escrow_cents + ?, updated_at = ? WHERE user_id = ?', input.cents, nowIso(), input.ownerId);
  await recordTransaction({
    userId: input.proposerId,
    dealId: input.dealId,
    type: 'ESCROW_HOLD',
    amountCents: -input.cents,
    description: 'Fondos retenidos en garantía para una negociación',
  });
}

export async function refundEscrow(input: {
  dealId: string;
  proposerId: string;
  ownerId: string;
  cents: number;
}): Promise<void> {
  if (input.cents <= 0) return;
  const released = await run(
    'UPDATE wallets SET escrow_cents = escrow_cents - ?, updated_at = ? WHERE user_id = ? AND escrow_cents >= ?',
    input.cents,
    nowIso(),
    input.ownerId,
    input.cents,
  );
  if (Number(released.changes) !== 1) return;
  await run('UPDATE wallets SET balance_cents = balance_cents + ?, updated_at = ? WHERE user_id = ?', input.cents, nowIso(), input.proposerId);
  await recordTransaction({
    userId: input.proposerId,
    dealId: input.dealId,
    type: 'ESCROW_REFUND',
    amountCents: input.cents,
    description: 'Devolución de fondos en garantía',
  });
}

export async function releaseEscrow(input: { dealId: string; ownerId: string; cents: number }) {
  if (input.cents <= 0) return { feeCents: 0, netCents: 0 };
  const feeCents = Math.round((input.cents * env.PLATFORM_FEE_BPS) / 10_000);
  const netCents = input.cents - feeCents;
  const released = await run(
    'UPDATE wallets SET escrow_cents = escrow_cents - ?, balance_cents = balance_cents + ?, updated_at = ? WHERE user_id = ? AND escrow_cents >= ?',
    input.cents,
    netCents,
    nowIso(),
    input.ownerId,
    input.cents,
  );
  if (Number(released.changes) !== 1) {
    throw new AppError(409, 'ESCROW_MISMATCH', 'No pudimos liberar la garantía. Contacta a soporte.');
  }
  await recordTransaction({
    userId: input.ownerId,
    dealId: input.dealId,
    type: 'ESCROW_RELEASE',
    amountCents: input.cents,
    description: 'Liberación de garantía por canje completado',
  });
  await recordTransaction({
    userId: input.ownerId,
    dealId: input.dealId,
    type: 'FEE',
    amountCents: -feeCents,
    description: `Comisión de plataforma (${(env.PLATFORM_FEE_BPS / 100).toFixed(2)}%)`,
  });
  return { feeCents, netCents };
}
