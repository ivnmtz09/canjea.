import { Router } from 'express';
import { artSvg, avatarSvg } from '../../lib/media.js';

export const mediaRouter = Router();

mediaRouter.get('/art/:seed', (req, res) => {
  const seed = String(req.params.seed ?? 'canjea').replace(/\.svg$/i, '').slice(0, 80);
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(artSvg(seed || 'canjea'));
});

mediaRouter.get('/avatar/:seed', (req, res) => {
  const seed = String(req.params.seed ?? 'canjea').replace(/\.svg$/i, '').slice(0, 80);
  const initials = String(req.query.n ?? seed.slice(0, 2)).slice(0, 2);
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(avatarSvg(seed || 'canjea', initials));
});
