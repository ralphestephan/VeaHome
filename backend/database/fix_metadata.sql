-- Add metadata column if it doesn't exist
ALTER TABLE hubs 
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Verify the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hubs' AND column_name = 'metadata';
