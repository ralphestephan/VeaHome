-- QUICK CHECK: Replace 'YOUR_HUB_ID' with your actual hub ID (e.g., '02ba3368-5519-4993-90a4-de022873e3f9')

-- Check your specific hub's room assignment
SELECT 
    h.id AS hub_id,
    h.name AS hub_name,
    h.hub_type,
    h.room_id,
    r.name AS room_name,
    h.updated_at,
    CASE 
        WHEN h.room_id IS NULL THEN '❌ NOT ASSIGNED'
        WHEN r.id IS NULL THEN '⚠️ INVALID ROOM ID'
        ELSE '✅ ASSIGNED'
    END AS assignment_status
FROM hubs h
LEFT JOIN rooms r ON h.room_id = r.id
WHERE h.id = '02ba3368-5519-4993-90a4-de022873e3f9';  -- Replace with your hub ID

-- Check all hubs in your home (replace with your home ID)
SELECT 
    h.id AS hub_id,
    h.name AS hub_name,
    h.room_id,
    r.name AS room_name,
    h.updated_at
FROM hubs h
LEFT JOIN rooms r ON h.room_id = r.id
WHERE h.home_id = 'da707634-9f82-485f-9b9d-6182e707306e'  -- Your home ID
ORDER BY h.updated_at DESC;

-- Check if room assignment was updated recently (last hour)
SELECT 
    h.id,
    h.name,
    h.room_id,
    r.name AS room_name,
    h.updated_at,
    NOW() - h.updated_at AS time_since_update
FROM hubs h
LEFT JOIN rooms r ON h.room_id = r.id
WHERE h.home_id = 'da707634-9f82-485f-9b9d-6182e707306e'
  AND h.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY h.updated_at DESC;

