import { all, count, get, parseJson, run } from '../../lib/db.js';
import { AppError } from '../../lib/errors.js';
import { newId, nowIso } from '../../lib/ids.js';
import { can } from '../../lib/rbac.js';
import { LISTING_SELECT, listingDTO, type ListingDTO } from '../../lib/serialize.js';
import { logAudit } from '../../lib/audit.js';
import type { AuthUser } from '../../middleware/auth.js';
import type { CreateListingInput, ListingQueryInput } from './listings.schemas.js';

interface ListingRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  description: string;
  category_id: string;
  condition: string;
  modality: string;
  price_cents: number;
  currency: string;
  image_url: string | null;
  tags: string;
  location: string;
  status: string;
  views: number;
  created_at: string;
  updated_at: string;
}

export async function listListings(query: ListingQueryInput, viewer?: AuthUser) {
  const limit = Math.min(48, Math.max(1, Number(query.limit) || 12));
  const page = Math.max(1, Number(query.page) || 1);
  const offset = (page - 1) * limit;
  const params: unknown[] = [viewer?.id ?? null];
  const conditions: string[] = [];

  const isModerator = viewer && can(viewer.role, 'listing:moderate');
  if (query.status && query.status !== 'ACTIVE') {
    if (!isModerator && !query.owner) throw AppError.forbidden('No puedes filtrar por ese estado.');
    conditions.push('l.status = ?');
    params.push(query.status);
  } else if (query.owner) {
    conditions.push('lower(u.username) = lower(?)');
    params.push(query.owner);
    if (!isModerator && viewer?.username.toLowerCase() !== query.owner.toLowerCase()) {
      conditions.push("l.status = 'ACTIVE'");
    }
  } else {
    conditions.push("l.status = 'ACTIVE'");
  }

  if (query.kind) {
    conditions.push('l.kind = ?');
    params.push(query.kind);
  }
  if (query.category) {
    conditions.push('c.slug = ?');
    params.push(query.category);
  }
  if (query.modality) {
    conditions.push("(l.modality = ? OR l.modality = 'BOTH')");
    params.push(query.modality === 'BARTER' ? 'BARTER' : 'CASH');
  }
  if (query.city) {
    conditions.push('(l.location ILIKE ? OR u.city ILIKE ?)');
    params.push(`%${query.city}%`, `%${query.city}%`);
  }
  if (query.minPrice !== undefined) {
    conditions.push('l.price_cents >= ?');
    params.push(query.minPrice);
  }
  if (query.maxPrice !== undefined) {
    conditions.push('l.price_cents <= ?');
    params.push(query.maxPrice);
  }
  if (query.q) {
    const term = `%${query.q}%`;
    conditions.push('(l.title ILIKE ? OR l.description ILIKE ? OR l.tags ILIKE ? OR c.name ILIKE ?)');
    params.push(term, term, term, term);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy =
    query.sort === 'popular'
      ? 'l.views DESC, l.created_at DESC'
      : query.sort === 'price_asc'
        ? 'l.price_cents ASC, l.created_at DESC'
        : query.sort === 'price_desc'
          ? 'l.price_cents DESC, l.created_at DESC'
          : 'l.created_at DESC';

  const rows = await all(`${LISTING_SELECT} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, ...params, limit, offset);
  const total = await count(
    `SELECT COUNT(*) AS n FROM listings l
     JOIN categories c ON c.id = l.category_id
     JOIN users u ON u.id = l.user_id
     ${where}`,
    ...params.slice(1),
  );

  return {
    items: rows.map((row) => listingDTO(row)),
    meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getListing(
  id: string,
  viewer?: AuthUser,
  options: { trackView?: boolean } = {},
): Promise<ListingDTO & { related?: ListingDTO[] }> {
  const row = await get(`${LISTING_SELECT} WHERE l.id = ?`, viewer?.id ?? null, id);
  if (!row) throw AppError.notFound('Publicación no encontrada');
  const listing = listingDTO(row);
  const isOwner = viewer?.id === listing.owner?.id;
  if (listing.status !== 'ACTIVE' && !isOwner && !(viewer && can(viewer.role, 'listing:moderate'))) {
    throw AppError.notFound('Publicación no encontrada');
  }

  if (options.trackView !== false && !isOwner) {
    await run('UPDATE listings SET views = views + 1 WHERE id = ?', id);
    listing.views += 1;
  }

  const relatedRows = await all(
    `${LISTING_SELECT} WHERE l.status = 'ACTIVE' AND l.category_id = ? AND l.id <> ? ORDER BY l.created_at DESC LIMIT 3`,
    viewer?.id ?? null,
    listing.category?.id ?? '',
    id,
  );

  return { ...listing, related: relatedRows.map((related) => listingDTO(related)) };
}

export async function createListing(input: CreateListingInput, user: AuthUser): Promise<ListingDTO> {
  const category = await get<{ id: string }>(
    'SELECT id FROM categories WHERE id = ? OR slug = ?',
    input.categoryId,
    input.categoryId,
  );
  if (!category) throw AppError.unprocessable('Categoría inválida.', { categoryId: 'Elige una categoría válida' });

  const id = newId('listing');
  const timestamp = nowIso();
  const imageUrl = input.imageUrl?.trim() || `/api/media/art/${id}.svg`;
  const tags = Array.from(new Set(input.tags.map((tag) => tag.trim()))).slice(0, 5);

  await run(
    `INSERT INTO listings
      (id, user_id, kind, title, description, category_id, condition, modality, price_cents, currency, image_url, tags, location, status, views, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 0, ?, ?)`,
    id,
    user.id,
    input.kind,
    input.title.trim(),
    input.description.trim(),
    category.id,
    input.condition,
    input.modality,
    input.priceCents,
    input.currency,
    imageUrl,
    JSON.stringify(tags),
    input.location.trim(),
    timestamp,
    timestamp,
  );

  await logAudit({ actorId: user.id, action: 'listing.create', entity: 'listing', entityId: id, meta: { kind: input.kind } });
  return getListing(id, user, { trackView: false });
}

export async function updateListing(id: string, input: Record<string, unknown>, user: AuthUser): Promise<ListingDTO> {
  const row = await get<ListingRow>('SELECT * FROM listings WHERE id = ?', id);
  if (!row) throw AppError.notFound('Publicación no encontrada');
  const isOwner = row.user_id === user.id;
  const isModerator = can(user.role, 'listing:moderate');
  if (!isOwner && !isModerator) throw AppError.forbidden('Esta publicación no es tuya.');

  if (input.categoryId) {
    const category = await get<{ id: string }>(
      'SELECT id FROM categories WHERE id = ? OR slug = ?',
      input.categoryId,
      input.categoryId,
    );
    if (!category) throw AppError.unprocessable('Categoría inválida.', { categoryId: 'Categoría no existe' });
    input.category_id = category.id;
    delete input.categoryId;
  }

  const modality = (input.modality as string) ?? row.modality;
  const priceCents = input.priceCents !== undefined ? Number(input.priceCents) : Number(row.price_cents);
  if (modality !== 'BARTER' && priceCents < 100) {
    throw AppError.unprocessable('Indica un precio de al menos $1.00 para canje con dinero.', {
      priceCents: 'Precio mínimo de $1.00',
    });
  }

  const mapping: Record<string, string> = {
    title: 'title',
    description: 'description',
    category_id: 'category_id',
    condition: 'condition',
    modality: 'modality',
    priceCents: 'price_cents',
    location: 'location',
    imageUrl: 'image_url',
    tags: 'tags',
  };

  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, column] of Object.entries(mapping)) {
    if (input[key] === undefined) continue;
    let value = input[key];
    if (key === 'tags' && Array.isArray(value)) value = JSON.stringify(Array.from(new Set(value)).slice(0, 5));
    if (key === 'priceCents') value = Number(value);
    if (typeof value === 'string') value = value.trim();
    sets.push(`${column} = ?`);
    values.push(value);
  }
  if (sets.length === 0) return getListing(id, user, { trackView: false });

  sets.push('updated_at = ?');
  values.push(nowIso(), id);
  await run(`UPDATE listings SET ${sets.join(', ')} WHERE id = ?`, ...values);
  await logAudit({
    actorId: user.id,
    action: isOwner ? 'listing.update' : 'listing.moderate_update',
    entity: 'listing',
    entityId: id,
    meta: { fields: Object.keys(input) },
  });
  return getListing(id, user, { trackView: false });
}

export async function setListingStatus(
  id: string,
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'REMOVED',
  user: AuthUser,
  reason?: string,
): Promise<ListingDTO> {
  const row = await get<ListingRow>('SELECT * FROM listings WHERE id = ?', id);
  if (!row) throw AppError.notFound('Publicación no encontrada');
  const isOwner = row.user_id === user.id;
  if (!isOwner && !can(user.role, 'listing:moderate')) throw AppError.forbidden('Esta publicación no es tuya.');
  if (status === 'REMOVED' && user.role === 'USER') throw AppError.forbidden('Solo moderación puede retirar publicaciones.');

  if (status === 'ACTIVE') {
    const activeDeals = await count(
      "SELECT COUNT(*) AS n FROM deals WHERE listing_id = ? AND status IN ('PROPOSED','ACCEPTED')",
      id,
    );
    if (activeDeals > 0) throw AppError.conflict('Tienes negociaciones abiertas para esta publicación.');
  }

  await run('UPDATE listings SET status = ?, updated_at = ? WHERE id = ?', status, nowIso(), id);
  await logAudit({
    actorId: user.id,
    action: isOwner ? 'listing.status' : 'listing.moderate',
    entity: 'listing',
    entityId: id,
    meta: { status, reason: reason ?? null },
  });
  return getListing(id, user, { trackView: false });
}

export async function removeListing(id: string, user: AuthUser): Promise<{ removed: boolean; status: string }> {
  const row = await get<ListingRow>('SELECT * FROM listings WHERE id = ?', id);
  if (!row) throw AppError.notFound('Publicación no encontrada');
  const isOwner = row.user_id === user.id;
  if (!isOwner && !can(user.role, 'listing:moderate')) throw AppError.forbidden('Esta publicación no es tuya.');
  const status = isOwner ? 'ARCHIVED' : 'REMOVED';
  await run('UPDATE listings SET status = ?, updated_at = ? WHERE id = ?', status, nowIso(), id);
  await logAudit({
    actorId: user.id,
    action: isOwner ? 'listing.archive' : 'listing.remove',
    entity: 'listing',
    entityId: id,
  });
  return { removed: true, status };
}

export async function toggleFavorite(listingId: string, userId: string) {
  const listing = await get<ListingRow>('SELECT id FROM listings WHERE id = ?', listingId);
  if (!listing) throw AppError.notFound('Publicación no encontrada');
  const existing = await get('SELECT 1 FROM favorites WHERE user_id = ? AND listing_id = ?', userId, listingId);
  if (existing) {
    await run('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?', userId, listingId);
  } else {
    await run('INSERT INTO favorites (user_id, listing_id, created_at) VALUES (?, ?, ?)', userId, listingId, nowIso());
  }
  const favorites = await count('SELECT COUNT(*) AS n FROM favorites WHERE listing_id = ?', listingId);
  return { favorited: !existing, favoritesCount: favorites };
}

export async function myListings(user: AuthUser) {
  const rows = await all(`${LISTING_SELECT} WHERE l.user_id = ? ORDER BY l.created_at DESC LIMIT 60`, user.id, user.id);
  return rows.map((row) => listingDTO(row));
}

export async function listingTags(id: string): Promise<string[]> {
  const row = await get<{ tags: string }>('SELECT tags FROM listings WHERE id = ?', id);
  return parseJson<string[]>(row?.tags, []);
}
