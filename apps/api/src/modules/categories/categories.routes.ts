import { Router } from 'express';
import { all, count } from '../../lib/db.js';
import { asyncHandler } from '../../lib/http.js';

export const categoriesRouter = Router();

categoriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await all<{ id: string; slug: string; name: string; icon: string; blurb: string }>(
      `SELECT c.id, c.slug, c.name, c.icon, c.blurb,
              (SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id AND l.status = 'ACTIVE') AS listings_count
       FROM categories c ORDER BY c.sort ASC, c.name ASC`,
    );
    res.json({
      items: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        icon: row.icon,
        blurb: row.blurb,
        listingsCount: Number((row as unknown as { listings_count: number }).listings_count ?? 0),
      })),
      total: await count("SELECT COUNT(*) AS n FROM listings WHERE status = 'ACTIVE'"),
    });
  }),
);
