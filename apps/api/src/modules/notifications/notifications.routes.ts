import { Router } from 'express';
import { z } from 'zod';
import { all, get, run } from '../../lib/db.js';
import { asyncHandler, validate } from '../../lib/http.js';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../lib/errors.js';
import { nowIso } from '../../lib/ids.js';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get(
  '/',
  validate({ query: z.object({ unread: z.enum(['true', 'false']).optional() }) }),
  asyncHandler(async (req, res) => {
    const unreadOnly = req.valid.query.unread === 'true';
    const rows = await all(
      `SELECT id, type, title, body, link, read_at, created_at FROM notifications
       WHERE user_id = ? ${unreadOnly ? 'AND read_at IS NULL' : ''}
       ORDER BY created_at DESC LIMIT 50`,
      req.user!.id,
    );
    const items = rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link,
      readAt: row.read_at,
      createdAt: row.created_at,
    }));
    res.json({ items, unread: items.filter((item) => !item.readAt).length });
  }),
);

notificationsRouter.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    await run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', nowIso(), req.user!.id);
    res.json({ read: true });
  }),
);

notificationsRouter.patch(
  '/:id/read',
  validate({ params: z.object({ id: z.string().min(4).max(40) }) }),
  asyncHandler(async (req, res) => {
    const notification = await get(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      req.valid.params.id,
      req.user!.id,
    );
    if (!notification) throw AppError.notFound('Notificación no encontrada');
    await run('UPDATE notifications SET read_at = ? WHERE id = ?', nowIso(), req.valid.params.id);
    res.json({ read: true });
  }),
);
