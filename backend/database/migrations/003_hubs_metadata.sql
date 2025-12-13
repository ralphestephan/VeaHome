ALTER TABLE hubs
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255) UNIQUE,
    ADD COLUMN IF NOT EXISTS provisioning_status VARCHAR(50) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS wifi_password_enc TEXT,
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS firmware_version VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_hubs_owner_id ON hubs(owner_id);
CREATE INDEX IF NOT EXISTS idx_hubs_provisioning_status ON hubs(provisioning_status);
