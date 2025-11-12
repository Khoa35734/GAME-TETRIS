-- Migration: Add disconnect reason tracking
-- File: server/src/migrations/006_add_disconnect_reason.sql
-- Date: 2025-11-11

-- Thêm field để track lý do kết thúc match
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS end_reason VARCHAR(50) DEFAULT 'normal';

COMMENT ON COLUMN public.matches.end_reason IS 'Lý do kết thúc: normal, player1_disconnect, player2_disconnect, player1_afk, player2_afk';

-- Thêm index
CREATE INDEX IF NOT EXISTS idx_matches_end_reason ON public.matches(end_reason);
