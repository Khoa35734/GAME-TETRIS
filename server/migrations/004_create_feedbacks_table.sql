-- Migration: Verify feedback table structure
-- Description: The feedback table already exists in the database with the following structure:
-- 
-- Columns:
--   - id (bigserial) PRIMARY KEY
--   - user_id (bigint) - References users table
--   - feedback_id (text) - Unique identifier string (e.g., FB-1234567890-abc123)
--   - category (character varying 200) - Category of feedback
--   - subject (character varying 200) - Brief description
--   - description (text) - Detailed description
--   - status (feedback_status) - ENUM: pending, reviewed, resolved, dismissed
--   - priority (character varying 20) - Priority level: low, medium, high
--   - admin_response (text) - Admin's response to feedback
--   - admin_id (bigint) - Admin who responded
--   - created_at (timestamp with time zone)
--   - updated_at (timestamp with time zone)
--   - resolved_at (timestamp with time zone)
--
-- Note: This table is already created in the database. No migration needed.
-- Use the script: npm run db:feedback to verify the table structure.

-- If you need to create the table from scratch, use:
/*
CREATE TYPE feedback_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

CREATE TABLE feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    feedback_id TEXT NOT NULL UNIQUE,
    category VARCHAR(200) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status feedback_status DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    admin_response TEXT,
    admin_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_priority ON feedback(priority);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_timestamp();
*/
