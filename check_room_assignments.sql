-- Query to check if devices and hubs are assigned to rooms
-- Run these queries in your PostgreSQL database to verify room assignments

-- 1. Check all hubs and their room assignments
SELECT 
    h.id AS hub_id,
    h.name AS hub_name,
    h.hub_type,
    h.room_id,
    r.name AS room_name,
    h.home_id,
    h.status,
    h.created_at,
    h.updated_at
FROM hubs h
LEFT JOIN rooms r ON h.room_id = r.id
ORDER BY h.updated_at DESC;

-- 2. Check all devices and their room assignments
SELECT 
    d.id AS device_id,
    d.name AS device_name,
    d.type,
    d.category,
    d.room_id,
    r.name AS room_name,
    d.hub_id,
    d.home_id,
    d.created_at,
    d.updated_at
FROM devices d
LEFT JOIN rooms r ON d.room_id = r.id
ORDER BY d.updated_at DESC;

-- 3. Check specific hub by ID (replace with your hub ID)
-- Example: SELECT * FROM hubs WHERE id = '02ba3368-5519-4993-90a4-de022873e3f9';
SELECT 
    h.*,
    r.name AS room_name,
    r.id AS room_id_verified
FROM hubs h
LEFT JOIN rooms r ON h.room_id = r.id
WHERE h.id = '02ba3368-5519-4993-90a4-de022873e3f9';

-- 4. Check all rooms and count devices/hubs assigned to each
SELECT 
    r.id AS room_id,
    r.name AS room_name,
    COUNT(DISTINCT h.id) AS hub_count,
    COUNT(DISTINCT d.id) AS device_count,
    STRING_AGG(DISTINCT h.name, ', ') AS hub_names,
    STRING_AGG(DISTINCT d.name, ', ') AS device_names
FROM rooms r
LEFT JOIN hubs h ON h.room_id = r.id
LEFT JOIN devices d ON d.room_id = r.id
GROUP BY r.id, r.name
ORDER BY r.name;

-- 5. Check for hubs/devices that should be assigned but aren't (room_id is NULL)
SELECT 
    'hub' AS type,
    h.id,
    h.name,
    h.room_id,
    h.updated_at
FROM hubs h
WHERE h.room_id IS NULL
UNION ALL
SELECT 
    'device' AS type,
    d.id,
    d.name,
    d.room_id,
    d.updated_at
FROM devices d
WHERE d.room_id IS NULL
ORDER BY updated_at DESC;

-- 6. Check recent updates to hubs (to see if room_id was updated)
SELECT 
    h.id,
    h.name,
    h.room_id,
    h.updated_at,
    r.name AS room_name
FROM hubs h
LEFT JOIN rooms r ON h.room_id = r.id
WHERE h.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY h.updated_at DESC;

-- 7. Check recent updates to devices (to see if room_id was updated)
SELECT 
    d.id,
    d.name,
    d.room_id,
    d.updated_at,
    r.name AS room_name
FROM devices d
LEFT JOIN rooms r ON d.room_id = r.id
WHERE d.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY d.updated_at DESC;

