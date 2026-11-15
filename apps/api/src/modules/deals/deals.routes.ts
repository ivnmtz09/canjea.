import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../lib/http.js';
import { authenticate, requirePermission, requireVerified } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rate-limit.js';
import { cancelDealSchema, createDealSchema, createMessageSchema, dealsQuerySchema, respondDealSchema, reviewSchema } from './deals.schemas.js';
import * as deals from './deals.service.js';

const idParam = z.object({ id: z.string().min(4).max(40) });

export const dealsRouter = Router();
dealsRouter.use(authenticate);

dealsRouter.get(
  '/',
  validate({ query: dealsQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await deals.listDeals(req.user!, req.valid.query));
  }),
);

dealsRouter.post(
  '/',
  writeLimiter,
  requireVerified,
  requirePermission('deal:create'),
  validate({ body: createDealSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await deals.createDeal(req.valid.body, req.user!));
  }),
);

dealsRouter.get(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await deals.getDeal(req.valid.params.id, req.user!));
  }),
);

dealsRouter.get(
  '/:id/messages',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ items: await deals.listDealMessages(req.valid.params.id, req.user!) });
  }),
);

dealsRouter.post(
  '/:id/messages',
  writeLimiter,
  validate({ params: idParam, body: createMessageSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await deals.sendDealMessage(req.valid.params.id, req.valid.body.content, req.user!));
  }),
);

dealsRouter.patch(
  '/:id/respond',
  writeLimiter,
  requirePermission('deal:respond:own'),
  validate({ params: idParam, body: respondDealSchema }),
  asyncHandler(async (req, res) => {
    res.json(await deals.respondToDeal(req.valid.params.id, req.user!, req.valid.body.action));
  }),
);

dealsRouter.patch(
  '/:id/complete',
  writeLimiter,
  requireVerified,
  requirePermission('deal:respond:own'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await deals.completeDeal(req.valid.params.id, req.user!));
  }),
);

dealsRouter.patch(
  '/:id/cancel',
  writeLimiter,
  requirePermission('deal:respond:own'),
  validate({ params: idParam, body: cancelDealSchema }),
  asyncHandler(async (req, res) => {
    res.json(await deals.cancelDeal(req.valid.params.id, req.user!, req.valid.body.reason));
  }),
);

dealsRouter.post(
  '/:id/review',
  writeLimiter,
  requireVerified,
  requirePermission('review:create'),
  validate({ params: idParam, body: reviewSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await deals.reviewDeal(req.valid.params.id, req.user!, req.valid.body.rating, req.valid.body.comment));
  }),
);
