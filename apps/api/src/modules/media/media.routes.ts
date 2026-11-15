import { Router } from 'express';
import { artSvg, avatarSvg, customAvatarSvg } from '../../lib/media.js';

export const mediaRouter = Router();

mediaRouter.get('/art/:seed', (req, res) => {
  const seed = String(req.params.seed ?? 'canjea').replace(/\.svg$/i, '').slice(0, 80);
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(artSvg(seed || 'canjea'));
});

mediaRouter.get('/avatar/custom.svg', (req, res) => {
  const bg = /^#[0-9A-Fa-f]{6}$/.test(String(req.query.bg ?? '')) ? String(req.query.bg) : '#0B0A10';
  const accent = /^#[0-9A-Fa-f]{6}$/.test(String(req.query.accent ?? '')) ? String(req.query.accent) : '#C9FF3D';
  const shape = ['circle', 'diamond', 'triangle', 'hexagon', 'star'].includes(String(req.query.shape ?? ''))
    ? String(req.query.shape)
    : 'circle';
  const letters = String(req.query.n ?? 'C').replace(/[^A-Za-z\u00C0-\u024F]/g, '').slice(0, 2).toUpperCase() || 'C';
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(customAvatarSvg(bg, accent, shape, letters));
});

mediaRouter.get('/avatar/:seed', (req, res) => {
  const seed = String(req.params.seed ?? 'canjea').replace(/\.svg$/i, '').slice(0, 80);
  const initials = String(req.query.n ?? seed.slice(0, 2)).slice(0, 2);
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(avatarSvg(seed || 'canjea', initials));
});
