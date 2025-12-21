-- Check the home's owner and the current user
-- Replace the IDs with the ones from your error logs

-- Check home details
SELECT 
  id,
  name,
  user_id as owner_id,
  created_at
FROM homes 
WHERE id = '5c81b86f-046c-41ad-b3e7-699f60d01a8c';

-- Check user details
SELECT 
  id,
  email,
  name,
  created_at
FROM users 
WHERE id = '2d82421f-a3e6-4916-9a25-441d31682024';

-- Check if this user created this home
SELECT 
  h.id as home_id,
  h.name as home_name,
  h.user_id as home_owner_id,
  u.id as user_id,
  u.email as user_email,
  CASE 
    WHEN h.user_id = u.id THEN 'YES - User is owner'
    ELSE 'NO - User is NOT owner'
  END as is_owner
FROM homes h
CROSS JOIN users u
WHERE h.id = '5c81b86f-046c-41ad-b3e7-699f60d01a8c'
  AND u.id = '2d82421f-a3e6-4916-9a25-441d31682024';

-- Check all homes for this user
SELECT 
  id,
  name,
  user_id as owner_id,
  created_at
FROM homes 
WHERE user_id = '2d82421f-a3e6-4916-9a25-441d31682024'
ORDER BY created_at DESC;
