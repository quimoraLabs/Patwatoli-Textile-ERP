CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id  UUID          NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_mode VARCHAR(10)   NOT NULL CHECK (payment_mode IN ('cash','bank','upi')),
  payment_date DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_merchant_date ON payments (merchant_id, payment_date DESC);

CREATE TABLE IF NOT EXISTS ledger (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id      UUID          NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  transaction_type VARCHAR(20)   NOT NULL
                   CHECK (transaction_type IN ('invoice','payment','adjustment')),
  reference_id     UUID          NOT NULL,
  debit            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (debit  >= 0),
  credit           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  balance          NUMERIC(12,2) NOT NULL,
  entry_date       DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CHECK ( (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) )
);

CREATE INDEX IF NOT EXISTS idx_ledger_merchant_created ON ledger (merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON ledger (reference_id);
