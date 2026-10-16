ALTER TABLE users
  ADD COLUMN IF NOT EXISTS scheduled_delete_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_status VARCHAR(20) NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_users_deletion_status ON users (deletion_status);

ALTER TABLE invoices
  ALTER COLUMN invoice_date TYPE TIMESTAMPTZ USING invoice_date::timestamptz;
