import { Router } from 'express';
import { artSvg, avatarSvg, customAvatarSvg } from '../../lib/media.js';
import { renderCharacterSvg } from '../../lib/character-avatar.js';

export const mediaRouter = Router();

mediaRouter.get('/art/:seed', (req, res) => {
  const seed = String(req.params.seed ?? 'canjea').replace(/\.svg$/i, '').slice(0, 80);
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(artSvg(seed || 'canjea'));
});

mediaRouter.get('/avatar/character.svg', (req, res) => {
  const skin = String(req.query.skin ?? 'medium');
  const hairStyle = String(req.query.hair ?? 'short');
  const hairColor = String(req.query.hairColor ?? 'black');
  const eyeType = String(req.query.eyes ?? 'normal');
  const eyeColor = String(req.query.eyeColor ?? '#4A3222');
  const expression = String(req.query.mouth ?? 'smile');
  const accessory = String(req.query.acc ?? 'none');
  const clothes = String(req.query.clothes ?? 'tshirt');
  const clothesColor = String(req.query.clothesColor ?? 'lime');
  const bgColor = String(req.query.bg ?? 'deep_night');

  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(
    renderCharacterSvg({
      skin,
      hairStyle,
      hairColor,
      eyeType,
      eyeColor,
      expression,
      accessory,
      clothes,
      clothesColor,
      bgColor,
    }),
  );
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
