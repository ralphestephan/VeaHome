ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS layout_path TEXT,
    ADD COLUMN IF NOT EXISTS accent_color VARCHAR(50),
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_rooms_layout_path ON rooms((layout_path IS NOT NULL));
