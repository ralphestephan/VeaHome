-- Simple SQL query to check all automations
-- Run this to see all automations and identify the problematic one

-- Replace 'YOUR_HOME_ID' with your actual home ID
-- You can find your home ID by running: SELECT id, name FROM homes ORDER BY created_at DESC LIMIT 5;

SELECT 
  id,
  name,
  enabled,
  CASE 
    WHEN trigger IS NULL OR trigger = '{}'::jsonb OR trigger = 'null'::jsonb THEN '❌ No trigger'
    ELSE '✓ Has trigger'
  END as trigger_check,
  CASE 
    WHEN actions IS NULL OR actions = '[]'::jsonb OR jsonb_array_length(COALESCE(actions, '[]'::jsonb)) = 0 THEN '❌ No actions'
    ELSE '✓ Has actions'
  END as actions_check,
  trigger::text as trigger_data,
  actions::text as actions_data,
  created_at
FROM automations
WHERE home_id = 'YOUR_HOME_ID'  -- Replace with your home ID
ORDER BY created_at DESC;

-- OR to see ALL automations (if you have multiple homes):
SELECT 
  a.id,
  a.name,
  a.enabled,
  h.name as home_name,
  CASE 
    WHEN a.trigger IS NULL OR a.trigger = '{}'::jsonb OR a.trigger = 'null'::jsonb THEN '❌ No trigger'
    ELSE '✓ Has trigger'
  END as trigger_check,
  CASE 
    WHEN a.actions IS NULL OR a.actions = '[]'::jsonb OR jsonb_array_length(COALESCE(a.actions, '[]'::jsonb)) = 0 THEN '❌ No actions'
    ELSE '✓ Has actions'
  END as actions_check,
  a.created_at
FROM automations a
LEFT JOIN homes h ON a.home_id = h.id
ORDER BY a.created_at DESC;

