-- Migration: Create account table for Tetris game authentication
-- Database: Tetris
-- Date: 2025-10-09

-- Create account table if not exists
CREATE TABLE IF NOT EXISTS account (
    account_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    elo_rating INTEGER DEFAULT 1000,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_email ON account(email);
CREATE INDEX IF NOT EXISTS idx_account_username ON account(username);
CREATE INDEX IF NOT EXISTS idx_account_elo ON account(elo_rating DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_account_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_account_updated_at ON account;
CREATE TRIGGER trigger_account_updated_at
    BEFORE UPDATE ON account
    FOR EACH ROW
    EXECUTE FUNCTION update_account_updated_at();

-- Sample data (optional - comment out in production)
-- INSERT INTO account (username, email, password) VALUES 
-- ('testuser', 'test@example.com', '$2b$10$dummyhashfordemopurposes');
