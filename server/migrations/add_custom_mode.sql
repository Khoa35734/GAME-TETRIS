-- Migration: Add 'custom' mode to matches table
-- Date: 2025-11-14

-- Update the mode column to accept 'custom' value
ALTER TABLE matches 
  DROP CONSTRAINT IF EXISTS matches_mode_check;

ALTER TABLE matches 
  ADD CONSTRAINT matches_mode_check 
  CHECK (mode IN ('casual', 'ranked', 'custom'));

-- Optional: Update existing NULL mode to 'casual' (if any)
UPDATE matches 
SET mode = 'casual' 
WHERE mode IS NULL;

-- Make mode NOT NULL (if it isn't already)
ALTER TABLE matches 
  ALTER COLUMN mode SET NOT NULL;
