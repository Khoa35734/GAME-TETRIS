-- Fix permissions for users table and sequence
-- Run this in your PostgreSQL database as admin/superuser

-- Grant all privileges on users table to your app user
GRANT ALL PRIVILEGES ON TABLE users TO devuser;

-- Grant usage and select on the sequence
GRANT USAGE, SELECT ON SEQUENCE users_user_id_seq TO devuser;

-- Verify permissions
\dp users
\dp users_user_id_seq

-- If you want to grant to a different user, replace 'devuser' with your PG_USER
