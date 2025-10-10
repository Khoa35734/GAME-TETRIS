-- Migration: Rename account table to users for consistency
-- Database: Tetris
-- Date: 2025-10-10

-- Rename table from account to users
ALTER TABLE account RENAME TO users;

-- Rename primary key column from account_id to id
ALTER TABLE users RENAME COLUMN account_id TO id;

-- Rename indexes
DROP INDEX IF EXISTS idx_account_email;
DROP INDEX IF EXISTS idx_account_username;
DROP INDEX IF EXISTS idx_account_elo;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_elo ON users(elo_rating DESC);

-- Update trigger function name
DROP TRIGGER IF EXISTS trigger_account_updated_at ON users;
DROP FUNCTION IF EXISTS update_account_updated_at();

CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Optional: Add any additional columns if needed for users table
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);