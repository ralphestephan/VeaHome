-- SQL Query to delete schedules at 22:00 on Monday-Friday
-- Run this in your PostgreSQL database

DELETE FROM schedules 
WHERE time = '22:00:00'::time 
  AND days::jsonb @> '["Mon", "Tue", "Wed", "Thu", "Fri"]'::jsonb;

-- Alternative: If you want to delete ALL schedules (use with caution!)
-- DELETE FROM schedules;

-- To see which schedules will be deleted first (recommended):
-- SELECT id, name, time, days, enabled 
-- FROM schedules 
-- WHERE time = '22:00:00'::time 
--   AND days::jsonb @> '["Mon", "Tue", "Wed", "Thu", "Fri"]'::jsonb;

