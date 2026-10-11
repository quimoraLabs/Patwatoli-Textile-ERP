CREATE TABLE IF NOT EXISTS merchants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(150) NOT NULL,
  phone      VARCHAR(15),
  address    TEXT,
  gstin      VARCHAR(15)
             CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchants_name ON merchants (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS uq_merchants_gstin ON merchants (gstin) WHERE gstin IS NOT NULL;

CREATE TABLE IF NOT EXISTS items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(150) NOT NULL,
  unit       VARCHAR(10)  NOT NULL
             CHECK (unit IN ('chauka','jod','piece','meter')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_items_name ON items (lower(name));

CREATE TABLE IF NOT EXISTS item_variants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    UUID          NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  size       VARCHAR(5)    NOT NULL
             CHECK (size IN ('A','AA','AAA','K1','K2','K3')),
  rate       NUMERIC(12,2) NOT NULL CHECK (rate >= 0),
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (item_id, size)
);

CREATE INDEX IF NOT EXISTS idx_item_variants_item ON item_variants (item_id);
