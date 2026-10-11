# Database Schema (V1)

## Purpose
This document defines every V1 table with full SQL for PostgreSQL 18, including UUIDv7 primary keys, foreign keys, constraints, indexes, and virtual generated columns.

---

## 1. Conventions

| Rule | Detail |
|------|--------|
| Primary key | `id UUID PRIMARY KEY DEFAULT uuidv7()` (PostgreSQL 18 built-in) |
| Money | `NUMERIC(12,2)` — never `FLOAT` |
| Quantities | `NUMERIC(12,3)` |
| Timestamps | `TIMESTAMPTZ` stored in UTC |
| Naming | `snake_case`, plural table names |
| Soft delete | Not used in V1; deletes are restricted, history lives in `audit_logs` |
| Virtual columns | `GENERATED ALWAYS AS (...) VIRTUAL` (new default in PG 18) for derived values |

## 2. Entity Relationship Overview

```
users ──< audit_logs
users ──< settings (updated_by)

merchants ──< invoices ──< invoice_items >── item_variants >── items
merchants ──< payments
merchants ──< ledger

permissions (standalone: role + module)
```

## 3. Extensions and Helpers

```sql
-- PostgreSQL 18 provides uuidv7() natively. No extension needed.

-- Reusable trigger to maintain updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 4. Tables

### 4.1 users

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuidv7(),
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  phone         VARCHAR(15),
  password_hash TEXT          NOT NULL,
  role          VARCHAR(20)   NOT NULL
                CHECK (role IN ('super_admin','admin','accountant','viewer')),
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_users_email ON users (lower(email));
CREATE INDEX idx_users_role ON users (role);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 4.2 merchants (व्यापारी)

```sql
CREATE TABLE merchants (
  id         UUID PRIMARY KEY DEFAULT uuidv7(),
  name       VARCHAR(150) NOT NULL,
  phone      VARCHAR(15),
  address    TEXT,
  gstin      VARCHAR(15)
             CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_merchants_name ON merchants (lower(name));
CREATE UNIQUE INDEX uq_merchants_gstin ON merchants (gstin) WHERE gstin IS NOT NULL;
```

### 4.3 items

```sql
CREATE TABLE items (
  id         UUID PRIMARY KEY DEFAULT uuidv7(),
  name       VARCHAR(150) NOT NULL,
  unit       VARCHAR(10)  NOT NULL
             CHECK (unit IN ('chauka','jod','piece','meter')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_items_name ON items (lower(name));
```

### 4.4 item_variants (size-wise pricing)

```sql
CREATE TABLE item_variants (
  id         UUID PRIMARY KEY DEFAULT uuidv7(),
  item_id    UUID         NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  size       VARCHAR(5)   NOT NULL
             CHECK (size IN ('A','AA','AAA','K1','K2','K3')),
  rate       NUMERIC(12,2) NOT NULL CHECK (rate >= 0),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (item_id, size)
);

CREATE INDEX idx_item_variants_item ON item_variants (item_id);
```

### 4.5 invoices (UPDATED)

> **Update (2026-10-09):** Added status, cancelled_at, cancel_reason columns.

```sql
CREATE TABLE invoices (
  id             UUID PRIMARY KEY DEFAULT uuidv7(),
  invoice_no     VARCHAR(30)   NOT NULL UNIQUE,
  merchant_id    UUID          NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  invoice_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
  taxable_amount NUMERIC(12,2) NOT NULL CHECK (taxable_amount >= 0),
  cgst           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cgst >= 0),
  sgst           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sgst >= 0),
  -- Virtual generated column: computed on read, takes no storage
  total_amount   NUMERIC(12,2) GENERATED ALWAYS AS (taxable_amount + cgst + sgst) VIRTUAL,
  status         VARCHAR(10)   NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'cancelled')),
  cancelled_at   TIMESTAMPTZ,
  cancel_reason  TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CHECK (
    (status = 'active' AND cancelled_at IS NULL AND cancel_reason IS NULL) OR
    (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL)
  )
);

CREATE INDEX idx_invoices_merchant_date ON invoices (merchant_id, invoice_date DESC);
CREATE INDEX idx_invoices_date ON invoices (invoice_date DESC);
CREATE INDEX idx_invoices_status ON invoices (status);
```

### 4.6 invoice_items

```sql
CREATE TABLE invoice_items (
  id         UUID PRIMARY KEY DEFAULT uuidv7(),
  invoice_id UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_id    UUID          NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  variant_id UUID          NOT NULL REFERENCES item_variants(id) ON DELETE RESTRICT,
  qty        NUMERIC(12,3) NOT NULL CHECK (qty > 0),
  rate       NUMERIC(12,2) NOT NULL CHECK (rate >= 0),   -- rate snapshot at billing time
  amount     NUMERIC(12,2) GENERATED ALWAYS AS (round(qty * rate, 2)) VIRTUAL
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);
CREATE INDEX idx_invoice_items_item ON invoice_items (item_id);
```

> The `rate` is copied from `item_variants` at billing time so that future rate changes never alter old invoices.

### 4.7 payments

```sql
CREATE TABLE payments (
  id           UUID PRIMARY KEY DEFAULT uuidv7(),
  merchant_id  UUID          NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_mode VARCHAR(10)   NOT NULL CHECK (payment_mode IN ('cash','bank','upi')),
  payment_date DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_merchant_date ON payments (merchant_id, payment_date DESC);
```

### 4.8 ledger (UPDATED)

> **Update (2026-10-09):** Added 'invoice_cancel' to transaction_type CHECK.

```sql
CREATE TABLE ledger (
  id               UUID PRIMARY KEY DEFAULT uuidv7(),
  merchant_id      UUID          NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  transaction_type VARCHAR(20)   NOT NULL
                   CHECK (transaction_type IN ('invoice','payment','adjustment','invoice_cancel')),
  reference_id     UUID          NOT NULL,          -- invoice.id or payment.id
  debit            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (debit  >= 0),
  credit           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  balance          NUMERIC(12,2) NOT NULL,           -- running balance after this entry
  entry_date       DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CHECK ( (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) )
);

CREATE INDEX idx_ledger_merchant_created ON ledger (merchant_id, created_at DESC);
CREATE INDEX idx_ledger_reference ON ledger (reference_id);
```

**Balance meaning:** positive = merchant owes you (Outstanding), negative = Advance.

### 4.9 settings

```sql
CREATE TABLE settings (
  id          UUID PRIMARY KEY DEFAULT uuidv7(),
  key         VARCHAR(80)  NOT NULL UNIQUE,
  value       TEXT         NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

### 4.10 audit_logs

```sql
CREATE TABLE audit_logs (
  id         UUID PRIMARY KEY DEFAULT uuidv7(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(20)  NOT NULL
             CHECK (action IN ('create','update','delete','login','logout','export','backup')),
  module     VARCHAR(40)  NOT NULL,
  record_id  UUID,
  old_data   JSONB,
  new_data   JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user_time   ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_module_time ON audit_logs (module, created_at DESC);
CREATE INDEX idx_audit_record      ON audit_logs (record_id);
```

### 4.11 permissions

```sql
CREATE TABLE permissions (
  id         UUID PRIMARY KEY DEFAULT uuidv7(),
  role       VARCHAR(20) NOT NULL
             CHECK (role IN ('super_admin','admin','accountant','viewer')),
  module     VARCHAR(40) NOT NULL,
  can_create BOOLEAN NOT NULL DEFAULT FALSE,
  can_read   BOOLEAN NOT NULL DEFAULT FALSE,
  can_update BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (role, module)
);
```

## 5. Seed Data

### 5.1 Default settings

```sql
INSERT INTO settings (key, value, description) VALUES
 ('company.name',       'Patwatoli Textile',  'Company name on invoices'),
 ('company.address',    'Patwatoli, Gaya, Bihar', 'Company address'),
 ('company.gstin',      '',                   'Company GSTIN'),
 ('tax.cgst_rate',      '2.5',                'CGST percent'),
 ('tax.sgst_rate',      '2.5',                'SGST percent'),
 ('invoice.prefix',     'PTX',                'Invoice number prefix'),
 ('invoice.next_seq',   '1',                  'Next invoice sequence for current FY');
```

### 5.2 Default permissions (excerpt)

```sql
INSERT INTO permissions (role, module, can_create, can_read, can_update, can_delete) VALUES
 ('super_admin','invoices', TRUE,  TRUE,  TRUE,  TRUE),
 ('super_admin','settings', TRUE,  TRUE,  TRUE,  TRUE),
 ('admin',      'invoices', TRUE,  TRUE,  TRUE,  FALSE),
 ('admin',      'users',    TRUE,  TRUE,  TRUE,  FALSE),
 ('accountant', 'invoices', TRUE,  TRUE,  FALSE, FALSE),
 ('accountant', 'payments', TRUE,  TRUE,  FALSE, FALSE),
 ('accountant', 'reports',  FALSE, TRUE,  FALSE, FALSE),
 ('viewer',     'invoices', FALSE, TRUE,  FALSE, FALSE),
 ('viewer',     'ledger',   FALSE, TRUE,  FALSE, FALSE);
```

## 6. Useful Queries (UPDATED)

> **Update (2026-10-09):** All invoice totals exclude cancelled invoices; ledger totals account for cancellation entries.

### Current balance of a merchant
```sql
SELECT balance
FROM ledger
WHERE merchant_id = $1
ORDER BY created_at DESC, id DESC
LIMIT 1;
```

### This month's income (payments received)
```sql
SELECT COALESCE(SUM(amount), 0) AS income
FROM payments
WHERE payment_date >= date_trunc('month', CURRENT_DATE)
  AND payment_date <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
```

### This month's active sales and GST

```sql
SELECT
  COALESCE(SUM(taxable_amount), 0) AS taxable_total,
  COALESCE(SUM(cgst + sgst), 0)    AS tax_total,
  COALESCE(SUM(total_amount), 0)   AS grand_total
FROM invoices
WHERE status = 'active'
  AND invoice_date >= date_trunc('month', CURRENT_DATE)
  AND invoice_date <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
```

### Total outstanding and advance

```sql
WITH latest AS (
  SELECT DISTINCT ON (merchant_id) merchant_id, balance
  FROM ledger
  ORDER BY merchant_id, created_at DESC, id DESC
)
SELECT
  COALESCE(SUM(balance) FILTER (WHERE balance > 0), 0)  AS outstanding,
  COALESCE(-SUM(balance) FILTER (WHERE balance < 0), 0) AS advance
FROM latest;
```

## 7. Migration Files (UPDATED)

> **Update (2026-10-09):** Added migration 000008.

```
backend/migrations/
├── 000001_init_extensions_and_helpers.up.sql
├── 000002_create_users.up.sql
├── 000003_create_merchants_items_variants.up.sql
├── 000004_create_invoices_and_items.up.sql
├── 000005_create_payments_and_ledger.up.sql
├── 000006_create_settings_audit_permissions.up.sql
├── 000007_seed_defaults.up.sql
└── 000008_add_invoice_cancel.up.sql
```

Each `.up.sql` has a matching `.down.sql`. Run with `golang-migrate`.

#### `000008_add_invoice_cancel.up.sql`

```sql
ALTER TABLE invoices
  ADD COLUMN status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  ADD COLUMN cancelled_at TIMESTAMPTZ,
  ADD COLUMN cancel_reason TEXT,
  ADD CONSTRAINT chk_invoices_cancel_fields CHECK (
    (status = 'active' AND cancelled_at IS NULL AND cancel_reason IS NULL) OR
    (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL)
  );

CREATE INDEX idx_invoices_status ON invoices (status);

ALTER TABLE ledger DROP CONSTRAINT IF EXISTS ledger_transaction_type_check;
ALTER TABLE ledger ADD CONSTRAINT ledger_transaction_type_check
  CHECK (transaction_type IN ('invoice', 'payment', 'adjustment', 'invoice_cancel'));
```

#### `000008_add_invoice_cancel.down.sql`

```sql
DROP INDEX IF EXISTS idx_invoices_status;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS chk_invoices_cancel_fields,
  DROP COLUMN IF EXISTS cancel_reason,
  DROP COLUMN IF EXISTS cancelled_at,
  DROP COLUMN IF EXISTS status;

ALTER TABLE ledger DROP CONSTRAINT IF EXISTS ledger_transaction_type_check;
ALTER TABLE ledger ADD CONSTRAINT ledger_transaction_type_check
  CHECK (transaction_type IN ('invoice', 'payment', 'adjustment'));
```

## 8. Notes and Rules

- Never update or delete ledger rows. Corrections are new `adjustment` entries.
- Invoices should be cancelled by a reversing ledger entry, not deleted.
- Virtual generated columns cannot be indexed in PostgreSQL 18. Use stored columns if an index is needed on a derived value later.
- Back up with `pg_dump` (see `DEVELOPMENT_GUIDE.md`).