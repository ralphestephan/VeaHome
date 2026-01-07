-- Tuya Device Readings table (stores historical device states for monitoring)
CREATE TABLE IF NOT EXISTS tuya_device_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES tuya_devices(id) ON DELETE CASCADE,
    state JSONB NOT NULL, -- Device state at this point in time
    online BOOLEAN NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tuya_device_readings_device_id ON tuya_device_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_tuya_device_readings_recorded_at ON tuya_device_readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_tuya_device_readings_device_recorded ON tuya_device_readings(device_id, recorded_at DESC);

-- Partitioning by month for better performance (optional, can be added later)
-- This allows efficient cleanup of old data


