-- Migration 006: Fix Hub Architecture
-- Hubs are now smart devices with brains (AirGuard, VeaHub, Tuya, eWelink)
-- Devices are dumb appliances (AC, TV, blinds) controlled by hubs

-- 1. Add room_id to hubs (each hub belongs to ONE room)
ALTER TABLE hubs 
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;

-- 2. Add brand, type, and metadata to hubs
ALTER TABLE hubs
  ADD COLUMN IF NOT EXISTS brand VARCHAR(100) DEFAULT 'vealive',
  ADD COLUMN IF NOT EXISTS hub_type VARCHAR(50) DEFAULT 'ir_blaster',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Make devices.room_id nullable (device room can be inherited from hub)
ALTER TABLE devices 
  ALTER COLUMN room_id DROP NOT NULL;

-- 4. Keep hub_id NOT NULL (all devices must belong to a hub)
-- No change needed - devices.hub_id stays NOT NULL

-- 5. Drop hub_rooms junction table (no longer needed)
DROP TABLE IF EXISTS hub_rooms CASCADE;

-- 6. Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_hubs_room_id ON hubs(room_id);
CREATE INDEX IF NOT EXISTS idx_hubs_brand ON hubs(brand);
CREATE INDEX IF NOT EXISTS idx_hubs_hub_type ON hubs(hub_type);

-- 7. Update existing AirGuard devices to be hubs instead
-- First, create hub entries for existing AirGuard devices
INSERT INTO hubs (id, home_id, room_id, serial_number, name, brand, hub_type, status)
SELECT 
  id,
  home_id,
  room_id,
  COALESCE((signal_mappings->>'smartMonitorId')::text, 'airguard_' || id::text),
  name,
  'vealive',
  'airguard',
  CASE WHEN is_active THEN 'online' ELSE 'offline' END
FROM devices
WHERE type = 'airguard'
ON CONFLICT (serial_number) DO NOTHING;

-- Delete the old airguard "devices" (they're now hubs)
DELETE FROM devices WHERE type = 'airguard';

-- 8. Add comments for clarity
COMMENT ON TABLE hubs IS 'Smart devices with processors (AirGuard, VeaHub, Tuya, eWelink) - can run automations independently';
COMMENT ON TABLE devices IS 'Dumb appliances (AC, TV, blinds, lights) controlled by hubs';
COMMENT ON COLUMN hubs.room_id IS 'Room where this hub is physically located';
COMMENT ON COLUMN hubs.brand IS 'Hub manufacturer: vealive, tuya, ewelink, etc.';
COMMENT ON COLUMN hubs.hub_type IS 'Hub type: airguard, ir_blaster, zigbee, matter, wifi';
