import { Router } from 'express';
import { asyncHandler, validate } from '../../lib/http.js';
import { authenticate, requirePermission, requireVerified } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rate-limit.js';
import { topUpSchema, withdrawSchema } from './wallet.schemas.js';
import * as wallet from './wallet.service.js';

export const walletRouter = Router();
walletRouter.use(authenticate);

walletRouter.get(
  '/',
  requirePermission('wallet:read:own'),
  asyncHandler(async (req, res) => {
    res.json(await wallet.getWallet(req.user!.id));
  }),
);

walletRouter.post(
  '/topup',
  writeLimiter,
  requirePermission('wallet:topup'),
  validate({ body: topUpSchema }),
  asyncHandler(async (req, res) => {
    res.json(await wallet.topUp(req.user!.id, req.valid.body.amountCents, req.ip));
  }),
);

walletRouter.post(
  '/withdraw',
  writeLimiter,
  requireVerified,
  requirePermission('wallet:withdraw'),
  validate({ body: withdrawSchema }),
  asyncHandler(async (req, res) => {
    res.json(await wallet.withdraw(req.user!.id, req.valid.body.amountCents, req.ip));
  }),
);
