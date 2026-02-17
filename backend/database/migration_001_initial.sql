-- =============================================================================
-- GHANAMARKET — Initial Migration
-- Migration 001: Create all tables, indexes, constraints, and triggers
-- Compatible with: node-postgres (pg), Knex.js, or raw psql
-- =============================================================================
--
-- USAGE:
--   psql -U <user> -d <database> -f migration_001_initial.sql
--
-- OR with Knex.js raw:
--   await knex.raw(fs.readFileSync('./migration_001_initial.sql', 'utf8'));
--
-- ROLLBACK:
--   Use the DOWN section at the bottom of this file.
-- =============================================================================

-- ===================== UP =====================

BEGIN;

-- Record migration
CREATE TABLE IF NOT EXISTS _migrations (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(200) NOT NULL UNIQUE,
  applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Check if already applied
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM _migrations WHERE name = '001_initial') THEN
    RAISE EXCEPTION 'Migration 001_initial has already been applied';
  END IF;
END $$;

-- ========== Extensions ==========
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== Enums ==========
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
  'momo_mtn', 'momo_telecel', 'momo_airteltigo',
  'card', 'bank_transfer', 'cash_on_delivery'
);
CREATE TYPE payment_status      AS ENUM (
  'pending', 'processing', 'success', 'failed',
  'refunded', 'partially_refunded', 'cancelled'
);
CREATE TYPE payout_status       AS ENUM ('pending', 'processing', 'paid', 'failed', 'cancelled');
CREATE TYPE transaction_type    AS ENUM ('sale', 'refund', 'payout', 'commission', 'adjustment');
CREATE TYPE momo_network        AS ENUM ('mtn', 'telecel', 'airteltigo');

-- ========== Tables ==========

-- 1. Users
CREATE TABLE users (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(200) NOT NULL,
  phone           VARCHAR(20),
  avatar_url      TEXT,
  status          account_status NOT NULL DEFAULT 'active',
  email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  phone_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$'),
  CONSTRAINT chk_phone_format CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{10,15}$')
);
CREATE INDEX idx_users_email      ON users (email);
CREATE INDEX idx_users_phone      ON users (phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_status     ON users (status);
CREATE INDEX idx_users_created_at ON users (created_at);

-- 2. User Roles
CREATE TABLE user_roles (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       user_role NOT NULL DEFAULT 'buyer',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID      REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_user_role UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);

-- 3. Refresh Tokens
CREATE TABLE refresh_tokens (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ  NOT NULL,
  revoked    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_hash    ON refresh_tokens (token_hash);

-- 4. Addresses
CREATE TABLE addresses (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label          VARCHAR(50)  NOT NULL,
  type           address_type NOT NULL DEFAULT 'home',
  full_name      VARCHAR(200) NOT NULL,
  phone          VARCHAR(20)  NOT NULL,
  region         VARCHAR(100) NOT NULL,
  city           VARCHAR(100) NOT NULL,
  area           VARCHAR(200),
  street_address TEXT         NOT NULL,
  gps_address    VARCHAR(20),
  is_default     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_addresses_user_id ON addresses (user_id);

-- 5. Seller Applications
CREATE TABLE seller_applications (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_name        VARCHAR(200)      NOT NULL,
  business_type     VARCHAR(100),
  business_email    VARCHAR(255),
  business_phone    VARCHAR(20)       NOT NULL,
  business_address  TEXT,
  tax_id            VARCHAR(50),
  tin_number        VARCHAR(20),
  ghana_card_number VARCHAR(20),
  identity_documents JSONB,
  bank_account_info JSONB,
  status            seller_app_status NOT NULL DEFAULT 'pending',
  rejection_reason  TEXT,
  applied_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID              REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_ghana_card CHECK (ghana_card_number IS NULL OR ghana_card_number ~ '^GHA-[0-9]{9}-[0-9]$')
);
CREATE INDEX idx_seller_apps_user_id ON seller_applications (user_id);
CREATE INDEX idx_seller_apps_status  ON seller_applications (status);

-- 6. Seller Profiles
CREATE TABLE seller_profiles (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  store_name       VARCHAR(200)  NOT NULL,
  store_slug       VARCHAR(200)  NOT NULL UNIQUE,
  store_description TEXT,
  store_logo       TEXT,
  store_banner     TEXT,
  business_email   VARCHAR(255),
  business_phone   VARCHAR(20)   NOT NULL,
  is_verified      BOOLEAN       NOT NULL DEFAULT FALSE,
  verified_at      TIMESTAMPTZ,
  tax_id           VARCHAR(50),
  id_card_type     VARCHAR(30),
  id_card_number   VARCHAR(50),
  id_card_image    TEXT,
  commission_rate  DECIMAL(5,2)  NOT NULL DEFAULT 5.00,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  total_sales      INTEGER       NOT NULL DEFAULT 0,
  rating           DECIMAL(2,1)  NOT NULL DEFAULT 0.0,
  ghana_region     VARCHAR(100),
  payment_details  JSONB,
  website          TEXT,
  instagram        VARCHAR(200),
  facebook         VARCHAR(200),
  twitter          VARCHAR(200),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 100),
  CONSTRAINT chk_rating CHECK (rating >= 0 AND rating <= 5)
);
CREATE INDEX idx_seller_profiles_slug        ON seller_profiles (store_slug);
CREATE INDEX idx_seller_profiles_is_active   ON seller_profiles (is_active);
CREATE INDEX idx_seller_profiles_is_verified ON seller_profiles (is_verified);

-- 7. Seller Wallets
CREATE TABLE seller_wallets (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID    NOT NULL UNIQUE REFERENCES seller_profiles(id) ON DELETE CASCADE,
  current_balance INTEGER NOT NULL DEFAULT 0,
  pending_balance INTEGER NOT NULL DEFAULT 0,
  total_earned    INTEGER NOT NULL DEFAULT 0,
  total_withdrawn INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_balance_positive CHECK (current_balance >= 0)
);

-- 8. Wallet Transactions
CREATE TABLE wallet_transactions (
  id             UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id      UUID             NOT NULL REFERENCES seller_wallets(id) ON DELETE CASCADE,
  type           transaction_type NOT NULL,
  amount         INTEGER          NOT NULL,
  balance_before INTEGER          NOT NULL,
  balance_after  INTEGER          NOT NULL,
  description    TEXT,
  reference_id   VARCHAR(100),
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_wallet_tx_wallet_id ON wallet_transactions (wallet_id);
CREATE INDEX idx_wallet_tx_type      ON wallet_transactions (type);

-- 9. Seller Payouts
CREATE TABLE seller_payouts (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id            UUID           NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
  amount_ghs           DECIMAL(12,2)  NOT NULL,
  amount_pesewas       INTEGER        NOT NULL,
  status               payout_status  NOT NULL DEFAULT 'pending',
  destination_type     VARCHAR(10)    NOT NULL,
  mobile_money_number  VARCHAR(20),
  mobile_money_network momo_network,
  mobile_money_name    VARCHAR(200),
  bank_name            VARCHAR(200),
  bank_account_number  VARCHAR(50),
  bank_account_name    VARCHAR(200),
  transaction_ref      VARCHAR(100),
  processed_at         TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_payout_amount CHECK (amount_pesewas > 0),
  CONSTRAINT chk_payout_dest CHECK (
    (destination_type = 'momo' AND mobile_money_number IS NOT NULL AND mobile_money_network IS NOT NULL) OR
    (destination_type = 'bank' AND bank_name IS NOT NULL AND bank_account_number IS NOT NULL)
  )
);
CREATE INDEX idx_seller_payouts_seller_id ON seller_payouts (seller_id);
CREATE INDEX idx_seller_payouts_status    ON seller_payouts (status);

-- 10. Seller Reviews
CREATE TABLE seller_reviews (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id  UUID        NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     SMALLINT    NOT NULL,
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_seller_review_rating CHECK (rating >= 1 AND rating <= 5)
);
CREATE INDEX idx_seller_reviews_seller_id ON seller_reviews (seller_id);

-- 11. Categories
CREATE TABLE categories (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL UNIQUE,
  slug        VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  parent_id   UUID         REFERENCES categories(id) ON DELETE SET NULL,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_categories_slug      ON categories (slug);
CREATE INDEX idx_categories_parent_id ON categories (parent_id);
CREATE INDEX idx_categories_is_active ON categories (is_active) WHERE is_active = TRUE;

-- 12. Products
CREATE TABLE products (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id                UUID          REFERENCES seller_profiles(id) ON DELETE SET NULL,
  category_id              UUID          NOT NULL REFERENCES categories(id),
  name                     VARCHAR(500)  NOT NULL,
  slug                     VARCHAR(500)  NOT NULL UNIQUE,
  description              TEXT,
  price_pesewas            INTEGER       NOT NULL,
  compare_at_price_pesewas INTEGER,
  cost_pesewas             INTEGER,
  price_ghs                DECIMAL(12,2) GENERATED ALWAYS AS (price_pesewas / 100.0) STORED,
  compare_at_price_ghs     DECIMAL(12,2) GENERATED ALWAYS AS (compare_at_price_pesewas / 100.0) STORED,
  quantity                 INTEGER       NOT NULL DEFAULT 0,
  low_stock_threshold      INTEGER       NOT NULL DEFAULT 5,
  track_inventory          BOOLEAN       NOT NULL DEFAULT TRUE,
  allow_backorder          BOOLEAN       NOT NULL DEFAULT FALSE,
  sku                      VARCHAR(100)  UNIQUE,
  barcode                  VARCHAR(100),
  meta_title               VARCHAR(200),
  meta_description         TEXT,
  is_active                BOOLEAN       NOT NULL DEFAULT TRUE,
  is_featured              BOOLEAN       NOT NULL DEFAULT FALSE,
  views                    INTEGER       NOT NULL DEFAULT 0,
  average_rating           DECIMAL(2,1)  NOT NULL DEFAULT 0.0,
  review_count             INTEGER       NOT NULL DEFAULT 0,
  weight_grams             INTEGER,
  images                   JSONB         DEFAULT '[]'::jsonb,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_price_positive       CHECK (price_pesewas > 0),
  CONSTRAINT chk_compare_price        CHECK (compare_at_price_pesewas IS NULL OR compare_at_price_pesewas >= price_pesewas),
  CONSTRAINT chk_quantity_non_negative CHECK (quantity >= 0),
  CONSTRAINT chk_rating_range         CHECK (average_rating >= 0 AND average_rating <= 5)
);
CREATE INDEX idx_products_seller_id   ON products (seller_id);
CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_slug        ON products (slug);
CREATE INDEX idx_products_is_active   ON products (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_is_featured ON products (is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_created_at  ON products (created_at);

-- 13. Product Images
CREATE TABLE product_images (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT         NOT NULL,
  storage_key VARCHAR(500) UNIQUE,
  alt_text    VARCHAR(500),
  file_size   INTEGER,
  mime_type   VARCHAR(50),
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  is_primary  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_images_product_id ON product_images (product_id);

-- 14. Reviews
CREATE TABLE reviews (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id              UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating               SMALLINT    NOT NULL,
  title                VARCHAR(200),
  comment              TEXT,
  is_verified_purchase BOOLEAN     NOT NULL DEFAULT FALSE,
  is_approved          BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_review_rating CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT uq_review UNIQUE (product_id, user_id)
);
CREATE INDEX idx_reviews_product_id ON reviews (product_id);
CREATE INDEX idx_reviews_user_id    ON reviews (user_id);

-- 15. Wishlists & Cart
CREATE TABLE wishlists (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wishlist_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID        NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_wishlist_product UNIQUE (wishlist_id, product_id)
);

CREATE TABLE carts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id               UUID    NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id            UUID    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity              INTEGER NOT NULL DEFAULT 1,
  price_at_add_pesewas  INTEGER NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cart_product UNIQUE (cart_id, product_id),
  CONSTRAINT chk_cart_qty CHECK (quantity > 0)
);

-- 16. Orders
CREATE TABLE orders (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number           VARCHAR(30)   NOT NULL UNIQUE,
  buyer_id               UUID          NOT NULL REFERENCES users(id),
  status                 order_status  NOT NULL DEFAULT 'pending',
  subtotal_pesewas       INTEGER       NOT NULL,
  shipping_fee_pesewas   INTEGER       NOT NULL DEFAULT 0,
  tax_pesewas            INTEGER       NOT NULL DEFAULT 0,
  discount_pesewas       INTEGER       NOT NULL DEFAULT 0,
  total_amount_pesewas   INTEGER       NOT NULL,
  total_amount_ghs       DECIMAL(12,2) GENERATED ALWAYS AS (total_amount_pesewas / 100.0) STORED,
  payment_status         payment_status NOT NULL DEFAULT 'pending',
  payment_method         payment_method,
  delivery_full_name     VARCHAR(200)  NOT NULL,
  delivery_phone         VARCHAR(20)   NOT NULL,
  delivery_region        VARCHAR(100)  NOT NULL,
  delivery_city          VARCHAR(100)  NOT NULL,
  delivery_area          VARCHAR(200),
  delivery_street_address TEXT         NOT NULL,
  delivery_gps_address   VARCHAR(20),
  customer_email         VARCHAR(255)  NOT NULL,
  customer_phone         VARCHAR(20)   NOT NULL,
  notes                  TEXT,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  confirmed_at           TIMESTAMPTZ,
  cancelled_at           TIMESTAMPTZ,
  CONSTRAINT chk_total_positive CHECK (total_amount_pesewas >= 0)
);
CREATE INDEX idx_orders_buyer_id     ON orders (buyer_id);
CREATE INDEX idx_orders_order_number ON orders (order_number);
CREATE INDEX idx_orders_status       ON orders (status);
CREATE INDEX idx_orders_created_at   ON orders (created_at);

-- 17. Seller Orders (sub-orders)
CREATE TABLE seller_orders (
  id                    UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID               NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id             UUID               NOT NULL REFERENCES seller_profiles(id),
  status                seller_order_status NOT NULL DEFAULT 'pending',
  subtotal_pesewas      INTEGER            NOT NULL,
  shipping_fee_pesewas  INTEGER            NOT NULL DEFAULT 0,
  discount_pesewas      INTEGER            NOT NULL DEFAULT 0,
  total_pesewas         INTEGER            NOT NULL,
  platform_fee_pesewas  INTEGER            NOT NULL,
  payout_amount_pesewas INTEGER            NOT NULL,
  shipping_method       VARCHAR(100),
  tracking_number       VARCHAR(200),
  tracking_url          TEXT,
  shipped_at            TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_order_seller UNIQUE (order_id, seller_id)
);
CREATE INDEX idx_seller_orders_seller_id ON seller_orders (seller_id);
CREATE INDEX idx_seller_orders_status    ON seller_orders (status);
CREATE INDEX idx_seller_orders_created   ON seller_orders (created_at);

-- 18. Order Items
CREATE TABLE order_items (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_order_id       UUID         REFERENCES seller_orders(id),
  product_id            UUID         NOT NULL REFERENCES products(id),
  product_name          VARCHAR(500) NOT NULL,
  product_sku           VARCHAR(100),
  product_image         TEXT,
  quantity              INTEGER      NOT NULL,
  unit_price_pesewas    INTEGER      NOT NULL,
  total_price_pesewas   INTEGER      NOT NULL,
  commission_amount_ghs DECIMAL(12,2),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_item_qty   CHECK (quantity > 0),
  CONSTRAINT chk_item_price CHECK (unit_price_pesewas > 0)
);
CREATE INDEX idx_order_items_order_id       ON order_items (order_id);
CREATE INDEX idx_order_items_seller_order_id ON order_items (seller_order_id);
CREATE INDEX idx_order_items_product_id     ON order_items (product_id);

-- 19. Payments
CREATE TABLE payments (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID           NOT NULL UNIQUE REFERENCES orders(id),
  amount_pesewas    INTEGER        NOT NULL,
  method            payment_method NOT NULL,
  status            payment_status NOT NULL DEFAULT 'pending',
  gateway_provider  VARCHAR(50),
  gateway_reference VARCHAR(200),
  gateway_response  JSONB,
  momo_phone_number VARCHAR(20),
  momo_network      momo_network,
  card_last4        VARCHAR(4),
  card_brand        VARCHAR(20),
  failure_reason    TEXT,
  failure_code      VARCHAR(50),
  initiated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  confirmed_at      TIMESTAMPTZ,
  failed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_order_id          ON payments (order_id);
CREATE INDEX idx_payments_status            ON payments (status);
CREATE INDEX idx_payments_gateway_reference ON payments (gateway_reference) WHERE gateway_reference IS NOT NULL;

-- 20. Refunds
CREATE TABLE refunds (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id        UUID           NOT NULL REFERENCES payments(id),
  amount_pesewas    INTEGER        NOT NULL,
  reason            TEXT           NOT NULL,
  gateway_reference VARCHAR(200),
  status            payment_status NOT NULL DEFAULT 'pending',
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_refund_amount CHECK (amount_pesewas > 0)
);

-- 21. Coupons
CREATE TABLE coupons (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 VARCHAR(50)  NOT NULL UNIQUE,
  seller_id            UUID         REFERENCES seller_profiles(id),
  discount_type        VARCHAR(20)  NOT NULL,
  discount_value       INTEGER      NOT NULL,
  min_order_pesewas    INTEGER,
  max_discount_pesewas INTEGER,
  usage_limit          INTEGER,
  usage_count          INTEGER      NOT NULL DEFAULT 0,
  starts_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ,
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_discount_type  CHECK (discount_type IN ('percentage', 'fixed')),
  CONSTRAINT chk_discount_value CHECK (discount_value > 0)
);

-- 22. Inventory Logs
CREATE TABLE inventory_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID        NOT NULL,
  action            VARCHAR(20) NOT NULL,
  quantity_change   INTEGER     NOT NULL,
  previous_quantity INTEGER     NOT NULL,
  new_quantity      INTEGER     NOT NULL,
  order_id          UUID,
  user_id           UUID,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_inventory_logs_product_id ON inventory_logs (product_id);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs (created_at);

-- ========== Auto-update trigger ==========
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()', t
    );
  END LOOP;
END $$ LANGUAGE plpgsql;

-- Record this migration
INSERT INTO _migrations (name) VALUES ('001_initial');

COMMIT;


-- ===================== DOWN (ROLLBACK) =====================
-- Uncomment and run to completely reverse this migration.
-- WARNING: This will DELETE ALL DATA.

-- BEGIN;
-- DROP TABLE IF EXISTS inventory_logs CASCADE;
-- DROP TABLE IF EXISTS coupons CASCADE;
-- DROP TABLE IF EXISTS refunds CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS order_items CASCADE;
-- DROP TABLE IF EXISTS seller_orders CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS cart_items CASCADE;
-- DROP TABLE IF EXISTS carts CASCADE;
-- DROP TABLE IF EXISTS wishlist_items CASCADE;
-- DROP TABLE IF EXISTS wishlists CASCADE;
-- DROP TABLE IF EXISTS reviews CASCADE;
-- DROP TABLE IF EXISTS product_images CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS categories CASCADE;
-- DROP TABLE IF EXISTS seller_reviews CASCADE;
-- DROP TABLE IF EXISTS seller_payouts CASCADE;
-- DROP TABLE IF EXISTS wallet_transactions CASCADE;
-- DROP TABLE IF EXISTS seller_wallets CASCADE;
-- DROP TABLE IF EXISTS seller_profiles CASCADE;
-- DROP TABLE IF EXISTS seller_applications CASCADE;
-- DROP TABLE IF EXISTS addresses CASCADE;
-- DROP TABLE IF EXISTS refresh_tokens CASCADE;
-- DROP TABLE IF EXISTS user_roles CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS _migrations CASCADE;
-- DROP TYPE IF EXISTS momo_network CASCADE;
-- DROP TYPE IF EXISTS transaction_type CASCADE;
-- DROP TYPE IF EXISTS payout_status CASCADE;
-- DROP TYPE IF EXISTS payment_status CASCADE;
-- DROP TYPE IF EXISTS payment_method CASCADE;
-- DROP TYPE IF EXISTS seller_order_status CASCADE;
-- DROP TYPE IF EXISTS order_status CASCADE;
-- DROP TYPE IF EXISTS seller_app_status CASCADE;
-- DROP TYPE IF EXISTS address_type CASCADE;
-- DROP TYPE IF EXISTS account_status CASCADE;
-- DROP TYPE IF EXISTS user_role CASCADE;
-- DROP FUNCTION IF EXISTS trigger_set_updated_at CASCADE;
-- COMMIT;
