DROP INDEX IF EXISTS idx_invoices_status;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS chk_invoices_cancel_fields,
  DROP COLUMN IF EXISTS cancel_reason,
  DROP COLUMN IF EXISTS cancelled_at,
  DROP COLUMN IF EXISTS status;

ALTER TABLE ledger DROP CONSTRAINT IF EXISTS ledger_transaction_type_check;
ALTER TABLE ledger ADD CONSTRAINT ledger_transaction_type_check
  CHECK (transaction_type IN ('invoice', 'payment', 'adjustment'));
