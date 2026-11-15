import { env } from '../../config/env.js';
import { get, run, tx } from '../../lib/db.js';
import { AppError } from '../../lib/errors.js';
import { addDays, minutesFromNow, newId, nowIso } from '../../lib/ids.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { permissionsFor, type Role } from '../../lib/rbac.js';
import { publicUser } from '../../lib/serialize.js';
import {
  generateCode,
  hashVerificationCode,
  hashToken,
  revokeAllUserTokens,
  revokeRefreshToken,
  safeEqual,
  signAccessToken,
  createRefreshToken,
} from '../../lib/tokens.js';
import { logAudit, notify, unreadNotifications } from '../../lib/audit.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

interface UserRow {
  id: string;
  email: string;
  username: string;
  display_name: string;
  password_hash: string;
  avatar_url: string | null;
  bio: string;
  city: string;
  country: string;
  phone: string | null;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  email_verified_at: string | null;
  rating_avg: number;
  rating_count: number;
  token_version: number;
  created_at: string;
  updated_at: string;
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const attempts = new Map<string, { count: number; until: number }>();

function assertNotLocked(key: string) {
  const entry = attempts.get(key);
  if (!entry) return;
  if (entry.until > Date.now()) {
    const minutes = Math.ceil((entry.until - Date.now()) / 60_000);
    throw new AppError(429, 'ACCOUNT_LOCKED', `Demasiados intentos fallidos. Prueba de nuevo en ${minutes} min.`);
  }
  attempts.delete(key);
}

function registerFailure(key: string) {
  const entry = attempts.get(key) ?? { count: 0, until: 0 };
  entry.count += 1;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.until = Date.now() + LOCK_MINUTES * 60_000;
    entry.count = 0;
  }
  attempts.set(key, entry);
}

export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}

function assertPasswordNotPersonal(password: string, email: string, username: string) {
  const lower = password.toLowerCase();
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  if (lower.includes(username.toLowerCase()) || (local.length >= 3 && lower.includes(local))) {
    throw AppError.unprocessable('La contraseña no puede contener tu usuario ni tu correo.', {
      password: 'No incluyas tu usuario o correo en la contraseña',
    });
  }
}

async function userRow(id: string): Promise<UserRow> {
  const row = await get<UserRow>('SELECT * FROM users WHERE id = ?', id);
  if (!row) throw AppError.notFound('Usuario no encontrado');
  return row;
}

export async function authPayload(userId: string) {
  const row = await userRow(userId);
  const permissions = permissionsFor(row.role);
  const accessToken = signAccessToken({
    sub: row.id,
    role: row.role,
    username: row.username,
    tv: Number(row.token_version),
    verified: Boolean(row.email_verified_at),
  });
  return {
    user: {
      ...publicUser(row as unknown as Record<string, unknown>, { includePrivate: true }),
      permissions,
      unreadNotifications: await unreadNotifications(row.id),
    },
    permissions,
    accessToken,
  };
}

export async function getMe(userId: string) {
  const payload = await authPayload(userId);
  const wallet = await get<{ balance_cents: number; escrow_cents: number; currency: string }>(
    'SELECT balance_cents, escrow_cents, currency FROM wallets WHERE user_id = ?',
    userId,
  );
  return {
    ...payload,
    wallet: wallet
      ? { balanceCents: Number(wallet.balance_cents), escrowCents: Number(wallet.escrow_cents), currency: wallet.currency }
      : { balanceCents: 0, escrowCents: 0, currency: env.CURRENCY },
  };
}

async function createVerificationCode(userId: string, purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET', email: string) {
  const latest = await get<{ created_at: string }>(
    `SELECT created_at FROM verification_codes
     WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    userId,
    purpose,
  );
  if (latest && Date.now() - new Date(latest.created_at).getTime() < 45_000) {
    throw AppError.tooMany('Espera un momento antes de pedir otro código.');
  }

  await run('UPDATE verification_codes SET consumed_at = ? WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL', nowIso(), userId, purpose);

  const code = generateCode();
  const expiresAt = minutesFromNow(purpose === 'EMAIL_VERIFY' ? 30 : 15).toISOString();
  await run(
    `INSERT INTO verification_codes (id, user_id, purpose, code_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    newId('code'),
    userId,
    purpose,
    hashVerificationCode(userId, purpose, code),
    expiresAt,
    nowIso(),
  );

  console.info(`\n  ✉  [CANJEA mail] ${purpose} → ${email}\n     código: ${code}  (vence ${expiresAt})\n`);
  return { code, expiresAt };
}

async function consumeCode(userId: string, purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET', code: string): Promise<void> {
  const row = await get<{ id: string; code_hash: string; expires_at: string; attempts: number }>(
    `SELECT id, code_hash, expires_at, attempts FROM verification_codes
     WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    userId,
    purpose,
  );
  if (!row) throw new AppError(400, 'CODE_NOT_FOUND', 'No hay un código activo. Solicita uno nuevo.');
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new AppError(400, 'CODE_EXPIRED', 'El código expiró. Solicita uno nuevo.');
  }
  if (Number(row.attempts) >= 5) {
    throw AppError.tooMany('Demasiados intentos con este código. Solicita uno nuevo.');
  }
  const expected = hashVerificationCode(userId, purpose, code);
  if (!safeEqual(expected, row.code_hash)) {
    await run('UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?', row.id);
    throw new AppError(400, 'INVALID_CODE', 'El código no es correcto.', { code: 'Código incorrecto' });
  }
  await run('UPDATE verification_codes SET consumed_at = ? WHERE id = ?', nowIso(), row.id);
}

export async function register(input: RegisterInput, meta: { ip?: string }) {
  const email = input.email.toLowerCase();
  const username = input.username.toLowerCase();

  const existingEmail = await get<{ id: string }>('SELECT id FROM users WHERE lower(email) = ?', email);
  if (existingEmail) throw new AppError(409, 'EMAIL_TAKEN', 'Ese correo ya está registrado.', { email: 'Este correo ya tiene cuenta' });
  const existingUsername = await get<{ id: string }>('SELECT id FROM users WHERE lower(username) = ?', username);
  if (existingUsername) {
    throw new AppError(409, 'USERNAME_TAKEN', 'Ese usuario ya está ocupado.', { username: 'Elige otro usuario' });
  }
  assertPasswordNotPersonal(input.password, email, username);

  const hash = await hashPassword(input.password);
  const id = newId('user');
  const initials = input.displayName
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('');
  const timestamp = nowIso();

  await tx(async () => {
    await run(
      `INSERT INTO users (id, email, username, display_name, password_hash, avatar_url, bio, city, country, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'USER', 'ACTIVE', ?, ?)`,
      id,
      email,
      username,
      input.displayName.trim(),
      hash,
      `/api/media/avatar/${encodeURIComponent(username)}.svg?n=${encodeURIComponent(initials)}`,
      '',
      input.city.trim(),
      input.country,
      timestamp,
      timestamp,
    );
    await run(
      'INSERT INTO wallets (user_id, balance_cents, escrow_cents, currency, updated_at) VALUES (?, 0, 0, ?, ?)',
      id,
      env.CURRENCY,
      timestamp,
    );
    await notify({
      userId: id,
      type: 'WELCOME',
      title: 'Bienvenido a CANJEA',
      body: 'Publica lo que ofreces y lo que necesitas. El intercambio empieza con una publicación.',
      link: '/app/publicar',
    });
  });

  // El correo de bienvenida incluye el código de verificación.
  const verification = await createVerificationCode(id, 'EMAIL_VERIFY', email);
  await logAudit({ actorId: id, action: 'auth.register', entity: 'user', entityId: id, ip: meta.ip });

  const payload = await authPayload(id);
  const refreshToken = await createRefreshToken(id, { ip: meta.ip });
  return {
    ...payload,
    refreshToken,
    requiresEmailVerification: true,
    verification: env.isDev ? { devCode: verification.code, expiresAt: verification.expiresAt } : undefined,
  };
}

export async function login(input: LoginInput, meta: { ip?: string; userAgent?: string }) {
  const identifier = input.identifier.trim().toLowerCase();
  assertNotLocked(identifier);

  const row = await get<UserRow>('SELECT * FROM users WHERE lower(email) = ? OR lower(username) = ?', identifier, identifier);
  if (!row) {
    registerFailure(identifier);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
  }
  if (row.status === 'SUSPENDED') {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Tu cuenta está suspendida. Contacta a soporte.');
  }

  const valid = await verifyPassword(input.password, row.password_hash);
  if (!valid) {
    registerFailure(identifier);
    await logAudit({ actorId: row.id, action: 'auth.login_failed', entity: 'user', entityId: row.id, ip: meta.ip });
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
  }
  clearLoginAttempts(identifier);
  const refreshToken = await createRefreshToken(row.id, { ip: meta.ip, userAgent: meta.userAgent });
  await logAudit({ actorId: row.id, action: 'auth.login', entity: 'user', entityId: row.id, ip: meta.ip });
  return { ...(await authPayload(row.id)), refreshToken };
}

export async function refreshSession(rawToken: string, meta: { ip?: string; userAgent?: string }) {
  const stored = await get<{ user_id: string; expires_at: string; revoked_at: string | null }>(
    'SELECT user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ?',
    hashToken(rawToken),
  );
  if (!stored || stored.revoked_at || new Date(stored.expires_at).getTime() < Date.now()) {
    throw AppError.unauthorized('Sesión expirada. Vuelve a entrar.');
  }
  const row = await get<UserRow>('SELECT * FROM users WHERE id = ?', stored.user_id);
  if (!row || row.status !== 'ACTIVE') throw AppError.unauthorized('Cuenta no disponible.');

  await run('UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ?', nowIso(), hashToken(rawToken));
  const refreshToken = await createRefreshToken(row.id, meta);
  return { ...(await authPayload(row.id)), refreshToken };
}

export async function logout(rawToken: string | undefined, userId?: string) {
  if (rawToken) await revokeRefreshToken(rawToken);
  if (userId) await logAudit({ actorId: userId, action: 'auth.logout', entity: 'user', entityId: userId });
  return { loggedOut: true };
}

export async function verifyEmail(userId: string, code: string) {
  const row = await userRow(userId);
  if (row.email_verified_at) return { alreadyVerified: true, ...(await authPayload(userId)) };

  await consumeCode(userId, 'EMAIL_VERIFY', code);
  await run('UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?', nowIso(), nowIso(), userId);
  await notify({
    userId,
    type: 'EMAIL_VERIFIED',
    title: 'Correo verificado',
    body: 'Ya puedes publicar, negociar y retirar fondos.',
    link: '/app',
  });
  await logAudit({ actorId: userId, action: 'auth.email_verified', entity: 'user', entityId: userId });
  return { verified: true, ...(await authPayload(userId)) };
}

export async function resendCode(userId: string, purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET') {
  const row = await userRow(userId);
  if (purpose === 'EMAIL_VERIFY' && row.email_verified_at) {
    throw AppError.badRequest('Tu correo ya está verificado.');
  }
  const verification = await createVerificationCode(userId, purpose, row.email);
  return {
    sent: true,
    expiresAt: verification.expiresAt,
    ...(env.isDev ? { devCode: verification.code } : {}),
  };
}

export async function forgotPassword(email: string, meta: { ip?: string }) {
  const row = await get<UserRow>('SELECT * FROM users WHERE lower(email) = ?', email.toLowerCase());
  if (!row || row.status !== 'ACTIVE') {
    // Respuesta genérica para no filtrar qué correos existen.
    return { sent: true, expiresAt: null as string | null };
  }
  const verification = await createVerificationCode(row.id, 'PASSWORD_RESET', row.email);
  await logAudit({ actorId: row.id, action: 'auth.password_reset_requested', entity: 'user', entityId: row.id, ip: meta.ip });
  return {
    sent: true,
    expiresAt: verification.expiresAt,
    ...(env.isDev ? { devCode: verification.code } : {}),
  };
}

export async function resetPassword(email: string, code: string, password: string) {
  const row = await get<UserRow>('SELECT * FROM users WHERE lower(email) = ?', email.toLowerCase());
  if (!row) throw AppError.badRequest('No pudimos validar el código.');
  assertPasswordNotPersonal(password, row.email, row.username);
  await consumeCode(row.id, 'PASSWORD_RESET', code);

  const hash = await hashPassword(password);
  await run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', hash, nowIso(), row.id);
  await revokeAllUserTokens(row.id);
  await notify({
    userId: row.id,
    type: 'SECURITY',
    title: 'Contraseña actualizada',
    body: 'Si no fuiste tú, contacta a soporte de inmediato.',
    link: '/app/perfil',
  });
  await logAudit({ actorId: row.id, action: 'auth.password_reset', entity: 'user', entityId: row.id });
  return { reset: true };
}

export async function verifyCurrentPassword(userId: string, password: string) {
  const row = await userRow(userId);
  const valid = await verifyPassword(password, row.password_hash);
  return { valid };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const row = await userRow(userId);
  const valid = await verifyPassword(currentPassword, row.password_hash);
  if (!valid) throw new AppError(401, 'INVALID_PASSWORD', 'La contraseña actual no es correcta.', { currentPassword: 'Contraseña incorrecta' });
  if (currentPassword === newPassword) throw AppError.unprocessable('La nueva contraseña debe ser distinta.', { newPassword: 'Usa una contraseña diferente' });
  assertPasswordNotPersonal(newPassword, row.email, row.username);
  const hash = await hashPassword(newPassword);
  await run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', hash, nowIso(), userId);
  await revokeAllUserTokens(userId);
  await notify({
    userId,
    type: 'SECURITY',
    title: 'Contraseña cambiada',
    body: 'Cerramos tus otras sesiones por seguridad.',
    link: '/app/perfil',
  });
  await logAudit({ actorId: userId, action: 'auth.password_changed', entity: 'user', entityId: userId });
  return { changed: true, sessionsRevoked: true };
}

export function passwordHealth(password: string): number {
  let score = 0;
  if (password.length >= 10) score += 1;
  if (password.length >= 14) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}

export { addDays, revokeAllUserTokens };
