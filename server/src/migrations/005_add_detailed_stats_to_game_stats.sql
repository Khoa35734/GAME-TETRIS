-- Migration: Add detailed stats fields to game_stats table
-- File: server/src/migrations/005_add_detailed_stats_to_game_stats.sql
-- Date: 2025-11-11

-- Thêm các field chi tiết vào bảng game_stats
ALTER TABLE public.game_stats
ADD COLUMN IF NOT EXISTS lines_cleared INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pieces_placed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS attacks_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS garbage_received INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS holds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS inputs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS elapsed_ms INTEGER DEFAULT 0;

-- Migrate dữ liệu cũ sang field mới (nếu có)
UPDATE public.game_stats
SET 
  pieces_placed = COALESCE(pieces, 0),
  attacks_sent = COALESCE(attack_lines, 0),
  elapsed_ms = ROUND(COALESCE(time_seconds, 0) * 1000)
WHERE pieces_placed = 0; -- Chỉ update nếu chưa có data

-- Comments
COMMENT ON COLUMN public.game_stats.lines_cleared IS 'Số dòng đã xóa trong ván này';
COMMENT ON COLUMN public.game_stats.pieces_placed IS 'Số Tetromino đã đặt';
COMMENT ON COLUMN public.game_stats.attacks_sent IS 'Số dòng rác đã gửi';
COMMENT ON COLUMN public.game_stats.garbage_received IS 'Số dòng rác đã nhận';
COMMENT ON COLUMN public.game_stats.holds IS 'Số lần sử dụng hold';
COMMENT ON COLUMN public.game_stats.inputs IS 'Tổng số input (phím bấm)';
COMMENT ON COLUMN public.game_stats.elapsed_ms IS 'Thời gian chơi (milliseconds)';

-- Giữ lại các field cũ để backward compatibility
COMMENT ON COLUMN public.game_stats.pieces IS '[DEPRECATED] Sử dụng pieces_placed thay thế';
COMMENT ON COLUMN public.game_stats.attack_lines IS '[DEPRECATED] Sử dụng attacks_sent thay thế';
COMMENT ON COLUMN public.game_stats.time_seconds IS '[DEPRECATED] Sử dụng elapsed_ms thay thế';

-- Tạo index cho performance
CREATE INDEX IF NOT EXISTS idx_game_stats_elapsed_ms ON public.game_stats(elapsed_ms);
