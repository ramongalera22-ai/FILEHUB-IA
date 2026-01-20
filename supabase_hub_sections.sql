-- Create hub_sections table for PISO BARCELONA, ACTIVIDADES, and COMPRAS
CREATE TABLE IF NOT EXISTS hub_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partnership_id UUID NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (name IN ('PISO BARCELONA', 'ACTIVIDADES', 'COMPRAS')),
    notebook_url TEXT,
    open_notebook_url TEXT,
    board_content TEXT DEFAULT '',
    whiteboard_data TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(partnership_id, name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_hub_sections_partnership ON hub_sections(partnership_id);

-- Enable RLS
ALTER TABLE hub_sections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their partnership's hub sections"
    ON hub_sections FOR SELECT
    USING (
        partnership_id IN (
            SELECT id FROM partnerships
            WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert hub sections for their partnerships"
    ON hub_sections FOR INSERT
    WITH CHECK (
        partnership_id IN (
            SELECT id FROM partnerships
            WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their partnership's hub sections"
    ON hub_sections FOR UPDATE
    USING (
        partnership_id IN (
            SELECT id FROM partnerships
            WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their partnership's hub sections"
    ON hub_sections FOR DELETE
    USING (
        partnership_id IN (
            SELECT id FROM partnerships
            WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hub_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER hub_sections_updated_at
    BEFORE UPDATE ON hub_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_hub_sections_updated_at();
