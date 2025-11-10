-- Script kiểm tra xem bảng đã được tạo chưa
-- File: server/check-tables.sql

-- Kiểm tra bảng matches
SELECT 
    'matches' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'matches'
GROUP BY table_name

UNION ALL

-- Kiểm tra bảng game_stats
SELECT 
    'game_stats' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'game_stats'
GROUP BY table_name;

-- Xem cấu trúc bảng matches
\d matches

-- Xem cấu trúc bảng game_stats
\d game_stats
