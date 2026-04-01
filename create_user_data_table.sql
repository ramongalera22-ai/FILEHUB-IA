-- Universal key-value store for ALL localStorage data
-- This single table syncs everything from every component
CREATE TABLE IF NOT EXISTS user_data (
    id BIGSERIAL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, key)
);
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_data_own" ON user_data;
CREATE POLICY "user_data_own" ON user_data FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_user ON user_data(user_id);
