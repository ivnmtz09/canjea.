-- CANJEA · esquema PostgreSQL
-- Los identificadores son TEXT con prefijo (usr_, lst_, deal_…) y las fechas
-- se guardan como ISO 8601 en TEXT para mantener un contrato estable con el API.

CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL,
  username          TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  password_hash     TEXT NOT NULL,
  avatar_url        TEXT,
  bio               TEXT NOT NULL DEFAULT '',
  city              TEXT NOT NULL DEFAULT '',
  country           TEXT NOT NULL DEFAULT 'MX',
  phone             TEXT,
  role              TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','MODERATOR','ADMIN')),
  status            TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','DELETED')),
  email_verified_at TEXT,
  rating_avg        NUMERIC(3,2) NOT NULL DEFAULT 5.0 CHECK (rating_avg BETWEEN 0 AND 5),
  rating_count      INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  token_version     INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username));

CREATE TABLE IF NOT EXISTS verification_codes (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('EMAIL_VERIFY','PASSWORD_RESET')),
  code_hash   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  user_agent TEXT,
  ip         TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id    TEXT PRIMARY KEY,
  slug  TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL,
  icon  TEXT NOT NULL,
  blurb TEXT NOT NULL DEFAULT '',
  sort  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS listings (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('OFFER','NEED')),
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  category_id  TEXT NOT NULL REFERENCES categories(id),
  condition    TEXT NOT NULL DEFAULT 'SERVICE' CHECK (condition IN ('NEW','LIKE_NEW','GOOD','FAIR','SERVICE')),
  modality     TEXT NOT NULL DEFAULT 'BARTER' CHECK (modality IN ('BARTER','CASH','BOTH')),
  price_cents  INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency     TEXT NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
  image_url    TEXT,
  tags         TEXT NOT NULL DEFAULT '[]',
  location     TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','MATCHED','ARCHIVED','REMOVED')),
  views        INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS deals (
  id               TEXT PRIMARY KEY,
  listing_id       TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  owner_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposer_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message          TEXT NOT NULL DEFAULT '',
  offer_listing_id TEXT REFERENCES listings(id) ON DELETE SET NULL,
  cash_cents       INTEGER NOT NULL DEFAULT 0 CHECK (cash_cents >= 0),
  status           TEXT NOT NULL DEFAULT 'PROPOSED'
                   CHECK (status IN ('PROPOSED','ACCEPTED','COMPLETED','REJECTED','CANCELLED','DISPUTED')),
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  completed_at     TEXT,
  CHECK (owner_id <> proposer_id)
);

CREATE TABLE IF NOT EXISTS wallets (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance_cents INTEGER NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  escrow_cents  INTEGER NOT NULL DEFAULT 0 CHECK (escrow_cents >= 0),
  currency      TEXT NOT NULL DEFAULT 'USD',
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id      TEXT REFERENCES deals(id) ON DELETE SET NULL,
  type         TEXT NOT NULL CHECK (type IN ('TOPUP','ESCROW_HOLD','ESCROW_RELEASE','ESCROW_REFUND','FEE','PAYOUT','BONUS')),
  amount_cents INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'SETTLED' CHECK (status IN ('PENDING','SETTLED','FAILED')),
  description  TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id         TEXT PRIMARY KEY,
  deal_id    TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (deal_id, author_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  link       TEXT,
  read_at    TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         TEXT PRIMARY KEY,
  actor_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  meta       TEXT NOT NULL DEFAULT '{}',
  ip         TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listings_feed ON listings (status, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings (category_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_user ON listings (user_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON deals (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_proposer ON deals (proposer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_codes_user ON verification_codes (user_id, purpose, consumed_at);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens (user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);
