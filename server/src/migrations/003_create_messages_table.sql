-- ================================================
-- Migration: Create messages (inbox) table
-- Description: Hệ thống hộp thư cho người chơi
-- Date: 2025-10-18
-- ================================================

-- Tạo bảng messages
CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    
    -- Người nhận (user_id của người nhận tin)
    recipient_id INTEGER NOT NULL,
    
    -- Người gửi (NULL = hệ thống, số = user_id)
    sender_id INTEGER,
    
    -- Loại tin nhắn
    message_type VARCHAR(30) NOT NULL DEFAULT 'system',
    -- Các loại: 'system', 'admin_reply', 'friend_request', 'game_invite', 'broadcast', 'player_message'
    
    -- Tiêu đề và nội dung
    subject VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    
    -- Trạng thái
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE, -- Soft delete
    
    -- Metadata (JSON để lưu thông tin bổ sung)
    metadata JSONB,
    -- Ví dụ: {"feedback_id": 123, "report_id": 456, "broadcast_id": 789}
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_recipient FOREIGN KEY (recipient_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_sender FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Indexes cho performance
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON messages(recipient_id, is_read) WHERE is_deleted = FALSE;

-- Composite index cho inbox query
CREATE INDEX IF NOT EXISTS idx_messages_inbox ON messages(recipient_id, is_deleted, created_at DESC);

-- Comment cho bảng
COMMENT ON TABLE messages IS 'Hộp thư của người chơi - lưu tất cả tin nhắn, thông báo';
COMMENT ON COLUMN messages.sender_id IS 'NULL = tin nhắn hệ thống, số = user_id của người gửi';
COMMENT ON COLUMN messages.metadata IS 'JSON data cho liên kết với feedback, report, broadcast, etc.';

-- ================================================
-- Sample data for testing (optional)
-- ================================================

-- Tin nhắn chào mừng cho tất cả users hiện có
-- INSERT INTO messages (recipient_id, sender_id, message_type, subject, content)
-- SELECT 
--     user_id,
--     NULL,
--     'system',
--     'Chào mừng đến với Tetris!',
--     'Chào mừng bạn đến với game Tetris! Đây là hộp thư của bạn nơi bạn sẽ nhận được các thông báo, phản hồi từ admin và tin nhắn từ bạn bè.'
-- FROM users;

-- ================================================
-- Function: Tự động tạo tin nhắn chào mừng cho user mới
-- ================================================

CREATE OR REPLACE FUNCTION create_welcome_message()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO messages (recipient_id, sender_id, message_type, subject, content)
    VALUES (
        NEW.user_id,
        NULL,
        'system',
        '🎮 Chào mừng đến với Tetris!',
        'Xin chào ' || NEW.user_name || '! Chào mừng bạn đến với game Tetris. Đây là hộp thư cá nhân của bạn. Bạn sẽ nhận được thông báo hệ thống, phản hồi từ admin và tin nhắn từ bạn bè tại đây. Chúc bạn chơi game vui vẻ! 🎉'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_welcome_message ON users;
CREATE TRIGGER trigger_welcome_message
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_welcome_message();

-- ================================================
-- Function: Tự động gửi tin nhắn khi admin reply feedback
-- ================================================

CREATE OR REPLACE FUNCTION send_feedback_reply_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Chỉ gửi tin khi admin_response được thêm/cập nhật
    IF NEW.admin_response IS NOT NULL AND (OLD.admin_response IS NULL OR OLD.admin_response != NEW.admin_response) THEN
        INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, metadata)
        VALUES (
            NEW.user_id,
            NULL,
            'admin_reply',
            '💬 Admin đã phản hồi feedback của bạn',
            'Admin đã phản hồi feedback "' || NEW.subject || '". Phản hồi: ' || NEW.admin_response,
            jsonb_build_object('feedback_id', NEW.feedback_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Kiểm tra xem bảng feedback có tồn tại không
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN
        DROP TRIGGER IF EXISTS trigger_feedback_reply_notification ON feedback;
        CREATE TRIGGER trigger_feedback_reply_notification
            AFTER UPDATE ON feedback
            FOR EACH ROW
            EXECUTE FUNCTION send_feedback_reply_notification();
    END IF;
END $$;

-- ================================================
-- Function: Đếm số tin chưa đọc của user
-- ================================================

CREATE OR REPLACE FUNCTION get_unread_count(user_id_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM messages
    WHERE recipient_id = user_id_param
      AND is_read = FALSE
      AND is_deleted = FALSE;
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT get_unread_count(1);
