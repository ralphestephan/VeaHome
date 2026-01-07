-- Tuya Integrations table
CREATE TABLE tuya_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tuya_user_id VARCHAR(255) NOT NULL, -- Tuya's user ID
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    region VARCHAR(50) DEFAULT 'us', -- us, eu, cn, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tuya_user_id)
);

-- Tuya Devices table (stores devices from Tuya cloud)
CREATE TABLE tuya_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES tuya_integrations(id) ON DELETE CASCADE,
    home_id UUID REFERENCES homes(id) ON DELETE SET NULL, -- Optional: link to a home
    tuya_device_id VARCHAR(255) NOT NULL, -- Tuya's device ID
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- e.g., "light", "switch", "sensor"
    product_id VARCHAR(255),
    online BOOLEAN DEFAULT false,
    capabilities JSONB, -- Device capabilities/schema
    state JSONB, -- Current device state
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(integration_id, tuya_device_id)
);

CREATE INDEX idx_tuya_integrations_user_id ON tuya_integrations(user_id);
CREATE INDEX idx_tuya_devices_integration_id ON tuya_devices(integration_id);
CREATE INDEX idx_tuya_devices_home_id ON tuya_devices(home_id);


