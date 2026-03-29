CREATE TABLE IF NOT EXISTS dashboard_tasks (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dashboard_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dashboard_tasks_own" ON dashboard_tasks;
CREATE POLICY "dashboard_tasks_own" ON dashboard_tasks FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_tasks_user ON dashboard_tasks(user_id);
