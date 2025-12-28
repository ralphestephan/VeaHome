-- Check the specific automation from your error log
-- The automation ID from your error: bc5fb92c-d6e7-4c40-a876-f5a90afc36d2

SELECT 
  id,
  name,
  enabled,
  home_id,
  trigger,
  actions,
  trigger::text as trigger_json,
  actions::text as actions_json,
  created_at,
  updated_at,
  -- Validation check
  CASE 
    WHEN (trigger IS NULL OR trigger = '{}'::jsonb OR trigger = 'null'::jsonb) 
         AND (actions IS NULL OR actions = '[]'::jsonb OR jsonb_array_length(COALESCE(actions, '[]'::jsonb)) = 0)
    THEN 'INVALID - Missing trigger AND actions'
    WHEN trigger IS NULL OR trigger = '{}'::jsonb OR trigger = 'null'::jsonb
    THEN 'INVALID - Missing trigger'
    WHEN actions IS NULL OR actions = '[]'::jsonb OR jsonb_array_length(COALESCE(actions, '[]'::jsonb)) = 0
    THEN 'INVALID - Missing actions'
    ELSE 'VALID'
  END as validation_status
FROM automations
WHERE id = 'bc5fb92c-d6e7-4c40-a876-f5a90afc36d2';

-- If the automation exists, you'll see all its data
-- If it doesn't exist, you'll get 0 rows

