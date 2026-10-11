CREATE TABLE IF NOT EXISTS settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(80)  NOT NULL UNIQUE,
  value       TEXT         NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS idx_audit_user_time   ON audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_module_time ON audit_logs (module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_record      ON audit_logs (record_id);

CREATE TABLE IF NOT EXISTS permissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role       VARCHAR(20) NOT NULL
             CHECK (role IN ('super_admin','admin','accountant','viewer')),
  module     VARCHAR(40) NOT NULL,
  can_create BOOLEAN NOT NULL DEFAULT FALSE,
  can_read   BOOLEAN NOT NULL DEFAULT FALSE,
  can_update BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (role, module)
);
