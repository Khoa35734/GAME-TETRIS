-- Migration: Create match_history table
-- File: server/src/migrations/002_create_match_history_table.sql

CREATE TABLE IF NOT EXISTS match_history (
  id SERIAL PRIMARY KEY,
  match_id VARCHAR(100) NOT NULL,
  player_id INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  opponent_id INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  opponent_name VARCHAR(50) NOT NULL,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('casual', 'ranked')),
  result VARCHAR(10) NOT NULL CHECK (result IN ('WIN', 'LOSE')),
  score VARCHAR(10) NOT NULL, -- "2-1", "2-0", etc.
  games_data JSONB NOT NULL, -- Array of game results
  player_wins INTEGER NOT NULL DEFAULT 0,
  opponent_wins INTEGER NOT NULL DEFAULT 0,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_player_timestamp ON match_history(player_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_match_id ON match_history(match_id);

-- Add comment
COMMENT ON TABLE match_history IS 'Stores match history for BO3 (Best of 3) games. Auto-deletes old matches keeping only last 10 per user.';
COMMENT ON COLUMN match_history.games_data IS 'JSON array containing detailed stats for each game in the BO3 series';
COMMENT ON COLUMN match_history.score IS 'Final BO3 score in format "2-1", "2-0", etc.';
