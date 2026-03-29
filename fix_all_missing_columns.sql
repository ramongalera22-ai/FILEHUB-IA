-- ═══════════════════════════════════════════════════════════════
-- FILEHUB — Fix ALL missing columns (run after initial schema)
-- Project: igvadjgjpyuvzailjqwg
-- ═══════════════════════════════════════════════════════════════

-- 1. VIP_TASKS — missing: is_recurring, frequency, pinned
ALTER TABLE vip_tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE vip_tasks ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE vip_tasks ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;

-- 2. GOALS — missing: unit, status
ALTER TABLE goals ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. PROJECTS — missing: budget, spent, notebook_url
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS spent NUMERIC DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notebook_url TEXT DEFAULT '';

-- 4. SHOPPING_ITEMS — missing: estimated_price, purchased
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS estimated_price NUMERIC DEFAULT 0;
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS purchased BOOLEAN DEFAULT false;

-- 5. FILES — missing: date, category, tags, url, ai_summary
ALTER TABLE files ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';
ALTER TABLE files ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '';
ALTER TABLE files ADD COLUMN IF NOT EXISTS ai_summary TEXT DEFAULT '';
-- url already exists in schema but make sure
ALTER TABLE files ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';

-- 6. TRIPS — missing: destination, notebook_url
ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination TEXT DEFAULT '';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS notebook_url TEXT DEFAULT '';

-- 7. TRAINING_PLANS — missing: duration_weeks, source
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS duration_weeks INTEGER DEFAULT 4;
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS source TEXT DEFAULT '';

-- 8. PRESENTATIONS — missing: client, due_date, priority (schema had slides/status)
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS client TEXT DEFAULT '';
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS upload_date TEXT;
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'presentation';
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';

-- 9. TASKS — missing: is_recurring (might be there but double-check)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- 10. SHOPPING_ORDERS — missing: items as JSONB
ALTER TABLE shopping_orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';

-- 11. NUTRITION_PLANS — ensure meals is JSONB
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS target_calories NUMERIC DEFAULT 2000;

-- 12. SHARED_HUB_ACTIVITIES — missing: action, content as JSONB
ALTER TABLE shared_hub_activities ADD COLUMN IF NOT EXISTS action TEXT DEFAULT '';

-- 13. PARTNERSHIPS — missing: user2_email
ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS user2_email TEXT;

-- 14. IDEAS — missing: status  
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';

-- ═══ VERIFY ═══
SELECT table_name, COUNT(*) as columns 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('vip_tasks','goals','projects','shopping_items','files','trips','training_plans','presentations','tasks','ideas','partnerships')
GROUP BY table_name 
ORDER BY table_name;
