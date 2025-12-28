-- Find invalid automations (missing triggers or actions) that might not show in UI
SELECT 
  id,
  name,
  enabled,
  home_id,
  created_at,
  CASE 
    WHEN trigger IS NULL OR trigger = '{}'::jsonb OR trigger = 'null'::jsonb THEN 'Missing trigger'
    ELSE 'Has trigger'
  END as trigger_status,
  CASE 
    WHEN actions IS NULL OR actions = '[]'::jsonb OR jsonb_array_length(COALESCE(actions, '[]'::jsonb)) = 0 THEN 'Missing actions'
    ELSE 'Has actions'
  END as actions_status
FROM automations
WHERE 
  (trigger IS NULL OR trigger = '{}'::jsonb OR trigger = 'null'::jsonb)
  OR 
  (actions IS NULL OR actions = '[]'::jsonb OR jsonb_array_length(COALESCE(actions, '[]'::jsonb)) = 0)
ORDER BY created_at DESC;

