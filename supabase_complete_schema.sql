-- ═══════════════════════════════════════════════════════════════
-- FILEHUB-IA — Complete Supabase Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- Project: xlbtwjxyphqnjeugfxds
-- ═══════════════════════════════════════════════════════════════

-- 1. PROFILES (user accounts + settings)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_own" ON profiles;
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

-- 2. TASKS
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    category TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'medium',
    due_date TEXT,
    is_recurring BOOLEAN DEFAULT false,
    frequency TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_own" ON tasks;
CREATE POLICY "tasks_own" ON tasks FOR ALL USING (auth.uid() = user_id);

-- 3. VIP_TASKS
CREATE TABLE IF NOT EXISTS vip_tasks (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    completed BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'high',
    due_date TEXT,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vip_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vip_tasks_own" ON vip_tasks;
CREATE POLICY "vip_tasks_own" ON vip_tasks FOR ALL USING (auth.uid() = user_id);

-- 4. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    vendor TEXT DEFAULT '',
    date TEXT,
    category TEXT DEFAULT 'otros',
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium',
    is_recurring BOOLEAN DEFAULT false,
    frequency TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_own" ON expenses;
CREATE POLICY "expenses_own" ON expenses FOR ALL USING (auth.uid() = user_id);

-- 5. CALENDAR_EVENTS
CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    type TEXT DEFAULT 'event',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calendar_events_own" ON calendar_events;
CREATE POLICY "calendar_events_own" ON calendar_events FOR ALL USING (auth.uid() = user_id);

-- 6. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    progress NUMERIC DEFAULT 0,
    deadline TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_own" ON projects;
CREATE POLICY "projects_own" ON projects FOR ALL USING (auth.uid() = user_id);

-- 7. GOALS
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_date TEXT,
    current_value NUMERIC DEFAULT 0,
    target_value NUMERIC DEFAULT 100,
    category TEXT DEFAULT 'personal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goals_own" ON goals;
CREATE POLICY "goals_own" ON goals FOR ALL USING (auth.uid() = user_id);

-- 8. IDEAS
CREATE TABLE IF NOT EXISTS ideas (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'general',
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ideas_own" ON ideas;
CREATE POLICY "ideas_own" ON ideas FOR ALL USING (auth.uid() = user_id);

-- 9. DEBTS
CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_amount NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    due_date TEXT,
    category TEXT DEFAULT 'personal',
    interest_rate NUMERIC DEFAULT 0,
    creditor TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "debts_own" ON debts;
CREATE POLICY "debts_own" ON debts FOR ALL USING (auth.uid() = user_id);

-- 10. INVESTMENTS
CREATE TABLE IF NOT EXISTS investments (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    date TEXT,
    status TEXT DEFAULT 'active',
    category TEXT DEFAULT 'stocks',
    expected_return NUMERIC DEFAULT 0,
    current_value NUMERIC DEFAULT 0,
    purchase_price NUMERIC DEFAULT 0,
    quantity NUMERIC DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "investments_own" ON investments;
CREATE POLICY "investments_own" ON investments FOR ALL USING (auth.uid() = user_id);

-- 11. SHOPPING_ITEMS
CREATE TABLE IF NOT EXISTS shopping_items (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity NUMERIC DEFAULT 1,
    category TEXT DEFAULT 'general',
    completed BOOLEAN DEFAULT false,
    store TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shopping_items_own" ON shopping_items;
CREATE POLICY "shopping_items_own" ON shopping_items FOR ALL USING (auth.uid() = user_id);

-- 12. SHOPPING_ORDERS
CREATE TABLE IF NOT EXISTS shopping_orders (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]',
    store TEXT DEFAULT '',
    total NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shopping_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shopping_orders_own" ON shopping_orders;
CREATE POLICY "shopping_orders_own" ON shopping_orders FOR ALL USING (auth.uid() = user_id);

-- 13. TRIPS
CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    budget NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'planned',
    notes TEXT DEFAULT '',
    itinerary JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trips_own" ON trips;
CREATE POLICY "trips_own" ON trips FOR ALL USING (auth.uid() = user_id);

-- 14. HABITS
CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    emoji TEXT DEFAULT '✅',
    color TEXT DEFAULT '#4f46e5',
    goal INTEGER DEFAULT 1,
    completions TEXT DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habits_own" ON habits;
CREATE POLICY "habits_own" ON habits FOR ALL USING (auth.uid() = user_id);

-- 15. WEIGHT_ENTRIES
CREATE TABLE IF NOT EXISTS weight_entries (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    weight NUMERIC NOT NULL,
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weight_entries_own" ON weight_entries;
CREATE POLICY "weight_entries_own" ON weight_entries FOR ALL USING (auth.uid() = user_id);

-- 16. NUTRITION_PLANS
CREATE TABLE IF NOT EXISTS nutrition_plans (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    meals JSONB DEFAULT '[]',
    target_calories NUMERIC DEFAULT 2000,
    date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nutrition_plans_own" ON nutrition_plans;
CREATE POLICY "nutrition_plans_own" ON nutrition_plans FOR ALL USING (auth.uid() = user_id);

-- 17. TRAINING_SESSIONS
CREATE TABLE IF NOT EXISTS training_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TEXT,
    type TEXT DEFAULT 'strength',
    duration INTEGER DEFAULT 60,
    intensity TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'planned',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "training_sessions_own" ON training_sessions;
CREATE POLICY "training_sessions_own" ON training_sessions FOR ALL USING (auth.uid() = user_id);

-- 18. TRAINING_PLANS
CREATE TABLE IF NOT EXISTS training_plans (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    exercises JSONB DEFAULT '[]',
    schedule JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "training_plans_own" ON training_plans;
CREATE POLICY "training_plans_own" ON training_plans FOR ALL USING (auth.uid() = user_id);

-- 19. FILES
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'file',
    url TEXT DEFAULT '',
    size NUMERIC DEFAULT 0,
    folder TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "files_own" ON files;
CREATE POLICY "files_own" ON files FOR ALL USING (auth.uid() = user_id);

-- 20. PRESENTATIONS
CREATE TABLE IF NOT EXISTS presentations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slides JSONB DEFAULT '[]',
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "presentations_own" ON presentations;
CREATE POLICY "presentations_own" ON presentations FOR ALL USING (auth.uid() = user_id);

-- 21. PARTNERSHIPS (shared between 2 users)
CREATE TABLE IF NOT EXISTS partnerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user2_email TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partnerships_own" ON partnerships;
CREATE POLICY "partnerships_own" ON partnerships FOR ALL
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 22. SHARED_EXPENSES
CREATE TABLE IF NOT EXISTS shared_expenses (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    vendor TEXT DEFAULT '',
    date TEXT,
    category TEXT DEFAULT 'otros',
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium',
    paid_by TEXT DEFAULT '',
    split_between TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shared_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shared_expenses_own" ON shared_expenses;
CREATE POLICY "shared_expenses_own" ON shared_expenses FOR ALL USING (auth.uid() = user_id);

-- 23. SHARED_DEBTS
CREATE TABLE IF NOT EXISTS shared_debts (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "from" TEXT DEFAULT '',
    "to" TEXT DEFAULT '',
    amount NUMERIC DEFAULT 0,
    description TEXT DEFAULT '',
    date TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shared_debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shared_debts_own" ON shared_debts;
CREATE POLICY "shared_debts_own" ON shared_debts FOR ALL USING (auth.uid() = user_id);

-- 24. SHARED_HUB_ACTIVITIES
CREATE TABLE IF NOT EXISTS shared_hub_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partnership_id UUID REFERENCES partnerships(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'activity',
    content TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shared_hub_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shared_hub_activities_own" ON shared_hub_activities;
CREATE POLICY "shared_hub_activities_own" ON shared_hub_activities FOR ALL
    USING (
        auth.uid() = user_id OR
        partnership_id IN (SELECT id FROM partnerships WHERE user1_id = auth.uid() OR user2_id = auth.uid())
    );

-- 25. SHARED_DOCUMENTS
CREATE TABLE IF NOT EXISTS shared_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partnership_id UUID REFERENCES partnerships(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT DEFAULT '',
    type TEXT DEFAULT 'document',
    size NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shared_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shared_documents_own" ON shared_documents;
CREATE POLICY "shared_documents_own" ON shared_documents FOR ALL
    USING (
        auth.uid() = user_id OR
        partnership_id IN (SELECT id FROM partnerships WHERE user1_id = auth.uid() OR user2_id = auth.uid())
    );

-- 26. HUB_SECTIONS
CREATE TABLE IF NOT EXISTS hub_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partnership_id UUID NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    notebook_url TEXT,
    open_notebook_url TEXT,
    board_content TEXT DEFAULT '',
    whiteboard_data TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(partnership_id, name)
);
ALTER TABLE hub_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hub_sections_own" ON hub_sections;
CREATE POLICY "hub_sections_own" ON hub_sections FOR ALL
    USING (
        partnership_id IN (SELECT id FROM partnerships WHERE user1_id = auth.uid() OR user2_id = auth.uid())
    );

-- 27. FAVORITE_PISOS (for WhatsApp bot)
CREATE TABLE IF NOT EXISTS favorite_pisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    piso_id TEXT,
    url TEXT,
    titulo TEXT,
    precio NUMERIC,
    m2 NUMERIC,
    zona TEXT,
    portal TEXT DEFAULT 'idealista',
    contactado BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE favorite_pisos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "favorite_pisos_own" ON favorite_pisos;
CREATE POLICY "favorite_pisos_own" ON favorite_pisos FOR ALL USING (auth.uid() = user_id);

-- ═══ INDEXES ═══
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_tasks_user ON vip_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_user ON training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_entries_user ON weight_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_hub_partnership ON shared_hub_activities(partnership_id);

-- ═══ DONE ═══
-- All 27 tables created with RLS policies
-- Each user can only access their own data
