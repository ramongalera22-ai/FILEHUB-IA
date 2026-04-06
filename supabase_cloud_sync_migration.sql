-- ═══════════════════════════════════════════════════════════════
-- FILEHUB-IA — Migration: Full Cloud Sync Support
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/igvadjgjpyuvzailjqwg/sql
-- ═══════════════════════════════════════════════════════════════

-- 1. user_data table for localStorage cloud sync (CloudSync service)
CREATE TABLE IF NOT EXISTS user_data (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, key)
);
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_data_own" ON user_data;
CREATE POLICY "user_data_own" ON user_data FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_user_key ON user_data(user_id, key);

-- 2. Add source column to calendar_events if missing
DO $$ BEGIN
  ALTER TABLE calendar_events ADD COLUMN source TEXT DEFAULT 'manual';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. patient_notes table (for cross-device patient notes sync)
CREATE TABLE IF NOT EXISTS patient_notes (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id TEXT DEFAULT '',
    patient_name TEXT DEFAULT '',
    content TEXT DEFAULT '',
    category TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "patient_notes_own" ON patient_notes;
CREATE POLICY "patient_notes_own" ON patient_notes FOR ALL USING (auth.uid() = user_id);

-- 4. Add missing columns to other tables if needed
DO $$ BEGIN ALTER TABLE tasks ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE calendar_events ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE expenses ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE goals ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 5. Enable realtime for key tables (optional but useful)
-- ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
-- ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
-- ALTER PUBLICATION supabase_realtime ADD TABLE patient_notes;
-- ALTER PUBLICATION supabase_realtime ADD TABLE user_data;

SELECT 'Migration complete ✅' AS status;
