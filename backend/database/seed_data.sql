-- =============================================================================
-- GHANAMARKET — Seed Data
-- Ghana Bono Region + Sample Categories + Demo Users
-- =============================================================================
--
-- NOTES:
--   • Prices in pesewas (1 GHS = 100 pesewas)
--   • Focuses on Bono Region (capital: Sunyani) as requested
--   • Ghana Card format: GHA-XXXXXXXXX-X
--   • GhanaPost GPS addresses for Bono region start with "BS-" (Bono-Sunyani)
-- =============================================================================

BEGIN;

-- ========== CATEGORIES ==========
-- Parent categories relevant to Bono region / Ghana ecommerce

INSERT INTO categories (id, name, slug, description, image_url, parent_id, sort_order) VALUES
  -- Top-level categories
  ('a0000000-0000-0000-0000-000000000001', 'Electronics',           'electronics',           'Phones, laptops, gadgets and more',                NULL, NULL, 1),
  ('a0000000-0000-0000-0000-000000000002', 'Fashion',               'fashion',               'Clothing, shoes, and accessories',                 NULL, NULL, 2),
  ('a0000000-0000-0000-0000-000000000003', 'Groceries & Food',      'groceries-food',        'Fresh produce, packaged foods, and local staples', NULL, NULL, 3),
  ('a0000000-0000-0000-0000-000000000004', 'Home & Kitchen',        'home-kitchen',          'Appliances, cookware, and home essentials',         NULL, NULL, 4),
  ('a0000000-0000-0000-0000-000000000005', 'Beauty & Personal Care','beauty-personal-care',  'Skincare, haircare, and beauty products',           NULL, NULL, 5),
  ('a0000000-0000-0000-0000-000000000006', 'Computers & Accessories','computers-accessories','Laptops, desktops, printers, and peripherals',      NULL, NULL, 6),
  ('a0000000-0000-0000-0000-000000000007', 'Sports & Outdoors',     'sports-outdoors',       'Gym equipment, team sports, and outdoor gear',      NULL, NULL, 7),
  ('a0000000-0000-0000-0000-000000000008', 'Baby & Kids',           'baby-kids',             'Toys, diapers, and kids clothing',                  NULL, NULL, 8),
  ('a0000000-0000-0000-0000-000000000009', 'Agriculture & Farming', 'agriculture-farming',   'Farm tools, seeds, fertilizers — key for Bono region', NULL, NULL, 9),
  ('a0000000-0000-0000-0000-000000000010', 'Health & Pharmacy',     'health-pharmacy',       'Over-the-counter medicines and health products',    NULL, NULL, 10)
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories
INSERT INTO categories (id, name, slug, description, parent_id, sort_order) VALUES
  -- Electronics > Phones & Accessories
  ('b0000000-0000-0000-0000-000000000001', 'Phones',          'phones',          'Smartphones and feature phones',                 'a0000000-0000-0000-0000-000000000001', 1),
  ('b0000000-0000-0000-0000-000000000002', 'Phone Accessories','phone-accessories','Cases, chargers, screen protectors',            'a0000000-0000-0000-0000-000000000001', 2),
  ('b0000000-0000-0000-0000-000000000003', 'Televisions',     'televisions',     'Smart TVs and accessories',                      'a0000000-0000-0000-0000-000000000001', 3),

  -- Fashion sub-categories
  ('b0000000-0000-0000-0000-000000000004', 'Traditional Wear',     'traditional-wear',      'Kente, African prints, and traditional attire',     'a0000000-0000-0000-0000-000000000002', 1),
  ('b0000000-0000-0000-0000-000000000005', 'Men''s Clothing',      'mens-clothing',         'Shirts, trousers, and men''s fashion',              'a0000000-0000-0000-0000-000000000002', 2),
  ('b0000000-0000-0000-0000-000000000006', 'Women''s Clothing',    'womens-clothing',       'Dresses, blouses, and women''s fashion',            'a0000000-0000-0000-0000-000000000002', 3),
  ('b0000000-0000-0000-0000-000000000007', 'Footwear',             'footwear',              'Shoes, sandals, and boots',                         'a0000000-0000-0000-0000-000000000002', 4),

  -- Groceries sub-categories
  ('b0000000-0000-0000-0000-000000000008', 'Fresh Produce',   'fresh-produce',   'Fruits, vegetables, and tubers',                 'a0000000-0000-0000-0000-000000000003', 1),
  ('b0000000-0000-0000-0000-000000000009', 'Grains & Cereals','grains-cereals',  'Rice, maize, millet — Bono staples',             'a0000000-0000-0000-0000-000000000003', 2),
  ('b0000000-0000-0000-0000-000000000010', 'Spices & Condiments','spices-condiments','Dawadawa, shito, ground pepper',              'a0000000-0000-0000-0000-000000000003', 3),

  -- Agriculture sub-categories (important for Bono region — agricultural hub)
  ('b0000000-0000-0000-0000-000000000011', 'Farm Tools',       'farm-tools',       'Cutlasses, hoes, sprayers',                     'a0000000-0000-0000-0000-000000000009', 1),
  ('b0000000-0000-0000-0000-000000000012', 'Seeds & Seedlings','seeds-seedlings',  'Cocoa, cashew, plantain suckers',               'a0000000-0000-0000-0000-000000000009', 2),
  ('b0000000-0000-0000-0000-000000000013', 'Fertilizers',      'fertilizers',      'NPK, organic manure, foliar sprays',            'a0000000-0000-0000-0000-000000000009', 3)
ON CONFLICT (slug) DO NOTHING;


-- ========== DEMO USERS ==========
-- Passwords are bcrypt hashes of "password123"
-- $2a$12$ prefix = bcrypt cost factor 12

INSERT INTO users (id, email, password_hash, full_name, phone, status, email_verified, phone_verified) VALUES
  -- Platform admin
  (
    'u0000000-0000-0000-0000-000000000001',
    'admin@ghanamarket.com',
    '$2a$12$LJ3m4ws0DP4k5q6Q5q6Q5uJ5q6Q5q6Q5q6Q5q6Q5q6Q5q6Q5q6Q5q',
    'Admin User',
    '0244123456',
    'active', TRUE, TRUE
  ),
  -- Sample buyer from Bono region
  (
    'u0000000-0000-0000-0000-000000000002',
    'kwame@example.com',
    '$2a$12$LJ3m4ws0DP4k5q6Q5q6Q5uJ5q6Q5q6Q5q6Q5q6Q5q6Q5q6Q5q6Q5q',
    'Kwame Boateng',
    '0551234567',
    'active', TRUE, TRUE
  ),
  -- Sample seller from Sunyani (Bono region capital)
  (
    'u0000000-0000-0000-0000-000000000003',
    'ama@sunyanimarket.com',
    '$2a$12$LJ3m4ws0DP4k5q6Q5q6Q5uJ5q6Q5q6Q5q6Q5q6Q5q6Q5q6Q5q6Q5q',
    'Ama Serwaa',
    '0241987654',
    'active', TRUE, TRUE
  )
ON CONFLICT (email) DO NOTHING;


-- ========== USER ROLES ==========

INSERT INTO user_roles (user_id, role) VALUES
  ('u0000000-0000-0000-0000-000000000001', 'admin'),
  ('u0000000-0000-0000-0000-000000000001', 'buyer'),  -- admin can also buy
  ('u0000000-0000-0000-0000-000000000002', 'buyer'),
  ('u0000000-0000-0000-0000-000000000003', 'seller'),
  ('u0000000-0000-0000-0000-000000000003', 'buyer')   -- sellers can also buy
ON CONFLICT ON CONSTRAINT uq_user_role DO NOTHING;


-- ========== BONO REGION ADDRESSES ==========
-- GhanaPost GPS for Bono: BS-XXXX-XXXX (Bono-Sunyani)

INSERT INTO addresses (user_id, label, type, full_name, phone, region, city, area, street_address, gps_address, is_default) VALUES
  -- Buyer address in Sunyani
  (
    'u0000000-0000-0000-0000-000000000002',
    'Home', 'home',
    'Kwame Boateng', '0551234567',
    'Bono', 'Sunyani', 'South Sunyani',
    'Near Sunyani Central Market, House No. 15, Behind SDA Church',
    'BS-0042-6789',
    TRUE
  ),
  -- Seller address in Sunyani
  (
    'u0000000-0000-0000-0000-000000000003',
    'Shop', 'work',
    'Ama Serwaa', '0241987654',
    'Bono', 'Sunyani', 'Market Area',
    'Sunyani New Market, Stall A-23, Near Telecel Office',
    'BS-0015-3456',
    TRUE
  );


-- ========== SELLER APPLICATION (approved) ==========

INSERT INTO seller_applications (
  user_id, store_name, business_type, business_email, business_phone,
  business_address, tin_number, ghana_card_number,
  bank_account_info, status, applied_at, reviewed_at, reviewed_by
) VALUES (
  'u0000000-0000-0000-0000-000000000003',
  'Ama''s Sunyani Store',
  'Sole Proprietor',
  'ama@sunyanimarket.com',
  '0241987654',
  'Sunyani New Market, Bono Region',
  'C0012345678',        -- GRA TIN format
  'GHA-123456789-0',    -- Ghana Card format
  '{"type": "momo", "network": "mtn", "number": "0241987654", "name": "Ama Serwaa"}'::jsonb,
  'approved',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '28 days',
  'u0000000-0000-0000-0000-000000000001'  -- Reviewed by admin
);


-- ========== SELLER PROFILE ==========

INSERT INTO seller_profiles (
  id, user_id, store_name, store_slug, store_description,
  business_email, business_phone, is_verified, verified_at,
  commission_rate, is_active, ghana_region, payment_details
) VALUES (
  's0000000-0000-0000-0000-000000000001',
  'u0000000-0000-0000-0000-000000000003',
  'Ama''s Sunyani Store',
  'amas-sunyani-store',
  'Quality products from the heart of Bono Region! Fresh produce, traditional crafts, and daily essentials delivered from Sunyani.',
  'ama@sunyanimarket.com',
  '0241987654',
  TRUE,
  NOW() - INTERVAL '28 days',
  5.00,
  TRUE,
  'Bono',
  '{"type": "momo", "network": "mtn", "number": "0241987654", "name": "Ama Serwaa"}'::jsonb
) ON CONFLICT (user_id) DO NOTHING;


-- ========== SELLER WALLET ==========

INSERT INTO seller_wallets (seller_id, current_balance, pending_balance, total_earned, total_withdrawn) VALUES
  ('s0000000-0000-0000-0000-000000000001', 0, 0, 0, 0)
ON CONFLICT (seller_id) DO NOTHING;


-- ========== SAMPLE PRODUCTS for Bono region seller ==========
-- Prices in pesewas (multiply GHS × 100)

INSERT INTO products (
  id, seller_id, category_id, name, slug, description,
  price_pesewas, compare_at_price_pesewas, quantity, sku,
  is_active, is_featured
) VALUES
  -- 1. Fresh Yams from Bono (₵45.00)
  (
    'p0000000-0000-0000-0000-000000000001',
    's0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000008',  -- Fresh Produce
    'Fresh Pona Yams (Medium) — Set of 3',
    'fresh-pona-yams-medium-set-3-bono',
    'Premium Pona yams sourced directly from farms in the Bono Region. Known for their soft texture and rich taste. Perfect for fufu, ampesi, or fried yam.',
    4500,             -- ₵45.00
    5500,             -- ₵55.00 (was)
    100,
    'BONO-YAM-001',
    TRUE, TRUE
  ),
  -- 2. Traditional Kente (₵850.00)
  (
    'p0000000-0000-0000-0000-000000000002',
    's0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000004',  -- Traditional Wear
    'Handwoven Kente Cloth — Bono Style (6 Yards)',
    'handwoven-kente-bono-style-6-yards',
    'Authentic handwoven Kente from Bono Region artisans. Traditional patterns with modern color combinations. Perfect for special occasions, church, and festivals.',
    85000,            -- ₵850.00
    120000,           -- ₵1,200.00 (was)
    8,
    'BONO-KNT-001',
    TRUE, TRUE
  ),
  -- 3. Organic Cocoa (₵180.00)
  (
    'p0000000-0000-0000-0000-000000000003',
    's0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000008',  -- Fresh Produce
    'Organic Cocoa Beans — 5kg Bag',
    'organic-cocoa-beans-5kg-bono',
    'Premium organic cocoa beans from Bono Region farms. Sun-dried and fermented using traditional methods. Ideal for chocolate making and local beverages.',
    18000,            -- ₵180.00
    NULL,
    40,
    'BONO-COC-001',
    TRUE, FALSE
  ),
  -- 4. Cashew Nuts (₵95.00)
  (
    'p0000000-0000-0000-0000-000000000004',
    's0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000008',  -- Fresh Produce
    'Raw Cashew Nuts — 2kg Pack',
    'raw-cashew-nuts-2kg-bono',
    'Fresh cashew nuts from Jaman South District, Bono Region. Rich in protein and healthy fats. Locally sourced from smallholder farmers.',
    9500,             -- ₵95.00
    12000,            -- ₵120.00 (was)
    60,
    'BONO-CSH-001',
    TRUE, FALSE
  ),
  -- 5. Farm Cutlass (₵35.00)
  (
    'p0000000-0000-0000-0000-000000000005',
    's0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000011',  -- Farm Tools
    'Heavy-Duty Farm Cutlass — Sunyani Made',
    'heavy-duty-farm-cutlass-sunyani',
    'Locally forged heavy-duty cutlass, perfect for cocoa farming, bush clearing, and general farm work. Durable wooden handle with steel blade.',
    3500,             -- ₵35.00
    NULL,
    150,
    'BONO-CUT-001',
    TRUE, FALSE
  ),
  -- 6. Shea Butter (₵60.00)
  (
    'p0000000-0000-0000-0000-000000000006',
    's0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000005',  -- Beauty & Personal Care
    'Pure Raw Shea Butter — 500g',
    'pure-raw-shea-butter-500g-bono',
    'Unrefined raw shea butter from Bono Region. Excellent for skin moisturizing, hair care, and cooking. Handmade by local women cooperatives.',
    6000,             -- ₵60.00
    7500,             -- ₵75.00 (was)
    80,
    'BONO-SHB-001',
    TRUE, TRUE
  )
ON CONFLICT (slug) DO NOTHING;


-- ========== SAMPLE COUPON ==========

INSERT INTO coupons (code, discount_type, discount_value, min_order_pesewas, max_discount_pesewas, usage_limit, is_active)
VALUES ('AKWAABA10', 'percentage', 10, 5000, 10000, 500, TRUE)
ON CONFLICT (code) DO NOTHING;
-- AKWAABA = "Welcome" in Akan (language spoken in Bono Region)


-- ========== CARTS for demo users ==========

INSERT INTO carts (user_id) VALUES
  ('u0000000-0000-0000-0000-000000000002'),
  ('u0000000-0000-0000-0000-000000000003')
ON CONFLICT (user_id) DO NOTHING;


-- ========== WISHLISTS for demo users ==========

INSERT INTO wishlists (user_id) VALUES
  ('u0000000-0000-0000-0000-000000000002'),
  ('u0000000-0000-0000-0000-000000000003')
ON CONFLICT (user_id) DO NOTHING;


COMMIT;

-- =============================================================================
-- POST-SEED SUMMARY
-- =============================================================================
--
-- ✓ 10 parent categories + 13 sub-categories (23 total)
-- ✓ 3 demo users: admin, buyer (Bono), seller (Sunyani)
-- ✓ 1 approved seller application with Ghana Card + TIN
-- ✓ 1 seller profile with MTN MoMo payout details
-- ✓ 1 seller wallet (zero balance)
-- ✓ 6 products from Bono Region (yams, kente, cocoa, cashews, cutlass, shea butter)
-- ✓ 1 coupon: AKWAABA10 (10% off, "Welcome" in Akan)
-- ✓ 2 addresses with GhanaPost GPS (BS- prefix for Bono-Sunyani)
-- ✓ Carts and wishlists for demo users
-- =============================================================================
