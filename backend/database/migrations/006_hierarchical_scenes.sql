-- Migration: Add hierarchical scene support
-- Add scope, room_ids, and device_type_rules to scenes table

ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'home',
ADD COLUMN IF NOT EXISTS room_ids TEXT[],
ADD COLUMN IF NOT EXISTS device_type_rules JSONB DEFAULT '[]'::jsonb;

-- Add index for scope queries
CREATE INDEX IF NOT EXISTS idx_scenes_scope ON scenes(scope);

-- Add comment
COMMENT ON COLUMN scenes.scope IS 'Scene scope: home (entire home) or rooms (specific rooms)';
COMMENT ON COLUMN scenes.room_ids IS 'Array of room IDs when scope is rooms';
COMMENT ON COLUMN scenes.device_type_rules IS 'Array of device type rules with mode (all/specific) and state configuration';
