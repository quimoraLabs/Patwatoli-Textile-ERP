CREATE TABLE IF NOT EXISTS invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no     VARCHAR(30)   NOT NULL UNIQUE,
  merchant_id    UUID          NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  invoice_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
  taxable_amount NUMERIC(12,2) NOT NULL CHECK (taxable_amount >= 0),
  cgst           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cgst >= 0),
  sgst           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sgst >= 0),
  total_amount   NUMERIC(12,2) GENERATED ALWAYS AS (taxable_amount + cgst + sgst) STORED,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_merchant_date ON invoices (merchant_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices (invoice_date DESC);

CREATE TABLE IF NOT EXISTS invoice_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_id    UUID          NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  variant_id UUID          NOT NULL REFERENCES item_variants(id) ON DELETE RESTRICT,
  qty        NUMERIC(12,3) NOT NULL CHECK (qty > 0),
  rate       NUMERIC(12,2) NOT NULL CHECK (rate >= 0),
  amount     NUMERIC(12,2) GENERATED ALWAYS AS (round(qty * rate, 2)) STORED
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_item ON invoice_items (item_id);
