import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { get } from '../lib/db.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { can, permissionsFor, type Permission, type Role } from '../lib/rbac.js';
import { AppError } from '../lib/errors.js';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  permissions: readonly Permission[];
  avatarUrl: string | null;
}

interface UserRow {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  email_verified_at: string | null;
  token_version: number;
  avatar_url: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      authKind?: 'access';
    }
  }
}

export async function loadUserFromRequest(req: Request): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const payload = verifyAccessToken(header.slice(7).trim());
  if (!payload?.sub) return null;

  const row = await get<UserRow>(
    `SELECT id, email, username, display_name, role, status, email_verified_at, token_version, avatar_url
     FROM users WHERE id = ?`,
    payload.sub,
  );
  if (!row || row.status !== 'ACTIVE') return null;
  if (Number(payload.tv) !== Number(row.token_version)) return null;

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    emailVerified: Boolean(row.email_verified_at),
    permissions: permissionsFor(row.role),
    avatarUrl: row.avatar_url,
  };
}

export const authenticate: RequestHandler = (req, _res, next) => {
  loadUserFromRequest(req)
    .then((user) => {
      if (!user) {
        next(AppError.unauthorized('Tu sesión expiró o no es válida.'));
        return;
      }
      req.user = user;
      next();
    })
    .catch(next);
};

export const optionalAuth: RequestHandler = (req, _res, next) => {
  loadUserFromRequest(req)
    .then((user) => {
      if (user) req.user = user;
      next();
    })
    .catch(next);
};

export function requireVerified(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(AppError.unauthorized());
  if (!req.user.emailVerified) {
    return next(
      new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verifica tu correo para publicar, negociar y retirar fondos.', {
        action: 'VERIFY_EMAIL',
      }),
    );
  }
  next();
}

export function requirePermission(...permissions: Permission[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    const missing = permissions.filter((permission) => !can(req.user!.role, permission));
    if (missing.length > 0) {
      return next(AppError.forbidden(`Tu rol (${req.user.role}) no incluye: ${missing.join(', ')}.`));
    }
    next();
  };
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden('Acción reservada a otro rol.'));
    next();
  };
}
