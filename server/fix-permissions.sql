-- Fix permissions for all tables and sequences
-- Run this with: psql -U postgres -d tetris -f fix-permissions.sql

-- 1. Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE tetris TO devuser;

-- 2. Grant all privileges on schema
GRANT ALL PRIVILEGES ON SCHEMA public TO devuser;

-- 3. Grant all privileges on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO devuser;

-- 4. Grant all privileges on all sequences (including broadcast_messages_message_id_seq)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO devuser;

-- 5. Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO devuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO devuser;

-- 6. Show all sequences to verify
SELECT 
    schemaname,
    sequencename
FROM pg_sequences 
WHERE schemaname = 'public'
ORDER BY sequencename;

\echo '✅ Permissions granted successfully!'
