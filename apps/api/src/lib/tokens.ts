import { createHmac, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { get, run } from './db.js';
import { newId, addDays, nowIso } from './ids.js';
import { AppError } from './errors.js';

export type Role = 'USER' | 'MODERATOR' | 'ADMIN';

export interface AccessPayload {
  sub: string;
  role: Role;
  username: string;
  tv: number;
  verified: boolean;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
    algorithm: 'HS256',
    issuer: 'canjea.api',
    audience: 'canjea.web',
  });
}

export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: 'canjea.api',
      audience: 'canjea.web',
    });
    if (typeof decoded === 'string') return null;
    return decoded as AccessPayload;
  } catch {
    return null;
  }
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(`${raw}:${env.JWT_REFRESH_SECRET}`).digest('hex');
}

export async function createRefreshToken(userId: string, meta: { userAgent?: string; ip?: string }): Promise<string> {
  const raw = randomBytes(48).toString('base64url');
  const id = newId('token');
  await run(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, user_agent, ip, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    userId,
    hashToken(raw),
    addDays(env.REFRESH_TOKEN_DAYS).toISOString(),
    meta.userAgent?.slice(0, 250) ?? null,
    meta.ip ?? null,
    nowIso(),
  );
  return raw;
}

export async function rotateRefreshToken(raw: string, meta: { userAgent?: string; ip?: string }) {
  const stored = await get<{
    id: string;
    user_id: string;
    expires_at: string;
    revoked_at: string | null;
  }>('SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ?', hashToken(raw));

  if (!stored || stored.revoked_at) throw AppError.unauthorized('Sesión expirada. Vuelve a entrar.');
  if (new Date(stored.expires_at).getTime() < Date.now()) {
    throw AppError.unauthorized('Sesión expirada. Vuelve a entrar.');
  }

  await run('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?', nowIso(), stored.id);
  return { userId: stored.user_id, refreshToken: await createRefreshToken(stored.user_id, meta) };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  await run('UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL', nowIso(), hashToken(raw));
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await run('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', nowIso(), userId);
  await run('UPDATE users SET token_version = token_version + 1, updated_at = ? WHERE id = ?', nowIso(), userId);
}

export function hashVerificationCode(userId: string, purpose: string, code: string): string {
  return createHmac('sha256', env.JWT_ACCESS_SECRET)
    .update(`${purpose}:${userId}:${code}`)
    .digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function generateCode(): string {
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');
}

export async function pruneExpiredTokens(): Promise<void> {
  await run(
    'DELETE FROM refresh_tokens WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?)',
    nowIso(),
    addDays(-2).toISOString(),
  );
  await run('DELETE FROM verification_codes WHERE expires_at < ?', addDays(-1).toISOString());
}
