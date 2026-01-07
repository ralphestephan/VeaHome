-- Add declined_at column to home_invitations table to track declined invitations
ALTER TABLE home_invitations 
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP;

-- Add index for faster lookups of declined invitations
CREATE INDEX IF NOT EXISTS idx_invitations_declined ON home_invitations(declined_at) WHERE declined_at IS NOT NULL;

-- Add updated_at column to home_members for tracking role changes
ALTER TABLE home_members 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;


