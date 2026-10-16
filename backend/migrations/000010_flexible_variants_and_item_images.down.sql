-- 000010_flexible_variants_and_item_images.down.sql

ALTER TABLE item_variants DROP COLUMN IF EXISTS image_url;
ALTER TABLE items DROP COLUMN IF EXISTS description;
ALTER TABLE items DROP COLUMN IF EXISTS category;
ALTER TABLE items DROP COLUMN IF EXISTS image_url;
