-- Migration 007: Add ELO rating system and match mode
-- Run date: 2025-11-11

-- Add elo_rating and win_streak columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0;

-- Add mode column to matches table to distinguish ranked vs casual
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'casual';

-- Create index for faster ELO leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_elo_rating ON users(elo_rating DESC);

-- Add comment
COMMENT ON COLUMN users.elo_rating IS 'ELO rating for ranked matches, starts at 1000';
COMMENT ON COLUMN users.win_streak IS 'Current win streak for bonus ELO calculation';
COMMENT ON COLUMN matches.mode IS 'Match mode: casual or ranked';
