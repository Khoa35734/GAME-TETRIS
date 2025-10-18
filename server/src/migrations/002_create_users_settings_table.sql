-- Migration: Create users_settings table
-- This table stores user-specific game settings and key bindings

CREATE TABLE IF NOT EXISTS users_settings (
  user_id BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Game mechanics settings
  das_delay_ms INTEGER DEFAULT 133 CHECK (das_delay_ms >= 0 AND das_delay_ms <= 500),
  arr_ms INTEGER DEFAULT 10 CHECK (arr_ms >= 0 AND arr_ms <= 100),
  soft_drop_rate INTEGER DEFAULT 50 CHECK (soft_drop_rate >= 10 AND soft_drop_rate <= 200),
  show_next_pieces INTEGER DEFAULT 5 CHECK (show_next_pieces >= 1 AND show_next_pieces <= 7),
  
  -- Audio settings
  sound_enabled BOOLEAN DEFAULT true,
  music_enabled BOOLEAN DEFAULT true,
  sound_volume NUMERIC(3,2) DEFAULT 0.70 CHECK (sound_volume >= 0.0 AND sound_volume <= 1.0),
  music_volume NUMERIC(3,2) DEFAULT 0.50 CHECK (music_volume >= 0.0 AND music_volume <= 1.0),
  
  -- Key bindings (stored as JSONB for flexibility)
  key_bindings JSONB DEFAULT '{
    "moveLeft": "ArrowLeft",
    "moveRight": "ArrowRight",
    "softDrop": "ArrowDown",
    "hardDrop": "Space",
    "rotateClockwise": "ArrowUp",
    "rotateCounterClockwise": "z",
    "rotate180": "a",
    "hold": "c",
    "restart": "r"
  }'::jsonb,
  
  -- UI preferences
  theme_preference VARCHAR(50) DEFAULT 'default',
  language_pref VARCHAR(10) DEFAULT 'vi'
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_settings_user_id ON users_settings(user_id);

-- Add comments
COMMENT ON TABLE users_settings IS 'User-specific game settings and preferences';
COMMENT ON COLUMN users_settings.das_delay_ms IS 'Delayed Auto Shift delay in milliseconds';
COMMENT ON COLUMN users_settings.arr_ms IS 'Auto Repeat Rate in milliseconds';
COMMENT ON COLUMN users_settings.soft_drop_rate IS 'Soft drop speed in milliseconds';
COMMENT ON COLUMN users_settings.show_next_pieces IS 'Number of next pieces to display (1-7)';
COMMENT ON COLUMN users_settings.key_bindings IS 'Custom key bindings for game controls (JSONB)';
