-- 000010_flexible_variants_and_item_images.up.sql

-- 1. Drop rigid size check constraint on item_variants
ALTER TABLE item_variants DROP CONSTRAINT IF EXISTS item_variants_size_check;

-- 2. Expand size column length to allow custom names, types, threads (e.g. 'Chhota', 'Bada', 'Printed Red 52x90')
ALTER TABLE item_variants ALTER COLUMN size TYPE VARCHAR(100);

-- 3. Add image_url to items for Gamcha/Chadar designs and patterns
ALTER TABLE items ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 4. Add category and description to items (e.g. Chadar, Gamcha, Dhoti, Saree)
ALTER TABLE items ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS description TEXT;

-- 5. Add optional image_url to individual variants (for distinct print colors)
ALTER TABLE item_variants ADD COLUMN IF NOT EXISTS image_url TEXT;
