ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_cancel_fields'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT chk_invoices_cancel_fields CHECK (
      (status = 'active' AND cancelled_at IS NULL AND cancel_reason IS NULL) OR
      (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL)
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);

ALTER TABLE ledger DROP CONSTRAINT IF EXISTS ledger_transaction_type_check;
ALTER TABLE ledger ADD CONSTRAINT ledger_transaction_type_check
  CHECK (transaction_type IN ('invoice', 'payment', 'adjustment', 'invoice_cancel'));
