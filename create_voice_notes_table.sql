-- Voice Notes table for FILEHUB
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
