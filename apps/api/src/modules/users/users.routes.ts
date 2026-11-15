import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../lib/http.js';
import { authenticate, optionalAuth, requirePermission } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rate-limit.js';
import { roleSchema, statusSchema, updateProfileSchema, usersQuerySchema, usernameParam } from './users.schemas.js';
import * as users from './users.service.js';

export const usersRouter = Router();

usersRouter.patch(
  '/me',
  authenticate,
  writeLimiter,
  requirePermission('profile:update:own'),
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    res.json(await users.updateProfile(req.user!.id, req.valid.body));
  }),
);

usersRouter.get(
  '/me/favorites',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ items: await users.favoriteListings(req.user!.id) });
  }),
);

usersRouter.get(
  '/me/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await users.userStats(req.user!.id));
  }),
);

usersRouter.get(
  '/',
  authenticate,
  requirePermission('user:read'),
  validate({ query: usersQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await users.listUsers(req.valid.query));
  }),
);

usersRouter.patch(
  '/:id/role',
  authenticate,
  requirePermission('role:manage'),
  validate({ params: z.object({ id: z.string().min(4).max(40) }), body: roleSchema }),
  asyncHandler(async (req, res) => {
    res.json(await users.setRole(req.user!, req.valid.params.id, req.valid.body.role));
  }),
);

usersRouter.patch(
  '/:id/status',
  authenticate,
  requirePermission('user:suspend'),
  validate({ params: z.object({ id: z.string().min(4).max(40) }), body: statusSchema }),
  asyncHandler(async (req, res) => {
    res.json(await users.setStatus(req.user!, req.valid.params.id, req.valid.body.status, req.valid.body.reason));
  }),
);

usersRouter.get(
  '/:username',
  optionalAuth,
  validate({ params: usernameParam }),
  asyncHandler(async (req, res) => {
    res.json(await users.getProfile(req.valid.params.username, req.user));
  }),
);
