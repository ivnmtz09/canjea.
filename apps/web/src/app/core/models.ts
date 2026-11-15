export type Role = 'USER' | 'MODERATOR' | 'ADMIN';

export type Permission =
  | 'listing:create'
  | 'listing:update:own'
  | 'listing:moderate'
  | 'listing:favorite'
  | 'deal:create'
  | 'deal:respond:own'
  | 'deal:moderate'
  | 'review:create'
  | 'wallet:read:own'
  | 'wallet:topup'
  | 'wallet:withdraw'
  | 'profile:update:own'
  | 'user:read'
  | 'user:suspend'
  | 'user:manage'
  | 'role:manage'
  | 'stats:read'
  | 'audit:read'
  | 'notification:read';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  city: string;
  country: string;
  role: Role;
  emailVerified: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  email?: string;
  status?: string;
}

export interface AuthUser extends User {
  permissions: Permission[];
  unreadNotifications: number;
}

export interface WalletSummary {
  balanceCents: number;
  escrowCents: number;
  currency: string;
}

export interface SessionResponse {
  user: AuthUser;
  permissions: Permission[];
  accessToken: string;
  wallet?: WalletSummary;
  requiresEmailVerification?: boolean;
  verification?: { devCode: string; expiresAt: string };
  refreshToken?: string;
}

export type ListingKind = 'OFFER' | 'NEED';
export type Modality = 'BARTER' | 'CASH' | 'BOTH';
export type ListingCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'SERVICE';
export type ListingStatus = 'ACTIVE' | 'PAUSED' | 'MATCHED' | 'ARCHIVED' | 'REMOVED';

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  blurb: string;
  listingsCount: number;
}

export interface Listing {
  id: string;
  kind: ListingKind;
  title: string;
  description: string;
  category: { id: string; slug: string; name: string; icon: string } | null;
  condition: ListingCondition;
  modality: Modality;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  tags: string[];
  location: string;
  status: ListingStatus;
  views: number;
  favoritesCount: number;
  isFavorite: boolean;
  owner: User | null;
  createdAt: string;
  updatedAt: string;
  related?: Listing[];
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export interface Deal {
  id: string;
  status: DealStatus;
  message: string;
  cashCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  counterpart: User | null;
  role: 'INCOMING' | 'OUTGOING';
  listing: { id: string; title: string; imageUrl: string | null; kind: string } | null;
  offerListing: { id: string; title: string; imageUrl: string | null } | null;
  flags?: {
    canRespond: boolean;
    canComplete: boolean;
    canCancel: boolean;
    canReview: boolean;
    isOwner: boolean;
  };
}

export type DealStatus = 'PROPOSED' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'DISPUTED';

export interface Transaction {
  id: string;
  dealId: string | null;
  type: string;
  amountCents: number;
  status: string;
  description: string;
  createdAt: string;
}

export interface Wallet extends WalletSummary {
  inflowCents: number;
  outflowCents: number;
  transactions: Transaction[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string | null };
}

export interface ProfileResponse {
  user: User;
  listings: Listing[];
  reviews: Review[];
  stats: {
    activeListings: number;
    completedDeals: number;
    memberSince: string;
    responseTime: string;
  };
  isSelf: boolean;
}

export interface AdminUser extends User {
  listingsCount: number;
  dealsCount: number;
  balanceCents: number;
  escrowCents: number;
}

export interface AdminStats {
  totals: {
    users: number;
    verifiedUsers: number;
    listings: number;
    activeListings: number;
    deals: number;
    completedDeals: number;
    gmvCents: number;
    feesCents: number;
  };
  byCategory: { name: string; count: number }[];
  byStatus: Record<string, number>;
  recentUsers: { id: string; username: string; displayName: string; role: Role; createdAt: string }[];
  platform: { feeBps: number; currency: string; environment: string };
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  meta: string;
  ip: string | null;
  createdAt: string;
  actor: { username: string; displayName: string } | null;
}
