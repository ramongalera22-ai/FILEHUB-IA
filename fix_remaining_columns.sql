-- Fix remaining missing columns found in audit

-- 1. IDEAS: missing 'priority'
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- 2. NUTRITION_PLANS: code inserts upload_date, type, url (used as file upload)
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS upload_date TEXT;
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'plan';
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';

-- 3. VOICE_NOTES table (if not created yet)
CREATE TABLE IF NOT EXISTS voice_notes (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    transcription TEXT NOT NULL DEFAULT '',
    ai_summary TEXT DEFAULT '',
    ai_category TEXT DEFAULT 'idea',
    ai_action_items TEXT DEFAULT '',
    duration_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new',
    tags TEXT DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "voice_notes_own" ON voice_notes;
CREATE POLICY "voice_notes_own" ON voice_notes FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_user ON voice_notes(user_id);

-- Verify all tables
SELECT table_name, COUNT(*) as cols
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- 4. SHARED_HUB_ACTIVITIES: content needs to be JSONB, not TEXT
ALTER TABLE shared_hub_activities ALTER COLUMN content TYPE JSONB USING content::jsonb;
