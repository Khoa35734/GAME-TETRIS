// routes/messages.ts
import { Router, Request, Response } from 'express';
import { sequelize } from '../stores/postgres';
import { QueryTypes } from 'sequelize';

const router = Router();

// ================================================
// GET /api/messages/stats/:userId - Thống kê tin nhắn
// ⚠️ Đặt TRƯỚC để không bị router.get('/:id') bắt nhầm
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
        type: QueryTypes.SELECT,
      }
    );
    res.json(stats[0]);
  } catch (error) {
    console.error('[GET /api/messages/stats/:userId] Error:', error);
    res.status(500).json({ error: 'Failed to fetch message stats' });
  }
});

// ================================================
// GET /api/messages - Lấy tất cả tin nhắn của user
// ================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId;
    const filter = req.query.filter || 'all';
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    let where = 'WHERE m.recipient_id = :userId AND m.is_deleted = FALSE';
    if (filter === 'unread') where += ' AND m.is_read = FALSE';
    if (filter === 'starred') where += ' AND m.is_starred = TRUE';

    const messages = await sequelize.query(
      `
      SELECT 
        m.message_id, m.recipient_id, m.sender_id, m.message_type,
        m.subject, m.content, m.is_read, m.is_starred, m.is_deleted,
        m.metadata, m.created_at, m.read_at,
        sender.user_name AS sender_name, sender.email AS sender_email
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.user_id
      ${where}
      ORDER BY m.created_at DESC
      `,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );

    res.json({ messages });
  } catch (error) {
    console.error('[GET /api/messages] Error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ================================================
// GET /api/messages/:id - Chi tiết 1 tin nhắn
// ================================================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows = await sequelize.query(
      `
      SELECT 
        m.*, 
        sender.user_name AS sender_name, sender.email AS sender_email,
        recipient.user_name AS recipient_name, recipient.email AS recipient_email
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.user_id
      LEFT JOIN users recipient ON m.recipient_id = recipient.user_id
      WHERE m.message_id = :id
      `,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    if (!rows.length) return res.status(404).json({ error: 'Message not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('[GET /api/messages/:id] Error:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// ================================================
// POST /api/messages - Gửi tin nhắn mới
// ================================================
router.post('/', async (req: Request, res: Response) => {
  try {
    const { recipient_id, sender_id, message_type = 'player_message', subject, content, metadata } = req.body;
    if (!recipient_id || !subject || !content) {
      return res.status(400).json({ error: 'recipient_id, subject, content required' });
    }

    const [result] = await sequelize.query(
      `
      INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, metadata)
      VALUES (:recipient_id, :sender_id, :message_type, :subject, :content, :metadata)
      RETURNING *
      `,
      {
        replacements: {
          recipient_id,
          sender_id: sender_id || null,
          message_type,
          subject,
          content,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
        type: QueryTypes.INSERT,
      }
    );

    res.status(201).json({ success: true, data: result });
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
      `UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE message_id = :id`,
      { replacements: { id }, type: QueryTypes.UPDATE }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[PATCH /api/messages/:id/read] Error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ================================================
// PATCH /api/messages/:id/star - Đánh dấu sao
// ================================================
router.patch('/:id/star', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { starred } = req.body;
    await sequelize.query(
      `UPDATE messages SET is_starred = :starred WHERE message_id = :id`,
      { replacements: { id, starred: starred ?? true }, type: QueryTypes.UPDATE }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[PATCH /api/messages/:id/star] Error:', error);
    res.status(500).json({ error: 'Failed to toggle star' });
  }
});

// ================================================
// PATCH /api/messages/bulk/read - Đánh dấu nhiều tin
// ================================================
router.patch('/bulk/read', async (req: Request, res: Response) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0)
      return res.status(400).json({ error: 'messageIds array required' });

    await sequelize.query(
      `UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE message_id = ANY(:messageIds)`,
      { replacements: { messageIds }, type: QueryTypes.UPDATE }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[PATCH /api/messages/bulk/read] Error:', error);
    res.status(500).json({ error: 'Failed bulk read' });
  }
});

// ================================================
// DELETE /api/messages/:id và /bulk/delete
// ================================================
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await sequelize.query(
      `UPDATE messages SET is_deleted = TRUE, deleted_at = NOW() WHERE message_id = :id`,
      { replacements: { id }, type: QueryTypes.UPDATE }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/messages/:id] Error:', error);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

router.delete('/bulk/delete', async (req: Request, res: Response) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0)
      return res.status(400).json({ error: 'messageIds array required' });

    await sequelize.query(
      `UPDATE messages SET is_deleted = TRUE, deleted_at = NOW() WHERE message_id = ANY(:messageIds)`,
      { replacements: { messageIds }, type: QueryTypes.UPDATE }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/messages/bulk/delete] Error:', error);
    res.status(500).json({ error: 'Failed bulk delete' });
  }
});

export default router;
