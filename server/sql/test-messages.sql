-- ================================================
-- Script: Test Messages/Inbox System
-- Purpose: Tạo dữ liệu test cho hệ thống hộp thư
-- ================================================

-- 1. Kiểm tra bảng messages đã tồn tại chưa
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- 2. Kiểm tra có users nào không
SELECT user_id, user_name, email FROM users LIMIT 5;

-- ================================================
-- TẠO TIN NHẮN TEST
-- ================================================

-- 3. Tin nhắn hệ thống chào mừng
INSERT INTO messages (recipient_id, sender_id, message_type, subject, content)
VALUES 
(1, NULL, 'system', '🎮 Chào mừng đến với Tetris!', 
 'Chào mừng bạn đến với game Tetris! Đây là hộp thư cá nhân của bạn nơi bạn sẽ nhận được các thông báo từ hệ thống, phản hồi từ admin và tin nhắn từ bạn bè. Chúc bạn chơi game vui vẻ! 🎉');

-- 4. Tin nhắn admin phản hồi feedback
INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, metadata)
VALUES 
(1, NULL, 'admin_reply', '💬 Admin đã phản hồi feedback của bạn', 
 'Cảm ơn bạn đã gửi feedback về tính năng matchmaking. Chúng tôi đã ghi nhận và sẽ cải thiện trong phiên bản tiếp theo!',
 '{"feedback_id": 1}');

-- 5. Tin nhắn broadcast/thông báo
INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, metadata)
VALUES 
(1, NULL, 'broadcast', '📢 Bảo trì hệ thống', 
 'Hệ thống sẽ bảo trì vào 22:00 - 23:00 hôm nay để nâng cấp server. Trong thời gian này bạn sẽ không thể chơi game. Xin lỗi vì sự bất tiện này!',
 '{"broadcast_id": 1, "start_time": "2025-10-18 22:00", "end_time": "2025-10-18 23:00"}');

-- 6. Tin nhắn từ người chơi khác (cần user_id = 2)
-- INSERT INTO messages (recipient_id, sender_id, message_type, subject, content)
-- VALUES 
-- (1, 2, 'player_message', '✉️ Lời mời chơi game', 
--  'Hey! Chơi một ván Tetris với mình không? Tôi đang tạo phòng rồi, vào đi!');

-- 7. Tin nhắn lời mời kết bạn
-- INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, metadata)
-- VALUES 
-- (1, 2, 'friend_request', '👥 Lời mời kết bạn', 
--  'User123 muốn kết bạn với bạn',
--  '{"friend_request_id": 1, "action_url": "/friends/accept/1"}');

-- 8. Tin nhắn game invite
INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, metadata)
VALUES 
(1, NULL, 'game_invite', '🎮 Lời mời tham gia giải đấu', 
 'Bạn đã được mời tham gia giải đấu Tetris Championship 2025! Click vào đây để đăng ký.',
 '{"tournament_id": 5, "deadline": "2025-11-01"}');

-- 9. Tin nhắn đã đọc (để test filter)
INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, is_read, read_at)
VALUES 
(1, NULL, 'system', '📊 Thống kê tuần này', 
 'Bạn đã chơi 15 ván trong tuần, thắng 10 ván! Tỉ lệ thắng: 66.7%. Tuyệt vời!',
 TRUE, NOW() - INTERVAL '1 day');

-- 10. Tin nhắn đánh dấu sao (để test filter)
INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, is_starred)
VALUES 
(1, NULL, 'admin_reply', '⭐ Bạn đã đạt Top 10!', 
 'Chúc mừng! Bạn đã lọt vào Top 10 người chơi xuất sắc nhất tháng này với ELO 1850. Tiếp tục cố gắng nhé!',
 TRUE);

-- ================================================
-- KIỂM TRA KẾT QUẢ
-- ================================================

-- 11. Xem tất cả tin nhắn của user_id = 1
SELECT 
    message_id,
    message_type,
    subject,
    is_read,
    is_starred,
    created_at
FROM messages
WHERE recipient_id = 1
ORDER BY created_at DESC;

-- 12. Đếm số tin chưa đọc
SELECT COUNT(*) as unread_count
FROM messages
WHERE recipient_id = 1 
  AND is_read = FALSE 
  AND is_deleted = FALSE;

-- 13. Đếm theo loại tin nhắn
SELECT 
    message_type,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE is_read = FALSE) as unread
FROM messages
WHERE recipient_id = 1 AND is_deleted = FALSE
GROUP BY message_type;

-- 14. Thống kê tổng quan
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_read = FALSE) as unread,
    COUNT(*) FILTER (WHERE is_starred = TRUE) as starred,
    COUNT(*) FILTER (WHERE message_type = 'system') as system,
    COUNT(*) FILTER (WHERE message_type = 'admin_reply') as admin_reply,
    COUNT(*) FILTER (WHERE message_type = 'player_message') as player_message
FROM messages
WHERE recipient_id = 1 AND is_deleted = FALSE;

-- ================================================
-- TEST FUNCTIONS
-- ================================================

-- 15. Test function get_unread_count
SELECT get_unread_count(1);

-- ================================================
-- CLEANUP (chỉ chạy khi cần reset)
-- ================================================

-- Xóa tất cả tin nhắn test
-- DELETE FROM messages WHERE recipient_id = 1;

-- Xóa tất cả tin nhắn
-- TRUNCATE TABLE messages RESTART IDENTITY CASCADE;
