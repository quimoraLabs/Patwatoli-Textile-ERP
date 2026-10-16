DROP INDEX IF EXISTS idx_users_deletion_status;

ALTER TABLE users
  DROP COLUMN IF EXISTS scheduled_delete_at,
  DROP COLUMN IF EXISTS deletion_status;

ALTER TABLE invoices
  ALTER COLUMN invoice_date TYPE DATE USING invoice_date::date;
