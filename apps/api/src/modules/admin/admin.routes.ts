import { Router } from 'express';
import { all, get } from '../../lib/db.js';
import { asyncHandler, pageParams, validate } from '../../lib/http.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { z } from 'zod';
import { env } from '../../config/env.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requirePermission('stats:read'));

adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const totals = await get<{
      users: number;
      active_users: number;
      listings: number;
      active_listings: number;
      deals: number;
      completed_deals: number;
      gmv: number;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE') AS users,
        (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE' AND email_verified_at IS NOT NULL) AS active_users,
        (SELECT COUNT(*) FROM listings) AS listings,
        (SELECT COUNT(*) FROM listings WHERE status = 'ACTIVE') AS active_listings,
        (SELECT COUNT(*) FROM deals) AS deals,
        (SELECT COUNT(*) FROM deals WHERE status = 'COMPLETED') AS completed_deals,
        (SELECT COALESCE(SUM(cash_cents), 0) FROM deals WHERE status = 'COMPLETED') AS gmv`,
    );

    const byCategory = await all<{ name: string; n: number }>(
      `SELECT c.name, COUNT(l.id) AS n FROM categories c
       LEFT JOIN listings l ON l.category_id = c.id AND l.status = 'ACTIVE'
       GROUP BY c.id ORDER BY n DESC`,
    );
    const byStatus = await all<{ status: string; n: number }>('SELECT status, COUNT(*) AS n FROM deals GROUP BY status');
    const recentUsers = await all<{ id: string; username: string; display_name: string; role: string; created_at: string }>(
      'SELECT id, username, display_name, role, created_at FROM users ORDER BY created_at DESC LIMIT 6',
    );
    const fees = await get<{ n: number }>(
      "SELECT COALESCE(SUM(-amount_cents), 0) AS n FROM transactions WHERE type = 'FEE' AND status = 'SETTLED'",
    );
    const gmv = Number(totals?.gmv ?? 0);

    res.json({
      totals: {
        users: Number(totals?.users ?? 0),
        verifiedUsers: Number(totals?.active_users ?? 0),
        listings: Number(totals?.listings ?? 0),
        activeListings: Number(totals?.active_listings ?? 0),
        deals: Number(totals?.deals ?? 0),
        completedDeals: Number(totals?.completed_deals ?? 0),
        gmvCents: gmv,
        feesCents: Number(fees?.n ?? 0),
      },
      byCategory: byCategory.map((row) => ({ name: row.name, count: Number(row.n) })),
      byStatus: Object.fromEntries(byStatus.map((row) => [row.status, Number(row.n)])),
      recentUsers: recentUsers.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        createdAt: user.created_at,
      })),
      platform: {
        feeBps: env.PLATFORM_FEE_BPS,
        currency: env.CURRENCY,
        environment: env.NODE_ENV,
      },
    });
  }),
);

adminRouter.get(
  '/audit',
  requirePermission('audit:read'),
  validate({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(30),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = pageParams(req.valid.query);
    const rows = await all<{
      id: string;
      action: string;
      entity: string;
      entity_id: string | null;
      meta: string;
      ip: string | null;
      created_at: string;
      actor_username: string | null;
      actor_name: string | null;
    }>(
      `SELECT a.id, a.action, a.entity, a.entity_id, a.meta, a.ip, a.created_at,
              u.username AS actor_username, u.display_name AS actor_name
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
      limit,
      offset,
    );
    const items = rows.map((row) => ({
      id: row.id,
      action: row.action,
      entity: row.entity,
      entityId: row.entity_id,
      meta: row.meta,
      ip: row.ip,
      createdAt: row.created_at,
      actor: row.actor_username ? { username: row.actor_username, displayName: row.actor_name } : null,
    }));
    const total = await get<{ n: number }>('SELECT COUNT(*) AS n FROM audit_logs');
    res.json({ items, meta: { page, limit, total: Number(total?.n ?? 0) } });
  }),
);
