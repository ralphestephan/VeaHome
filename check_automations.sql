-- SQL Queries to check automations in the database

-- 1. See all automations for a specific home (replace 'YOUR_HOME_ID' with your actual home ID)
SELECT 
  id,
  name,
  enabled,
  trigger,
  actions,
  created_at,
  updated_at
FROM automations
WHERE home_id = 'YOUR_HOME_ID'
ORDER BY created_at DESC;

-- 2. See ALL automations in the database
SELECT 
  a.id,
  a.name,
  a.enabled,
  a.trigger,
  a.actions,
  a.home_id,
  h.name as home_name,
  a.created_at,
  a.updated_at
FROM automations a
LEFT JOIN homes h ON a.home_id = h.id
ORDER BY a.created_at DESC;

-- 3. Find automations with no triggers or actions (invalid automations)
SELECT 
  id,
  name,
  enabled,
  trigger,
  actions,
  CASE 
    WHEN trigger IS NULL OR trigger = '{}'::jsonb OR trigger = 'null'::jsonb THEN 'No trigger'
    ELSE 'Has trigger'
  END as trigger_status,
  CASE 
    WHEN actions IS NULL OR actions = '[]'::jsonb OR jsonb_array_length(actions) = 0 THEN 'No actions'
    ELSE 'Has actions'
  END as actions_status,
  created_at
FROM automations
WHERE 
  (trigger IS NULL OR trigger = '{}'::jsonb OR trigger = 'null'::jsonb)
  OR 
  (actions IS NULL OR actions = '[]'::jsonb OR jsonb_array_length(actions) = 0)
ORDER BY created_at DESC;

-- 4. Count automations per home
SELECT 
  h.id as home_id,
  h.name as home_name,
  COUNT(a.id) as automation_count
FROM homes h
LEFT JOIN automations a ON h.id = a.home_id
GROUP BY h.id, h.name
ORDER BY automation_count DESC;

-- 5. Find your home ID first (if you don't know it)
SELECT 
  id,
  name,
  user_id,
  created_at
FROM homes
ORDER BY created_at DESC
LIMIT 10;

-- 6. Find automations by name (if you remember the name)
SELECT 
  id,
  name,
  enabled,
  home_id,
  trigger,
  actions,
  created_at
FROM automations
WHERE name LIKE '%YOUR_AUTOMATION_NAME%'
ORDER BY created_at DESC;

-- 7. Get detailed info about a specific automation (replace 'AUTOMATION_ID' with the ID from error logs)
SELECT 
  id,
  name,
  enabled,
  trigger::text as trigger_json,
  actions::text as actions_json,
  home_id,
  created_at,
  updated_at,
  -- Check if it's valid
  CASE 
    WHEN (trigger IS NULL OR trigger = '{}'::jsonb OR trigger = 'null'::jsonb) 
         AND (actions IS NULL OR actions = '[]'::jsonb OR jsonb_array_length(COALESCE(actions, '[]'::jsonb)) = 0)
    THEN 'INVALID - No trigger AND no actions'
    WHEN trigger IS NULL OR trigger = '{}'::jsonb OR trigger = 'null'::jsonb
    THEN 'INVALID - No trigger'
    WHEN actions IS NULL OR actions = '[]'::jsonb OR jsonb_array_length(COALESCE(actions, '[]'::jsonb)) = 0
    THEN 'INVALID - No actions'
    ELSE 'VALID'
  END as validation_status
FROM automations
WHERE id = 'AUTOMATION_ID';

