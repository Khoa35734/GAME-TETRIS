-- Migration: Create matches and game_stats tables for BO3 match history
-- File: server/src/migrations/004_create_matches_and_game_stats_tables.sql
-- Author: AI Assistant
-- Date: 2025-11-09

-- =============================================
-- TABLE: matches
-- Purpose: Lưu thông tin tổng quan trận BO3
-- =============================================
CREATE TABLE IF NOT EXISTS public.matches
(
    match_id bigserial NOT NULL,
    match_guid uuid NOT NULL DEFAULT gen_random_uuid(), 
    player1_id bigint NOT NULL,
    player2_id bigint NOT NULL,
    player1_wins integer NOT NULL DEFAULT 0,
    player2_wins integer NOT NULL DEFAULT 0,
    winner_id bigint, -- ID của người thắng trận BO3
    mode character varying(20) NOT NULL CHECK (mode IN ('casual', 'ranked')),
    match_timestamp timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT matches_pkey PRIMARY KEY (match_id),
    CONSTRAINT matches_player1_id_fkey FOREIGN KEY (player1_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT matches_player2_id_fkey FOREIGN KEY (player2_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT matches_winner_id_fkey FOREIGN KEY (winner_id)
        REFERENCES public.users (user_id) ON DELETE SET NULL
);

-- Indexes for matches table
CREATE INDEX IF NOT EXISTS idx_matches_player1_timestamp ON public.matches(player1_id, match_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_matches_player2_timestamp ON public.matches(player2_id, match_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_matches_winner ON public.matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_matches_guid ON public.matches(match_guid);

-- Comments for matches table
COMMENT ON TABLE public.matches IS 'Lưu thông tin tổng quan trận đấu BO3 (Best of 3). Mỗi trận có tối đa 3 ván.';
COMMENT ON COLUMN public.matches.match_guid IS 'UUID duy nhất để tracking trận đấu';
COMMENT ON COLUMN public.matches.player1_wins IS 'Số ván player 1 thắng trong trận BO3';
COMMENT ON COLUMN public.matches.player2_wins IS 'Số ván player 2 thắng trong trận BO3';
COMMENT ON COLUMN public.matches.winner_id IS 'ID người thắng trận BO3 (NULL nếu hòa)';
COMMENT ON COLUMN public.matches.mode IS 'Chế độ chơi: casual hoặc ranked';

-- =============================================
-- TABLE: game_stats
-- Purpose: Lưu chi tiết chỉ số từng ván đấu
-- =============================================
CREATE TABLE IF NOT EXISTS public.game_stats
(
    game_stat_id bigserial NOT NULL,
    match_id bigint NOT NULL, -- Khóa ngoại trỏ đến 'matches'
    game_number smallint NOT NULL CHECK (game_number >= 1 AND game_number <= 3),
    player_id bigint NOT NULL,
    is_winner boolean NOT NULL DEFAULT false, -- Thắng ván này hay không
    
    -- Các chỉ số cốt lõi
    pieces integer NOT NULL DEFAULT 0,        -- Số Tetromino đã rơi
    attack_lines integer NOT NULL DEFAULT 0,  -- Tổng số dòng rác gửi đi (garbage sent)
    time_seconds numeric(7, 2) NOT NULL,      -- Thời gian ván đấu (giây)
    pps numeric(5, 2) NOT NULL DEFAULT 0.00,  -- Pieces Per Second
    apm numeric(6, 2) NOT NULL DEFAULT 0.00,  -- Attack Per Minute

    CONSTRAINT game_stats_pkey PRIMARY KEY (game_stat_id),
    CONSTRAINT game_stats_match_id_fkey FOREIGN KEY (match_id)
        REFERENCES public.matches (match_id) ON DELETE CASCADE,
    CONSTRAINT game_stats_player_id_fkey FOREIGN KEY (player_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    
    -- Đảm bảo mỗi người chơi chỉ có 1 bộ chỉ số cho mỗi ván
    CONSTRAINT game_stats_match_game_player_key UNIQUE (match_id, game_number, player_id)
);

-- Indexes for game_stats table
CREATE INDEX IF NOT EXISTS idx_game_stats_match_id ON public.game_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_player_id ON public.game_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_match_game ON public.game_stats(match_id, game_number);

-- Comments for game_stats table
COMMENT ON TABLE public.game_stats IS 'Lưu chi tiết chỉ số của từng người chơi trong từng ván đấu (game). Mỗi ván có 2 hàng (1 cho mỗi player).';
COMMENT ON COLUMN public.game_stats.game_number IS 'Số thứ tự ván (1, 2, hoặc 3)';
COMMENT ON COLUMN public.game_stats.is_winner IS 'TRUE nếu player này thắng ván này';
COMMENT ON COLUMN public.game_stats.pieces IS 'Tổng số Tetromino đã đặt trong ván này';
COMMENT ON COLUMN public.game_stats.attack_lines IS 'Tổng số dòng rác (garbage lines) đã gửi cho đối thủ';
COMMENT ON COLUMN public.game_stats.time_seconds IS 'Thời gian chơi ván này (tính bằng giây, có thập phân)';
COMMENT ON COLUMN public.game_stats.pps IS 'Pieces Per Second - Tốc độ đặt Tetromino';
COMMENT ON COLUMN public.game_stats.apm IS 'Attack Per Minute - Số dòng rác gửi đi mỗi phút';

-- Grant permissions (optional, adjust based on your user setup)
-- GRANT SELECT, INSERT ON public.matches TO your_app_user;
-- GRANT SELECT, INSERT ON public.game_stats TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE matches_match_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE game_stats_game_stat_id_seq TO your_app_user;

