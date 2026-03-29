-- Fix vip_tasks table — add missing columns
ALTER TABLE vip_tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE vip_tasks ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE vip_tasks ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;

-- Also fix the description column to allow longer text
ALTER TABLE vip_tasks ALTER COLUMN description TYPE TEXT;

-- Verify
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vip_tasks' ORDER BY ordinal_position;
