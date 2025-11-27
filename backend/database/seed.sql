-- Seed data for testing and development

-- Insert test user
INSERT INTO users (id, name, email, password_hash) VALUES
('00000000-0000-0000-0000-000000000001', 'Demo User', 'demo@veahome.com', '$2a$10$dummyhash');

-- Insert test home
INSERT INTO homes (id, user_id, name) VALUES
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'My Home');

-- Insert test rooms
INSERT INTO rooms (id, home_id, name, temperature, humidity) VALUES
('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'Living Room', 22.5, 45.0),
('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000010', 'Bedroom', 21.0, 50.0),
('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000010', 'Kitchen', 23.0, 55.0);
