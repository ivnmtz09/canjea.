import type { Row } from '../lib/db.js';
import { parseJson } from '../lib/db.js';
import type { Role } from '../lib/rbac.js';

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  city: string;
  country: string;
  role: Role;
  status?: string;
  email?: string;
  emailVerified: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
}

export function publicUser(row: Row, options: { includePrivate?: boolean } = {}): PublicUser {
  const user: PublicUser = {
    id: String(row.id),
    username: String(row.username),
    displayName: String(row.display_name),
    avatarUrl: (row.avatar_url as string | null) ?? null,
    bio: String(row.bio ?? ''),
    city: String(row.city ?? ''),
    country: String(row.country ?? 'MX'),
    role: row.role as Role,
    emailVerified: Boolean(row.email_verified_at),
    ratingAvg: Number(row.rating_avg ?? 5),
    ratingCount: Number(row.rating_count ?? 0),
    createdAt: String(row.created_at),
  };
  if (options.includePrivate) {
    user.email = String(row.email);
    user.status = String(row.status);
  }
  return user;
}

export function userRef(row: Row, prefix = 'u'): PublicUser | null {
  const id = row[`${prefix}_id`];
  if (!id) return null;
  return {
    id: String(id),
    username: String(row[`${prefix}_username`]),
    displayName: String(row[`${prefix}_display_name`]),
    avatarUrl: (row[`${prefix}_avatar_url`] as string | null) ?? null,
    bio: '',
    city: String(row[`${prefix}_city`] ?? ''),
    country: String(row[`${prefix}_country`] ?? 'MX'),
    role: (row[`${prefix}_role`] as Role) ?? 'USER',
    emailVerified: Boolean(row[`${prefix}_email_verified_at`]),
    ratingAvg: Number(row[`${prefix}_rating_avg`] ?? 5),
    ratingCount: Number(row[`${prefix}_rating_count`] ?? 0),
    createdAt: String(row[`${prefix}_created_at`] ?? ''),
  };
}

export interface ListingDTO {
  id: string;
  kind: 'OFFER' | 'NEED';
  title: string;
  description: string;
  category: { id: string; slug: string; name: string; icon: string } | null;
  condition: string;
  modality: 'BARTER' | 'CASH' | 'BOTH';
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  tags: string[];
  location: string;
  status: string;
  views: number;
  favoritesCount: number;
  isFavorite: boolean;
  owner: PublicUser | null;
  createdAt: string;
  updatedAt: string;
}

export function listingDTO(row: Row): ListingDTO {
  return {
    id: String(row.id),
    kind: row.kind as 'OFFER' | 'NEED',
    title: String(row.title),
    description: String(row.description),
    category: row.category_slug
      ? {
          id: String(row.category_id),
          slug: String(row.category_slug),
          name: String(row.category_name),
          icon: String(row.category_icon),
        }
      : null,
    condition: String(row.condition),
    modality: row.modality as ListingDTO['modality'],
    priceCents: Number(row.price_cents ?? 0),
    currency: String(row.currency ?? 'USD'),
    imageUrl: (row.image_url as string | null) ?? null,
    tags: parseJson<string[]>(row.tags, []),
    location: String(row.location ?? ''),
    status: String(row.status),
    views: Number(row.views ?? 0),
    favoritesCount: Number(row.favorites_count ?? 0),
    isFavorite: Boolean(row.is_favorite),
    owner: userRef(row, 'u'),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export const LISTING_SELECT = `
  SELECT l.*,
         c.slug AS category_slug, c.name AS category_name, c.icon AS category_icon,
         u.id AS u_id, u.username AS u_username, u.display_name AS u_display_name,
         u.avatar_url AS u_avatar_url, u.city AS u_city, u.country AS u_country,
         u.role AS u_role, u.email_verified_at AS u_email_verified_at,
         u.rating_avg AS u_rating_avg, u.rating_count AS u_rating_count,
         u.created_at AS u_created_at,
         (SELECT COUNT(*) FROM favorites f WHERE f.listing_id = l.id) AS favorites_count,
         EXISTS(SELECT 1 FROM favorites f2 WHERE f2.listing_id = l.id AND f2.user_id = ?) AS is_favorite
  FROM listings l
  JOIN categories c ON c.id = l.category_id
  JOIN users u ON u.id = l.user_id
`;

export interface DealDTO {
  id: string;
  status: string;
  message: string;
  cashCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  counterpart: PublicUser | null;
  role: 'INCOMING' | 'OUTGOING';
  listing: { id: string; title: string; imageUrl: string | null; kind: string } | null;
  offerListing: { id: string; title: string; imageUrl: string | null } | null;
}

export function dealDTO(row: Row, viewerId: string): DealDTO {
  const isOwner = String(row.owner_id) === viewerId;
  const prefix = isOwner ? 'p' : 'o';
  return {
    id: String(row.id),
    status: String(row.status),
    message: String(row.message ?? ''),
    cashCents: Number(row.cash_cents ?? 0),
    currency: String(row.currency ?? 'USD'),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    completedAt: (row.completed_at as string | null) ?? null,
    counterpart: userRef(row, prefix),
    role: isOwner ? 'INCOMING' : 'OUTGOING',
    listing: row.listing_title
      ? { id: String(row.listing_id), title: String(row.listing_title), imageUrl: (row.listing_image as string | null) ?? null, kind: String(row.listing_kind) }
      : null,
    offerListing: row.offer_title
      ? { id: String(row.offer_listing_id), title: String(row.offer_title), imageUrl: (row.offer_image as string | null) ?? null }
      : null,
  };
}

export const DEAL_SELECT = `
  SELECT d.*,
         l.title AS listing_title, l.image_url AS listing_image, l.kind AS listing_kind, l.currency AS currency,
         ol.title AS offer_title, ol.image_url AS offer_image,
         o.id AS o_id, o.username AS o_username, o.display_name AS o_display_name,
         o.avatar_url AS o_avatar_url, o.city AS o_city, o.country AS o_country,
         o.role AS o_role, o.email_verified_at AS o_email_verified_at,
         o.rating_avg AS o_rating_avg, o.rating_count AS o_rating_count, o.created_at AS o_created_at,
         p.id AS p_id, p.username AS p_username, p.display_name AS p_display_name,
         p.avatar_url AS p_avatar_url, p.city AS p_city, p.country AS p_country,
         p.role AS p_role, p.email_verified_at AS p_email_verified_at,
         p.rating_avg AS p_rating_avg, p.rating_count AS p_rating_count, p.created_at AS p_created_at
  FROM deals d
  JOIN listings l ON l.id = d.listing_id
  LEFT JOIN listings ol ON ol.id = d.offer_listing_id
  JOIN users o ON o.id = d.owner_id
  JOIN users p ON p.id = d.proposer_id
`;
