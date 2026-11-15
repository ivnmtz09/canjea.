import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { asyncHandler, validate } from '../../lib/http.js';
import { get } from '../../lib/db.js';
import { authLimiter, writeLimiter } from '../../middleware/rate-limit.js';
import { authenticate } from '../../middleware/auth.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendCodeSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyPasswordSchema,
} from './auth.schemas.js';
import * as auth from './auth.service.js';

const REFRESH_COOKIE = 'canjea_rt';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  };
}

function setRefreshCookie(res: import('express').Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, cookieOptions());
}

function clearRefreshCookie(res: import('express').Response) {
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
}

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const result = await auth.register(req.valid.body, { ip: req.ip });
    const { refreshToken, ...payload } = result;
    setRefreshCookie(res, refreshToken);
    res.status(201).json(payload);
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const result = await auth.login(req.valid.body, { ip: req.ip, userAgent: req.headers['user-agent'] });
    const { refreshToken, ...payload } = result;
    setRefreshCookie(res, refreshToken);
    res.json(payload);
  }),
);

authRouter.post(
  '/refresh',
  authLimiter,
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      res.status(401).json({ error: { code: 'NO_SESSION', message: 'No hay sesión activa.' } });
      return;
    }
    try {
      const result = await auth.refreshSession(token, { ip: req.ip, userAgent: req.headers['user-agent'] });
      const { refreshToken, ...payload } = result;
      setRefreshCookie(res, refreshToken);
      res.json(payload);
    } catch (error) {
      clearRefreshCookie(res);
      throw error;
    }
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await auth.logout(req.cookies?.[REFRESH_COOKIE], req.user?.id);
    clearRefreshCookie(res);
    res.json({ loggedOut: true });
  }),
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await auth.getMe(req.user!.id));
  }),
);

authRouter.post(
  '/verify-email',
  authenticate,
  authLimiter,
  validate({ body: verifyEmailSchema }),
  asyncHandler(async (req, res) => {
    res.json(await auth.verifyEmail(req.user!.id, req.valid.body.code));
  }),
);

authRouter.post(
  '/resend-code',
  authenticate,
  authLimiter,
  validate({ body: resendCodeSchema }),
  asyncHandler(async (req, res) => {
    res.json(await auth.resendCode(req.user!.id, req.valid.body.purpose));
  }),
);

authRouter.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(async (req, res) => {
    res.json(await auth.forgotPassword(req.valid.body.email, { ip: req.ip }));
  }),
);

authRouter.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(async (req, res) => {
    const result = await auth.resetPassword(req.valid.body.email, req.valid.body.code, req.valid.body.password);
    clearRefreshCookie(res);
    res.json(result);
  }),
);

authRouter.post(
  '/verify-password',
  authenticate,
  authLimiter,
  validate({ body: verifyPasswordSchema }),
  asyncHandler(async (req, res) => {
    res.json(await auth.verifyCurrentPassword(req.user!.id, req.valid.body.password));
  }),
);

authRouter.post(
  '/change-password',
  authenticate,
  writeLimiter,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    const result = await auth.changePassword(req.user!.id, req.valid.body.currentPassword, req.valid.body.newPassword);
    clearRefreshCookie(res);
    res.json(result);
  }),
);

authRouter.get(
  '/check-username',
  authLimiter,
  validate({ query: z.object({ username: z.string().min(3).max(30) }) }),
  asyncHandler(async (req, res) => {
    const username = String(req.valid.query.username).toLowerCase();
    const exists = Boolean(await get('SELECT 1 FROM users WHERE lower(username) = ?', username));
    res.json({ username, available: !exists });
  }),
);
