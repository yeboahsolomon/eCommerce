-- =============================================================================
-- GHANAMARKET — Complete PostgreSQL Database Schema
-- Multi-vendor ecommerce platform for Ghana
-- =============================================================================
--
-- DESIGN NOTES:
--   • Primary keys: UUID v4 via gen_random_uuid()
--   • Timestamps: TIMESTAMPTZ (TIMESTAMP WITH TIME ZONE)
--   • Currency: GHS (Ghana Cedis), stored as INTEGER in pesewas to avoid
--     floating-point rounding. 1 GHS = 100 pesewas. Display: pesewas / 100.
--   • PII fields (email, phone, Ghana Card, TIN) are indexed for lookup
--     but should be encrypted at rest in production (pgcrypto / app-level).
--   • Ghana-specific: GhanaPost GPS addresses, Mobile Money (MTN, Telecel,
--     AirtelTigo), Ghana Card, TIN (Taxpayer ID), 16 administrative regions.
-- =============================================================================

-- Required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUM TYPES
-- =============================================================================

CREATE TYPE user_role           AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE account_status      AS ENUM ('active', 'suspended', 'deactivated');
CREATE TYPE address_type        AS ENUM ('home', 'work', 'other');
CREATE TYPE seller_app_status   AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE order_status        AS ENUM (
  'pending', 'payment_pending', 'confirmed', 'processing',
  'partially_shipped', 'shipped', 'out_for_delivery',
  'delivered', 'cancelled', 'refunded', 'failed'
);
CREATE TYPE seller_order_status AS ENUM (
  'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
);
CREATE TYPE payment_method      AS ENUM (
  'momo_mtn',           -- MTN Mobile Money (dominant network ~60% share)
  'momo_telecel',       -- Telecel Cash (formerly Vodafone Cash)
  'momo_airteltigo',    -- AirtelTigo Money
  'card',               -- Visa / Mastercard
  'bank_transfer',
  'cash_on_delivery'
);
CREATE TYPE payment_status      AS ENUM (
  'pending', 'processing', 'success', 'failed',
  'refunded', 'partially_refunded', 'cancelled'
);
CREATE TYPE payout_status       AS ENUM ('pending', 'processing', 'paid', 'failed', 'cancelled');
CREATE TYPE transaction_type    AS ENUM ('sale', 'refund', 'payout', 'commission', 'adjustment');

-- Ghana's mobile money networks
CREATE TYPE momo_network        AS ENUM ('mtn', 'telecel', 'airteltigo');

-- =============================================================================
-- 2. USERS & IDENTITY
-- =============================================================================

-- Core users table — every person on the platform
CREATE TABLE users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,        -- bcrypt hashed, never plain text
  full_name       VARCHAR(200) NOT NULL,
  phone           VARCHAR(20),                  -- Crucial for Mobile Money payments
  avatar_url      TEXT,

  -- Status & Verification
  status          account_status NOT NULL DEFAULT 'active',
  email_verified  BOOLEAN     NOT NULL DEFAULT FALSE,
  phone_verified  BOOLEAN     NOT NULL DEFAULT FALSE,
  last_login_at   TIMESTAMPTZ,

  -- GDPR: timestamps for data retention policies
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$'),
  CONSTRAINT chk_phone_format CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{10,15}$')
);

COMMENT ON TABLE  users IS 'Core user table. Every person on the platform is a user.';
COMMENT ON COLUMN users.phone IS 'Ghana phone number — required for MoMo payments (MTN, Telecel, AirtelTigo). Format: 0241234567 or +233241234567.';
COMMENT ON COLUMN users.password_hash IS 'bcrypt-hashed password. NEVER store plaintext.';

CREATE INDEX idx_users_email       ON users (email);
CREATE INDEX idx_users_phone       ON users (phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_status      ON users (status);
CREATE INDEX idx_users_created_at  ON users (created_at);

-- Role assignments — supports multiple roles per user
CREATE TABLE user_roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        user_role   NOT NULL DEFAULT 'buyer',
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by  UUID        REFERENCES users(id) ON DELETE SET NULL, -- admin who granted

  CONSTRAINT uq_user_role UNIQUE (user_id, role) -- no duplicate role per user
);

COMMENT ON TABLE user_roles IS 'Supports multiple roles per user. A user starts as buyer and can be granted seller/admin.';

CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX idx_user_roles_role    ON user_roles (role);

-- Refresh tokens for JWT rotation
CREATE TABLE refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE, -- hashed, never raw
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_hash    ON refresh_tokens (token_hash);

-- User addresses — Ghana-specific location fields
CREATE TABLE addresses (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label           VARCHAR(50)  NOT NULL,          -- "Home", "Work", "Office"
  type            address_type NOT NULL DEFAULT 'home',
  full_name       VARCHAR(200) NOT NULL,          -- Recipient name
  phone           VARCHAR(20)  NOT NULL,          -- Delivery contact number

  -- Ghana-specific location
  region          VARCHAR(100) NOT NULL,          -- Ghana administrative region (e.g. Bono, Greater Accra)
  city            VARCHAR(100) NOT NULL,
  area            VARCHAR(200),                   -- Neighborhood / suburb
  street_address  TEXT         NOT NULL,          -- Street, house number, landmarks
  gps_address     VARCHAR(20),                    -- GhanaPost GPS (e.g. BA-0042-6789)

  is_default      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN addresses.region      IS 'One of Ghana''s 16 administrative regions: Greater Accra, Ashanti, Bono, Bono East, Ahafo, Western, Western North, Central, Eastern, Volta, Oti, Northern, Savannah, North East, Upper East, Upper West.';
COMMENT ON COLUMN addresses.gps_address IS 'GhanaPost GPS digital address (e.g. BA-0042-6789). Unique identifier for any location in Ghana.';

CREATE INDEX idx_addresses_user_id    ON addresses (user_id);
CREATE INDEX idx_addresses_is_default ON addresses (is_default) WHERE is_default = TRUE;

-- =============================================================================
-- 3. SELLER APPLICATION & PROFILE
-- =============================================================================

-- Seller applications — requires admin approval
CREATE TABLE seller_applications (
  id                  UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Business Information
  store_name          VARCHAR(200)      NOT NULL,
  business_type       VARCHAR(100),                 -- e.g. "Sole Proprietor", "Limited Company"
  business_email      VARCHAR(255),
  business_phone      VARCHAR(20)       NOT NULL,
  business_address    TEXT,

  -- Ghana-specific legal / identity
  tax_id              VARCHAR(50),                  -- GRA Tax Identification Number
  tin_number          VARCHAR(20),                  -- Taxpayer Identification Number (TIN)
  ghana_card_number   VARCHAR(20),                  -- Ghana Card number (GHA-XXXXXXXXX-X)
  identity_documents  JSONB,                        -- Array of { type, url, verified } objects

  -- Bank / MoMo for payouts
  bank_account_info   JSONB,                        -- { bank_name, branch, account_number, account_name }
                                                    -- or { network: 'mtn'|'telecel'|'airteltigo', number, name }

  -- Status
  status              seller_app_status NOT NULL DEFAULT 'pending',
  rejection_reason    TEXT,

  -- Audit
  applied_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID              REFERENCES users(id) ON DELETE SET NULL, -- admin

  CONSTRAINT chk_ghana_card CHECK (ghana_card_number IS NULL OR ghana_card_number ~ '^GHA-[0-9]{9}-[0-9]$')
);

COMMENT ON TABLE  seller_applications IS 'Seller sign-up applications requiring admin review. Once approved, a seller_profile row is created.';
COMMENT ON COLUMN seller_applications.tin_number IS 'Ghana Revenue Authority (GRA) Taxpayer Identification Number. Required for VAT-registered businesses.';
COMMENT ON COLUMN seller_applications.ghana_card_number IS 'National Identification Authority (NIA) Ghana Card number. Format: GHA-XXXXXXXXX-X.';
COMMENT ON COLUMN seller_applications.bank_account_info IS 'JSON object containing either bank details or Mobile Money details for payout settlement.';

CREATE INDEX idx_seller_apps_user_id ON seller_applications (user_id);
CREATE INDEX idx_seller_apps_status  ON seller_applications (status);

-- Seller profiles — created after application approval
CREATE TABLE seller_profiles (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Store Info
  store_name          VARCHAR(200)  NOT NULL,
  store_slug          VARCHAR(200)  NOT NULL UNIQUE,  -- For URL: /shop/my-store
  store_description   TEXT,
  store_logo          TEXT,
  store_banner        TEXT,

  -- Business Contact
  business_email      VARCHAR(255),
  business_phone      VARCHAR(20)   NOT NULL,

  -- Verification & Legal
  is_verified         BOOLEAN       NOT NULL DEFAULT FALSE,
  verified_at         TIMESTAMPTZ,
  tax_id              VARCHAR(50),
  id_card_type        VARCHAR(30),                    -- "Ghana Card", "Passport", "Voter ID"
  id_card_number      VARCHAR(50),
  id_card_image       TEXT,

  -- Platform economics
  commission_rate     DECIMAL(5,2)  NOT NULL DEFAULT 5.00, -- Platform fee %
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,

  -- Aggregated stats (denormalized for dashboard performance)
  total_sales         INTEGER       NOT NULL DEFAULT 0,  -- Lifetime sales count
  rating              DECIMAL(2,1)  NOT NULL DEFAULT 0.0,

  -- Ghana location
  ghana_region        VARCHAR(100),                   -- Primary selling region

  -- Payment details for payouts
  payment_details     JSONB,                          -- MoMo or bank payout info

  -- Social & Contact
  website             TEXT,
  instagram           VARCHAR(200),
  facebook            VARCHAR(200),
  twitter             VARCHAR(200),

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 100),
  CONSTRAINT chk_rating          CHECK (rating >= 0 AND rating <= 5)
);

COMMENT ON TABLE  seller_profiles IS 'Active seller profiles. Created after admin approves a seller_application.';
COMMENT ON COLUMN seller_profiles.commission_rate IS 'Percentage the platform takes from each sale. Default 5%. GHS amount = order_total * (rate / 100).';
COMMENT ON COLUMN seller_profiles.ghana_region IS 'Primary administrative region where the seller operates. Useful for local delivery optimization.';
COMMENT ON COLUMN seller_profiles.payment_details IS 'JSON with MoMo or bank details for automated payouts. E.g. {"type":"momo","network":"mtn","number":"0241234567","name":"Kwame Asante"}';

CREATE INDEX idx_seller_profiles_slug       ON seller_profiles (store_slug);
CREATE INDEX idx_seller_profiles_is_active  ON seller_profiles (is_active);
CREATE INDEX idx_seller_profiles_is_verified ON seller_profiles (is_verified);
CREATE INDEX idx_seller_profiles_region     ON seller_profiles (ghana_region) WHERE ghana_region IS NOT NULL;

-- =============================================================================
-- 4. SELLER FINANCIALS
-- =============================================================================

-- Wallet — tracks balances in pesewas
CREATE TABLE seller_wallets (
  id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id         UUID      NOT NULL UNIQUE REFERENCES seller_profiles(id) ON DELETE CASCADE,
  current_balance   INTEGER   NOT NULL DEFAULT 0,  -- Available for withdrawal (pesewas)
  pending_balance   INTEGER   NOT NULL DEFAULT 0,  -- Held until order completion (pesewas)
  total_earned      INTEGER   NOT NULL DEFAULT 0,  -- Lifetime earnings (pesewas)
  total_withdrawn   INTEGER   NOT NULL DEFAULT 0,  -- Lifetime withdrawals (pesewas)
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_balance_positive CHECK (current_balance >= 0)
);

COMMENT ON COLUMN seller_wallets.current_balance IS 'Available balance in PESEWAS (1 GHS = 100 pesewas). Display: divide by 100.';

-- Wallet transactions audit log
CREATE TABLE wallet_transactions (
  id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       UUID             NOT NULL REFERENCES seller_wallets(id) ON DELETE CASCADE,
  type            transaction_type NOT NULL,
  amount          INTEGER          NOT NULL, -- pesewas, positive or negative
  balance_before  INTEGER          NOT NULL,
  balance_after   INTEGER          NOT NULL,
  description     TEXT,
  reference_id    VARCHAR(100),    -- Links to order_id or payout_id
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_wallet_id  ON wallet_transactions (wallet_id);
CREATE INDEX idx_wallet_tx_type       ON wallet_transactions (type);
CREATE INDEX idx_wallet_tx_created_at ON wallet_transactions (created_at);

-- Seller payouts — withdrawals to MoMo or bank
CREATE TABLE seller_payouts (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id               UUID          NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
  amount_ghs              DECIMAL(12,2) NOT NULL, -- Payout amount in GHS (display-friendly)
  amount_pesewas          INTEGER       NOT NULL, -- Same amount in pesewas (for calculations)
  status                  payout_status NOT NULL DEFAULT 'pending',

  -- Destination snapshot (frozen at time of payout request)
  destination_type        VARCHAR(10)   NOT NULL,  -- 'momo' or 'bank'
  mobile_money_number     VARCHAR(20),              -- MoMo recipient number
  mobile_money_network    momo_network,             -- MTN, Telecel, AirtelTigo
  mobile_money_name       VARCHAR(200),             -- Account holder name
  bank_name               VARCHAR(200),
  bank_account_number     VARCHAR(50),
  bank_account_name       VARCHAR(200),

  -- Transaction tracking
  transaction_ref         VARCHAR(100),              -- External gateway reference (Paystack, Hubtel)
  processed_at            TIMESTAMPTZ,
  notes                   TEXT,

  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_payout_amount CHECK (amount_pesewas > 0),
  CONSTRAINT chk_payout_dest   CHECK (
    (destination_type = 'momo' AND mobile_money_number IS NOT NULL AND mobile_money_network IS NOT NULL) OR
    (destination_type = 'bank' AND bank_name IS NOT NULL AND bank_account_number IS NOT NULL)
  )
);

COMMENT ON TABLE  seller_payouts IS 'Withdrawal requests from sellers. Paid via MTN MoMo, Telecel Cash, AirtelTigo Money, or bank transfer.';
COMMENT ON COLUMN seller_payouts.mobile_money_network IS 'Ghana MoMo network: MTN (~60% market share), Telecel (formerly Vodafone), AirtelTigo.';
COMMENT ON COLUMN seller_payouts.amount_ghs IS 'Display amount in Ghana Cedis (GHS). Same as amount_pesewas / 100.';

CREATE INDEX idx_seller_payouts_seller_id ON seller_payouts (seller_id);
CREATE INDEX idx_seller_payouts_status    ON seller_payouts (status);

-- Seller reviews (from buyers)
CREATE TABLE seller_reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID        NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      SMALLINT    NOT NULL,
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_seller_review_rating CHECK (rating >= 1 AND rating <= 5)
);

CREATE INDEX idx_seller_reviews_seller_id ON seller_reviews (seller_id);

-- =============================================================================
-- 5. CATALOG
-- =============================================================================

-- Hierarchical categories with self-referencing parent
CREATE TABLE categories (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL UNIQUE,
  slug        VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,

  -- Hierarchy: Electronics -> Phones -> Samsung
  parent_id   UUID         REFERENCES categories(id) ON DELETE SET NULL,

  sort_order  INTEGER      NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,

  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_slug      ON categories (slug);
CREATE INDEX idx_categories_parent_id ON categories (parent_id);
CREATE INDEX idx_categories_is_active ON categories (is_active) WHERE is_active = TRUE;

-- Products
CREATE TABLE products (
  id                         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id                  UUID          REFERENCES seller_profiles(id) ON DELETE SET NULL,
  category_id                UUID          NOT NULL REFERENCES categories(id),
  name                       VARCHAR(500)  NOT NULL,
  slug                       VARCHAR(500)  NOT NULL UNIQUE,
  description                TEXT,

  -- PRICING — stored in pesewas to avoid floating-point issues
  -- ₵10.99 = 1099 pesewas
  price_pesewas              INTEGER       NOT NULL,
  compare_at_price_pesewas   INTEGER,                     -- Original price for discount display
  cost_pesewas               INTEGER,                     -- Cost price for profit calculation

  -- Convenience GHS columns (computed / kept in sync for reporting)
  price_ghs                  DECIMAL(12,2) GENERATED ALWAYS AS (price_pesewas / 100.0) STORED,
  compare_at_price_ghs       DECIMAL(12,2) GENERATED ALWAYS AS (compare_at_price_pesewas / 100.0) STORED,

  -- Inventory
  quantity                   INTEGER       NOT NULL DEFAULT 0,
  low_stock_threshold        INTEGER       NOT NULL DEFAULT 5,
  track_inventory            BOOLEAN       NOT NULL DEFAULT TRUE,
  allow_backorder            BOOLEAN       NOT NULL DEFAULT FALSE,

  -- Identification
  sku                        VARCHAR(100)  UNIQUE,
  barcode                    VARCHAR(100),

  -- SEO
  meta_title                 VARCHAR(200),
  meta_description           TEXT,

  -- Status
  is_active                  BOOLEAN       NOT NULL DEFAULT TRUE,
  is_featured                BOOLEAN       NOT NULL DEFAULT FALSE,

  -- Denormalized stats
  views                      INTEGER       NOT NULL DEFAULT 0,
  average_rating             DECIMAL(2,1)  NOT NULL DEFAULT 0.0,
  review_count               INTEGER       NOT NULL DEFAULT 0,

  -- Physical (shipping)
  weight_grams               INTEGER,

  -- Media (primary images stored as JSONB array for simplicity)
  images                     JSONB         DEFAULT '[]'::jsonb,

  created_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_price_positive        CHECK (price_pesewas > 0),
  CONSTRAINT chk_compare_price         CHECK (compare_at_price_pesewas IS NULL OR compare_at_price_pesewas >= price_pesewas),
  CONSTRAINT chk_quantity_non_negative  CHECK (quantity >= 0),
  CONSTRAINT chk_rating_range          CHECK (average_rating >= 0 AND average_rating <= 5)
);

COMMENT ON COLUMN products.price_pesewas IS 'Price in pesewas (1 GHS = 100 pesewas). E.g. ₵10.99 = 1099. Avoids floating-point rounding issues.';
COMMENT ON COLUMN products.price_ghs IS 'Auto-computed GHS price from pesewas. Read-only generated column for reports/queries.';
COMMENT ON COLUMN products.images IS 'JSONB array of image objects: [{"url": "...", "alt": "...", "is_primary": true, "sort_order": 0}]';

CREATE INDEX idx_products_seller_id   ON products (seller_id);
CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_slug        ON products (slug);
CREATE INDEX idx_products_is_active   ON products (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_is_featured ON products (is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_sku         ON products (sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_products_created_at  ON products (created_at);

-- Separate product images table (normalised approach, used alongside JSONB for flexibility)
CREATE TABLE product_images (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT         NOT NULL,
  storage_key VARCHAR(500) UNIQUE,    -- Cloud storage key (R2/S3)
  alt_text    VARCHAR(500),
  file_size   INTEGER,
  mime_type   VARCHAR(50),
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  is_primary  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product_id ON product_images (product_id);

-- Product reviews
CREATE TABLE reviews (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating              SMALLINT    NOT NULL,
  title               VARCHAR(200),
  comment             TEXT,
  is_verified_purchase BOOLEAN    NOT NULL DEFAULT FALSE,
  is_approved         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_review_rating CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT uq_one_review_per_product_user UNIQUE (product_id, user_id)
);

CREATE INDEX idx_reviews_product_id ON reviews (product_id);
CREATE INDEX idx_reviews_user_id    ON reviews (user_id);
CREATE INDEX idx_reviews_rating     ON reviews (rating);

-- =============================================================================
-- 6. WISHLIST & CART
-- =============================================================================

CREATE TABLE wishlists (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wishlist_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID        NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_wishlist_product UNIQUE (wishlist_id, product_id)
);

CREATE INDEX idx_wishlist_items_wishlist_id ON wishlist_items (wishlist_id);

CREATE TABLE carts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- For abandoned cart recovery
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
  id                     UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id                UUID    NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id             UUID    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity               INTEGER NOT NULL DEFAULT 1,
  price_at_add_pesewas   INTEGER NOT NULL, -- Snapshot for price-change alerts
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_cart_product UNIQUE (cart_id, product_id),
  CONSTRAINT chk_cart_qty    CHECK (quantity > 0)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items (cart_id);

-- =============================================================================
-- 7. ORDERS
-- =============================================================================

-- Master order (customer-facing)
CREATE TABLE orders (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number            VARCHAR(30)   NOT NULL UNIQUE, -- Human-readable: GH-20260205-ABCD
  buyer_id                UUID          NOT NULL REFERENCES users(id),

  status                  order_status  NOT NULL DEFAULT 'pending',

  -- Financial snapshot (immutable after creation, in pesewas)
  subtotal_pesewas        INTEGER       NOT NULL,
  shipping_fee_pesewas    INTEGER       NOT NULL DEFAULT 0,
  tax_pesewas             INTEGER       NOT NULL DEFAULT 0,
  discount_pesewas        INTEGER       NOT NULL DEFAULT 0,
  total_amount_pesewas    INTEGER       NOT NULL,

  -- GHS convenience (for reports and admin UI)
  total_amount_ghs        DECIMAL(12,2) GENERATED ALWAYS AS (total_amount_pesewas / 100.0) STORED,

  -- Payment
  payment_status          payment_status NOT NULL DEFAULT 'pending',
  payment_method          payment_method,

  -- Delivery address snapshot (copied from address at order time)
  delivery_full_name      VARCHAR(200)  NOT NULL,
  delivery_phone          VARCHAR(20)   NOT NULL,
  delivery_region         VARCHAR(100)  NOT NULL, -- Ghana region
  delivery_city           VARCHAR(100)  NOT NULL,
  delivery_area           VARCHAR(200),
  delivery_street_address TEXT          NOT NULL,
  delivery_gps_address    VARCHAR(20),

  -- Customer contact
  customer_email          VARCHAR(255)  NOT NULL,
  customer_phone          VARCHAR(20)   NOT NULL,

  notes                   TEXT,

  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  confirmed_at            TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,

  CONSTRAINT chk_total_positive CHECK (total_amount_pesewas >= 0)
);

COMMENT ON COLUMN orders.order_number       IS 'Human-readable order number. Format: GH-YYYYMMDD-XXXX.';
COMMENT ON COLUMN orders.delivery_region    IS 'Ghana administrative region for delivery routing.';
COMMENT ON COLUMN orders.delivery_gps_address IS 'GhanaPost GPS address for precise delivery location.';

CREATE INDEX idx_orders_buyer_id     ON orders (buyer_id);
CREATE INDEX idx_orders_order_number ON orders (order_number);
CREATE INDEX idx_orders_status       ON orders (status);
CREATE INDEX idx_orders_created_at   ON orders (created_at);

-- Seller sub-order (per-seller split of the master order)
CREATE TABLE seller_orders (
  id                        UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                  UUID               NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id                 UUID               NOT NULL REFERENCES seller_profiles(id),
  status                    seller_order_status NOT NULL DEFAULT 'pending',

  -- Financials (seller's portion, in pesewas)
  subtotal_pesewas          INTEGER            NOT NULL,
  shipping_fee_pesewas      INTEGER            NOT NULL DEFAULT 0,
  discount_pesewas          INTEGER            NOT NULL DEFAULT 0,
  total_pesewas             INTEGER            NOT NULL,
  platform_fee_pesewas      INTEGER            NOT NULL, -- Commission amount
  payout_amount_pesewas     INTEGER            NOT NULL, -- total - commission

  -- Fulfillment
  shipping_method           VARCHAR(100),
  tracking_number           VARCHAR(200),
  tracking_url              TEXT,
  shipped_at                TIMESTAMPTZ,
  delivered_at              TIMESTAMPTZ,

  created_at                TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_order_seller UNIQUE (order_id, seller_id)
);

CREATE INDEX idx_seller_orders_seller_id ON seller_orders (seller_id);
CREATE INDEX idx_seller_orders_status    ON seller_orders (status);
CREATE INDEX idx_seller_orders_created   ON seller_orders (created_at);

-- Order line items
CREATE TABLE order_items (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id               UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_order_id        UUID        REFERENCES seller_orders(id),
  product_id             UUID        NOT NULL REFERENCES products(id),

  -- Snapshot data (immutable)
  product_name           VARCHAR(500) NOT NULL,
  product_sku            VARCHAR(100),
  product_image          TEXT,

  quantity               INTEGER      NOT NULL,
  unit_price_pesewas     INTEGER      NOT NULL, -- Price per unit at time of purchase
  total_price_pesewas    INTEGER      NOT NULL, -- quantity × unit price
  commission_amount_ghs  DECIMAL(12,2), -- Commission taken on this item (GHS)

  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_item_qty   CHECK (quantity > 0),
  CONSTRAINT chk_item_price CHECK (unit_price_pesewas > 0)
);

COMMENT ON COLUMN order_items.unit_price_pesewas IS 'Price at time of purchase in pesewas (price snapshot — not affected by future product price changes).';
COMMENT ON COLUMN order_items.commission_amount_ghs IS 'Platform commission on this line item in GHS. Calculated as: (total_price_pesewas / 100) * (commission_rate / 100).';

CREATE INDEX idx_order_items_order_id        ON order_items (order_id);
CREATE INDEX idx_order_items_seller_order_id  ON order_items (seller_order_id);
CREATE INDEX idx_order_items_product_id      ON order_items (product_id);

-- =============================================================================
-- 8. PAYMENTS
-- =============================================================================

CREATE TABLE payments (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             UUID           NOT NULL UNIQUE REFERENCES orders(id),
  amount_pesewas       INTEGER        NOT NULL,
  method               payment_method NOT NULL,
  status               payment_status NOT NULL DEFAULT 'pending',

  -- Gateway references (Paystack, Hubtel, etc.)
  gateway_provider     VARCHAR(50),    -- 'paystack', 'hubtel', 'flutterwave'
  gateway_reference    VARCHAR(200),   -- Their transaction ID
  gateway_response     JSONB,          -- Full response for debugging

  -- MoMo-specific fields
  momo_phone_number    VARCHAR(20),
  momo_network         momo_network,

  -- Card info (partial/masked)
  card_last4           VARCHAR(4),
  card_brand           VARCHAR(20),    -- VISA, Mastercard

  -- Failure info
  failure_reason       TEXT,
  failure_code         VARCHAR(50),

  initiated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  confirmed_at         TIMESTAMPTZ,
  failed_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN payments.momo_phone_number IS 'Mobile Money number used for payment. Format: 0241234567.';
COMMENT ON COLUMN payments.momo_network IS 'Mobile Money network: MTN (dominant), Telecel (formerly Vodafone Cash), AirtelTigo.';

CREATE INDEX idx_payments_order_id          ON payments (order_id);
CREATE INDEX idx_payments_status            ON payments (status);
CREATE INDEX idx_payments_gateway_reference ON payments (gateway_reference) WHERE gateway_reference IS NOT NULL;

-- Refunds
CREATE TABLE refunds (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id          UUID           NOT NULL REFERENCES payments(id),
  amount_pesewas      INTEGER        NOT NULL,
  reason              TEXT           NOT NULL,
  gateway_reference   VARCHAR(200),
  status              payment_status NOT NULL DEFAULT 'pending',
  processed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_refund_amount CHECK (amount_pesewas > 0)
);

CREATE INDEX idx_refunds_payment_id ON refunds (payment_id);

-- =============================================================================
-- 9. COUPONS
-- =============================================================================

CREATE TABLE coupons (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  VARCHAR(50)  NOT NULL UNIQUE,
  seller_id             UUID         REFERENCES seller_profiles(id), -- NULL = platform-wide

  discount_type         VARCHAR(20)  NOT NULL, -- 'percentage' or 'fixed'
  discount_value        INTEGER      NOT NULL, -- % value or pesewas amount

  min_order_pesewas     INTEGER,
  max_discount_pesewas  INTEGER,
  usage_limit           INTEGER,
  usage_count           INTEGER      NOT NULL DEFAULT 0,

  starts_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ,
  is_active             BOOLEAN      NOT NULL DEFAULT TRUE,

  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_discount_type  CHECK (discount_type IN ('percentage', 'fixed')),
  CONSTRAINT chk_discount_value CHECK (discount_value > 0)
);

CREATE INDEX idx_coupons_code      ON coupons (code);
CREATE INDEX idx_coupons_is_active ON coupons (is_active) WHERE is_active = TRUE;

-- =============================================================================
-- 10. AUDIT & SYSTEM
-- =============================================================================

-- Inventory change log
CREATE TABLE inventory_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID        NOT NULL,
  action            VARCHAR(20) NOT NULL, -- 'SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN'
  quantity_change   INTEGER     NOT NULL, -- +/- change
  previous_quantity INTEGER     NOT NULL,
  new_quantity      INTEGER     NOT NULL,
  order_id          UUID,
  user_id           UUID,       -- Who triggered the change
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_logs_product_id ON inventory_logs (product_id);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs (created_at);

-- =============================================================================
-- 11. TRIGGER: auto-update updated_at on row modification
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
      t
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;
