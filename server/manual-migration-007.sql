-- Manual Migration 007: Add ELO rating system and match mode
-- Copy and paste this into your PostgreSQL client (pgAdmin, psql, etc.)

-- Add elo_rating and win_streak columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0;

-- Add mode column to matches table to distinguish ranked vs casual
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'casual';

-- Create index for faster ELO leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_elo_rating ON users(elo_rating DESC);

-- Add comments
COMMENT ON COLUMN users.elo_rating IS 'ELO rating for ranked matches, starts at 1000';
COMMENT ON COLUMN users.win_streak IS 'Current win streak for bonus ELO calculation';
COMMENT ON COLUMN matches.mode IS 'Match mode: casual or ranked';

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('elo_rating', 'win_streak');

SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'matches' 
  AND column_name = 'mode';

-- Show sample data
SELECT user_id, user_name, elo_rating, win_streak 
FROM users 
LIMIT 5;
