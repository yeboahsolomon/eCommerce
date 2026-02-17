# GhanaMarket — PostgreSQL Database Schema

## Overview

Complete relational schema for a multi-vendor e-commerce platform serving **Ghana**, with native support for **Mobile Money (MoMo)**, **Ghana Card**, **GRA TIN**, **GhanaPost GPS addresses**, and all **16 administrative regions**.

## File Structure

```
database/
├── schema.sql                  # Full DDL — tables, indexes, constraints, triggers
├── migration_001_initial.sql   # Transaction-wrapped migration with rollback
├── seed_data.sql               # Demo data for Bono Region
└── README.md                   # This file
```

## Quick Start

```bash
# 1. Create the database
createdb ghanamarket

# 2. Run the migration
psql -U postgres -d ghanamarket -f database/migration_001_initial.sql

# 3. Seed demo data
psql -U postgres -d ghanamarket -f database/seed_data.sql
```

**With Node.js (node-postgres):**
```js
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(fs.readFileSync('./database/migration_001_initial.sql', 'utf8'));
await client.query(fs.readFileSync('./database/seed_data.sql', 'utf8'));
```

**With Knex.js:**
```js
await knex.raw(fs.readFileSync('./database/migration_001_initial.sql', 'utf8'));
```

---

## Design Decisions

### 1. Currency: Pesewas (Integer) over GHS (Decimal)

All monetary values are stored as **INTEGER in pesewas** (1 GHS = 100 pesewas).

| Approach | Problem |
|---|---|
| `DECIMAL(12,2)` | Arithmetic rounding issues accumulate over thousands of transactions |
| `FLOAT` | Binary representation cannot exactly represent 0.10, 0.30, etc. |
| **`INTEGER` (pesewas)** ✅ | Exact arithmetic, no rounding, fast comparisons |

Display conversion: `price_ghs = price_pesewas / 100`.
Products and orders include auto-computed `*_ghs` columns (PostgreSQL `GENERATED ALWAYS AS ... STORED`).

### 2. UUID Primary Keys

UUIDs are used instead of `SERIAL`/`BIGSERIAL` because:
- **No enumeration attacks** — sequential IDs leak total count
- **Client-side generation** — mobile/offline can create IDs before sync
- **Multi-service safety** — no collision risk across microservices
- **PostgreSQL `gen_random_uuid()`** — native, no extension needed beyond pgcrypto

### 3. TIMESTAMP WITH TIME ZONE

All datetime columns use `TIMESTAMPTZ` to:
- Store UTC internally
- Automatically convert to client timezone
- Avoid daylight-saving ambiguity (Ghana is GMT+0, no DST)

### 4. Role Architecture

The `user_roles` table supports **multiple roles per user**:

| Pattern | Rationale |
|---|---|
| Single `role` column on users | ❌ Limits to one role |
| RBAC table | ✅ A seller can also be a buyer |
| Bitfield | ❌ Hard to query and extend |

The `user_roles` table has a `UNIQUE(user_id, role)` constraint to prevent duplicate assignments.

### 5. Seller Onboarding Flow

```
buyer → seller_application (PENDING) → admin reviews → APPROVED → seller_profile created
                                                     → REJECTED → rejection_reason set
```

The `seller_applications` table preserves the full application record even after approval, for audit/compliance purposes.

### 6. Foreign Key ON DELETE Behaviors

| Relationship | Behavior | Reason |
|---|---|---|
| User → Addresses | `CASCADE` | Delete user = delete their addresses |
| User → Orders | `RESTRICT` (implicit) | Cannot delete user with orders |
| Product → Seller | `SET NULL` | Deleting seller preserves product history |
| Order → Order Items | `CASCADE` | Delete order = delete items |
| Payout → Seller | `RESTRICT` | Cannot delete seller with pending payouts |

---

## Ghana-Specific Fields

### Ghana Card
- Format: `GHA-XXXXXXXXX-X` (validated by `CHECK` constraint)
- Stored in `seller_applications.ghana_card_number`
- National ID issued by NIA (National Identification Authority)

### GRA TIN (Taxpayer Identification Number)
- Format: `C00XXXXXXXX` (business) or `P00XXXXXXXX` (personal)
- Required for VAT-registered businesses
- Stored in `seller_applications.tin_number` and `seller_profiles.tax_id`

### GhanaPost GPS
- Format: `XX-XXXX-XXXX` (e.g., `BS-0042-6789` for Bono-Sunyani)
- Prefix identifies region (GA = Greater Accra, BS = Bono-Sunyani, etc.)
- Stored in `addresses.gps_address` and `orders.delivery_gps_address`

### Mobile Money (MoMo)
Three networks supported via `momo_network` enum:

| Network | Enum Value | Market Share | Notes |
|---|---|---|---|
| MTN Mobile Money | `mtn` | ~60% | Dominant network, most users |
| Telecel Cash | `telecel` | ~20% | Formerly Vodafone Cash |
| AirtelTigo Money | `airteltigo` | ~15% | Merged network |

MoMo is used for both **payments** (`payments.momo_network`) and **seller payouts** (`seller_payouts.mobile_money_network`).

### Ghana Administrative Regions (16)
Stored as `VARCHAR(100)` with no enum constraint for flexibility:

| Region | Capital | GPS Prefix |
|---|---|---|
| Greater Accra | Accra | GA |
| Ashanti | Kumasi | AK |
| **Bono** | **Sunyani** | **BS** |
| Bono East | Techiman | BT |
| Ahafo | Goaso | AG |
| Western | Sekondi-Takoradi | WS |
| Western North | Sefwi Wiawso | WN |
| Central | Cape Coast | CC |
| Eastern | Koforidua | EK |
| Volta | Ho | VH |
| Oti | Dambai | OD |
| Northern | Tamale | NT |
| Savannah | Damongo | SD |
| North East | Nalerigu | NE |
| Upper East | Bolgatanga | UE |
| Upper West | Wa | UW |

---

## Indexes Strategy

| Category | Index | Purpose |
|---|---|---|
| **Lookup** | `users.email`, `products.slug`, `orders.order_number` | Direct lookups |
| **Filtering** | `products.is_active`, `seller_profiles.is_active` | Partial index (WHERE TRUE) |
| **Joins** | `order_items.order_id`, `seller_orders.seller_id` | Foreign key joins |
| **Sorting** | `products.created_at`, `orders.created_at` | Pagination/ordering |
| **Analytics** | `seller_orders.created_at`, `seller_orders.status` | Dashboard queries |

Partial indexes (e.g., `WHERE is_active = TRUE`) reduce index size since most queries filter for active records.

---

## GDPR Compliance

| Concern | Implementation |
|---|---|
| **Data minimization** | Only required PII is collected |
| **Right to erasure** | `ON DELETE CASCADE` on user-linked tables |
| **Soft delete** | `account_status = 'deactivated'` preserves order history |
| **Audit trail** | `created_at`, `updated_at` on all tables |
| **PII encryption** | Schema stores PII as-is; **encrypt at application level** or use pgcrypto |
| **Consent** | Not in schema — implement at application level |

> **Note:** For production, encrypt PII fields (email, phone, Ghana Card, TIN) using application-level encryption (AES-256) or PostgreSQL's `pgcrypto` extension.

---

## Seed Data (Bono Region)

The `seed_data.sql` seeds the database with data specific to **Bono Region** (capital: Sunyani):

- **23 categories** (10 parent + 13 children), including Agriculture & Farming
- **3 demo users**: admin, buyer in Sunyani, seller in Sunyani
- **6 products**: Fresh Pona Yams, Kente Cloth, Organic Cocoa, Raw Cashews, Farm Cutlass, Shea Butter
- **1 approved seller application** with Ghana Card + TIN
- **1 seller profile** with MTN MoMo payout details
- **GhanaPost GPS addresses**: `BS-0042-6789`, `BS-0015-3456`
- **Welcome coupon**: `AKWAABA10` (10% off — "Akwaaba" = "Welcome" in Akan)

---

## Relationship with Prisma Schema

This project also uses **Prisma ORM** (`prisma/schema.prisma`) for the application layer. The SQL schema in this directory is:

1. **Reference documentation** — canonical SQL DDL for the database design
2. **Migration alternative** — for teams preferring raw SQL over Prisma Migrate
3. **New tables** — includes `user_roles`, `seller_applications`, and `seller_payouts` which may not yet be in the Prisma schema
4. **DBA-friendly** — reviewable by database administrators without Prisma knowledge

To sync changes back to Prisma: `npx prisma db pull`
