// Messages Routes - API cho hộp thư người chơi
import { Router, Request, Response } from 'express';
import { sequelize } from '../stores/postgres';
import { QueryTypes } from 'sequelize';

const router = Router();

// ================================================
// GET /api/messages - Lấy tất cả tin nhắn của user
// ================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId || req.query.user_id;
    const filter = req.query.filter || 'all'; // all, unread, starred

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    let whereClause = 'WHERE m.recipient_id = :userId AND m.is_deleted = FALSE';
    
    if (filter === 'unread') {
      whereClause += ' AND m.is_read = FALSE';
    } else if (filter === 'starred') {
      whereClause += ' AND m.is_starred = TRUE';
    }

    const messages = await sequelize.query(
      `SELECT 
        m.message_id,
        m.recipient_id,
        m.sender_id,
        m.message_type,
        m.subject,
        m.content,
        m.is_read,
        m.is_starred,
        m.is_deleted,
        m.metadata,
        m.created_at,
        m.read_at,
        m.deleted_at,
        sender.user_name as sender_name,
        sender.email as sender_email
       FROM messages m
       LEFT JOIN users sender ON m.sender_id = sender.user_id
       ${whereClause}
       ORDER BY m.created_at DESC`,
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );

    // Đếm số tin chưa đọc
    const unreadCount = await sequelize.query(
      `SELECT COUNT(*) as count
       FROM messages
       WHERE recipient_id = :userId AND is_read = FALSE AND is_deleted = FALSE`,
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );

    res.json({
      messages,
      unreadCount: (unreadCount[0] as any).count
    });
  } catch (error) {
    console.error('[GET /api/messages] Error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ================================================
// GET /api/messages/:id - Lấy 1 tin nhắn chi tiết
// ================================================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const messages = await sequelize.query(
      `SELECT 
        m.*,
        sender.user_name as sender_name,
        sender.email as sender_email,
        recipient.user_name as recipient_name,
        recipient.email as recipient_email
       FROM messages m
       LEFT JOIN users sender ON m.sender_id = sender.user_id
       LEFT JOIN users recipient ON m.recipient_id = recipient.user_id
       WHERE m.message_id = :id`,
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(messages[0]);
  } catch (error) {
    console.error('[GET /api/messages/:id] Error:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// ================================================
// POST /api/messages - Tạo tin nhắn mới
// ================================================
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      recipient_id,
      sender_id,
      message_type = 'player_message',
      subject,
      content,
      metadata
    } = req.body;

    if (!recipient_id || !subject || !content) {
      return res.status(400).json({ 
        error: 'recipient_id, subject, and content are required' 
      });
    }

    const result = await sequelize.query(
      `INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, metadata)
       VALUES (:recipient_id, :sender_id, :message_type, :subject, :content, :metadata)
       RETURNING *`,
      {
        replacements: {
          recipient_id,
          sender_id: sender_id || null,
          message_type,
          subject,
          content,
          metadata: metadata ? JSON.stringify(metadata) : null
        },
        type: QueryTypes.INSERT
      }
    );

    const insertedMessage = Array.isArray(result[0]) ? result[0][0] : result[0];

    res.status(201).json({
      success: true,
      message: 'Message created successfully',
      data: insertedMessage
    });
  } catch (error) {
    console.error('[POST /api/messages] Error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// ================================================
// PATCH /api/messages/:id/read - Đánh dấu đã đọc
// ================================================
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await sequelize.query(
      `UPDATE messages
       SET is_read = TRUE, read_at = NOW()
       WHERE message_id = :id`,
      {
        replacements: { id },
        type: QueryTypes.UPDATE
      }
    );

    res.json({ success: true, message: 'Message marked as read' });
  } catch (error) {
    console.error('[PATCH /api/messages/:id/read] Error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// ================================================
// PATCH /api/messages/:id/star - Đánh dấu sao
// ================================================
router.patch('/:id/star', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { starred } = req.body; // true hoặc false

    await sequelize.query(
      `UPDATE messages
       SET is_starred = :starred
       WHERE message_id = :id`,
      {
        replacements: { id, starred: starred ?? true },
        type: QueryTypes.UPDATE
      }
    );

    res.json({ success: true, message: `Message ${starred ? 'starred' : 'unstarred'}` });
  } catch (error) {
    console.error('[PATCH /api/messages/:id/star] Error:', error);
    res.status(500).json({ error: 'Failed to update star status' });
  }
});

// ================================================
// DELETE /api/messages/:id - Xóa tin nhắn (soft delete)
// ================================================
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await sequelize.query(
      `UPDATE messages
       SET is_deleted = TRUE, deleted_at = NOW()
       WHERE message_id = :id`,
      {
        replacements: { id },
        type: QueryTypes.UPDATE
      }
    );

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/messages/:id] Error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ================================================
// DELETE /api/messages/bulk - Xóa nhiều tin nhắn
// ================================================
router.delete('/bulk/delete', async (req: Request, res: Response) => {
  try {
    const { messageIds } = req.body; // Array of message IDs

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds array is required' });
    }

    await sequelize.query(
      `UPDATE messages
       SET is_deleted = TRUE, deleted_at = NOW()
       WHERE message_id = ANY(:messageIds)`,
      {
        replacements: { messageIds },
        type: QueryTypes.UPDATE
      }
    );

    res.json({ 
      success: true, 
      message: `${messageIds.length} messages deleted successfully` 
    });
  } catch (error) {
    console.error('[DELETE /api/messages/bulk] Error:', error);
    res.status(500).json({ error: 'Failed to delete messages' });
  }
});

// ================================================
// PATCH /api/messages/bulk/read - Đánh dấu đã đọc nhiều tin
// ================================================
router.patch('/bulk/read', async (req: Request, res: Response) => {
  try {
    const { messageIds } = req.body; // Array of message IDs

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds array is required' });
    }

    await sequelize.query(
      `UPDATE messages
       SET is_read = TRUE, read_at = NOW()
       WHERE message_id = ANY(:messageIds)`,
      {
        replacements: { messageIds },
        type: QueryTypes.UPDATE
      }
    );

    res.json({ 
      success: true, 
      message: `${messageIds.length} messages marked as read` 
    });
  } catch (error) {
    console.error('[PATCH /api/messages/bulk/read] Error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// ================================================
// GET /api/messages/stats/:userId - Thống kê tin nhắn
// ================================================
router.get('/stats/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const stats = await sequelize.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_read = FALSE) as unread,
        COUNT(*) FILTER (WHERE is_starred = TRUE) as starred,
        COUNT(*) FILTER (WHERE message_type = 'system') as system,
        COUNT(*) FILTER (WHERE message_type = 'admin_reply') as admin_reply,
        COUNT(*) FILTER (WHERE message_type = 'player_message') as player_message
       FROM messages
       WHERE recipient_id = :userId AND is_deleted = FALSE`,
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );

    res.json(stats[0]);
  } catch (error) {
    console.error('[GET /api/messages/stats/:userId] Error:', error);
    res.status(500).json({ error: 'Failed to fetch message stats' });
  }
});

export default router;