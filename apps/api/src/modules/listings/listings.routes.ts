import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../lib/http.js';
import { authenticate, optionalAuth, requirePermission } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rate-limit.js';
import { createListingSchema, listingQuerySchema, listingStatusSchema, updateListingSchema } from './listings.schemas.js';
import * as listings from './listings.service.js';

const idParam = z.object({ id: z.string().min(4).max(40) });

export const listingsRouter = Router();

listingsRouter.get(
  '/',
  optionalAuth,
  validate({ query: listingQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await listings.listListings(req.valid.query, req.user));
  }),
);

listingsRouter.get(
  '/mine',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ items: await listings.myListings(req.user!) });
  }),
);

listingsRouter.get(
  '/:id',
  optionalAuth,
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await listings.getListing(req.valid.params.id, req.user));
  }),
);

listingsRouter.post(
  '/',
  authenticate,
  requirePermission('listing:create'),
  validate({ body: createListingSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await listings.createListing(req.valid.body, req.user!));
  }),
);

listingsRouter.patch(
  '/:id',
  authenticate,
  requirePermission('listing:update:own'),
  validate({ params: idParam, body: updateListingSchema }),
  asyncHandler(async (req, res) => {
    res.json(await listings.updateListing(req.valid.params.id, { ...req.valid.body }, req.user!));
  }),
);

listingsRouter.patch(
  '/:id/status',
  authenticate,
  requirePermission('listing:update:own'),
  validate({ params: idParam, body: listingStatusSchema }),
  asyncHandler(async (req, res) => {
    res.json(await listings.setListingStatus(req.valid.params.id, req.valid.body.status, req.user!, req.valid.body.reason));
  }),
);

listingsRouter.delete(
  '/:id',
  authenticate,
  requirePermission('listing:update:own'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await listings.removeListing(req.valid.params.id, req.user!));
  }),
);

listingsRouter.post(
  '/:id/favorite',
  authenticate,
  writeLimiter,
  requirePermission('listing:favorite'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await listings.toggleFavorite(req.valid.params.id, req.user!.id));
  }),
);
