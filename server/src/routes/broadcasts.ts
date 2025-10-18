import express from 'express';
import { sequelize } from '../postgres';
import { QueryTypes } from 'sequelize';

const router = express.Router();

// Fetch all broadcasts
router.get('/', async (req, res) => {
  try {
    const broadcasts = await sequelize.query(
      `SELECT 
        bm.message_id AS id,
        bm.admin_id,
        bm.title,
        bm.content AS message,
        bm.message_type AS type,
        bm.priority,
        bm.is_active,
        bm.start_date,
        bm.end_date,
        bm.created_at,
        bm.updated_at,
        u.user_name AS admin_name
      FROM broadcast_messages bm
      LEFT JOIN users u ON bm.admin_id = u.user_id
      ORDER BY bm.created_at DESC`,
      { type: QueryTypes.SELECT }
    );
    res.json(broadcasts);
  } catch (err) {
    console.error('[Broadcasts] Error fetching broadcasts:', err);
    res.status(500).json({ 
      error: 'Database error',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Get single broadcast by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [broadcast] = await sequelize.query(
      `SELECT 
        bm.message_id AS id,
        bm.admin_id,
        bm.title,
        bm.content AS message,
        bm.message_type AS type,
        bm.priority,
        bm.is_active,
        bm.start_date,
        bm.end_date,
        bm.created_at,
        bm.updated_at,
        u.user_name AS admin_name
      FROM broadcast_messages bm
      LEFT JOIN users u ON bm.admin_id = u.user_id
      WHERE bm.message_id = :id`,
      { 
        replacements: { id },
        type: QueryTypes.SELECT 
      }
    );
    
    if (!broadcast) {
      return res.status(404).json({ message: 'Broadcast not found' });
    }
    
    res.json(broadcast);
  } catch (err) {
    console.error('[Broadcasts] Error fetching broadcast:', err);
    res.status(500).json({ 
      error: 'Database error',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Create a new broadcast
router.post('/', async (req, res) => {
  const { admin_id, title, message, type, priority, is_active, start_date, end_date } = req.body;

  if (!admin_id || !title || !message) {
    return res.status(400).json({ 
      message: 'Missing required fields (admin_id, title, message)' 
    });
  }

  try {
    // 1. Tạo broadcast
    const [newBroadcast] = await sequelize.query(
      `INSERT INTO broadcast_messages 
        (admin_id, title, content, message_type, priority, is_active, start_date, end_date, created_at, updated_at) 
       VALUES (:admin_id, :title, :message, :type, :priority, :is_active, :start_date, :end_date, NOW(), NOW()) 
       RETURNING 
        message_id AS id,
        admin_id,
        title,
        content AS message,
        message_type AS type,
        priority,
        is_active,
        start_date,
        end_date,
        created_at,
        updated_at`,
      {
        replacements: { 
          admin_id,
          title,
          message,
          type: type || 'info',
          priority: priority || 'medium',
          is_active: is_active !== undefined ? is_active : true,
          start_date: start_date || null,
          end_date: end_date || null
        },
        type: QueryTypes.INSERT,
      }
    );

    // 2. 🚀 TỰ ĐỘNG GỬI TIN NHẮN VÀO HỘP THƯ CỦA TẤT CẢ NGƯỜI CHƠI
    try {
      const broadcastId = (newBroadcast as any).id;
      
      // Lấy thông tin admin để hiển thị tên người gửi
      const [adminInfo] = await sequelize.query(
        `SELECT user_name FROM users WHERE user_id = :admin_id`,
        {
          replacements: { admin_id },
          type: QueryTypes.SELECT
        }
      );
      
      const adminName = (adminInfo as any)?.user_name || 'Admin';
      
      // Gửi tin nhắn cho TẤT CẢ users (trừ chính admin)
      await sequelize.query(
        `INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, metadata)
         SELECT 
           user_id,
           :admin_id,
           'broadcast',
           :subject,
           :content,
           :metadata
         FROM users
         WHERE user_id != :admin_id
           AND is_active = TRUE`,
        {
          replacements: {
            admin_id,
            subject: `📢 ${title}`,
            content: `${message}\n\n---\nGửi bởi: ${adminName}`,
            metadata: JSON.stringify({
              broadcast_id: broadcastId,
              broadcast_type: type || 'info',
              priority: priority || 'medium'
            })
          },
          type: QueryTypes.INSERT
        }
      );
      
      console.log(`[Broadcasts] ✅ Broadcast #${broadcastId} created and sent to all users' inbox`);
    } catch (inboxError) {
      // Nếu gửi inbox lỗi, vẫn trả về broadcast đã tạo thành công
      console.error('[Broadcasts] ⚠️ Error sending to inbox (broadcast still created):', inboxError);
    }

    res.status(201).json(newBroadcast);
  } catch (err) {
    console.error('[Broadcasts] Error creating broadcast:', err);
    res.status(500).json({ 
      error: 'Database error',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Update a broadcast
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, message, type, priority, is_active, start_date, end_date } = req.body;

  try {
    const [updated] = await sequelize.query(
      `UPDATE broadcast_messages 
       SET 
        title = COALESCE(:title, title),
        content = COALESCE(:message, content),
        message_type = COALESCE(:type, message_type),
        priority = COALESCE(:priority, priority),
        is_active = COALESCE(:is_active, is_active),
        start_date = COALESCE(:start_date, start_date),
        end_date = COALESCE(:end_date, end_date),
        updated_at = NOW()
       WHERE message_id = :id
       RETURNING 
        message_id AS id,
        admin_id,
        title,
        content AS message,
        message_type AS type,
        priority,
        is_active,
        start_date,
        end_date,
        created_at,
        updated_at`,
      {
        replacements: { 
          id,
          title,
          message,
          type,
          priority,
          is_active,
          start_date,
          end_date
        },
        type: QueryTypes.UPDATE,
      }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Broadcast not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('[Broadcasts] Error updating broadcast:', err);
    res.status(500).json({ 
      error: 'Database error',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Delete a broadcast
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await sequelize.query(
      `DELETE FROM broadcast_messages WHERE message_id = :id`,
      {
        replacements: { id },
        type: QueryTypes.DELETE,
      }
    );

    res.json({ message: 'Broadcast deleted successfully' });
  } catch (err) {
    console.error('[Broadcasts] Error deleting broadcast:', err);
    res.status(500).json({ 
      error: 'Database error',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Toggle active status
router.patch('/:id/toggle', async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await sequelize.query(
      `UPDATE broadcast_messages 
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE message_id = :id
       RETURNING 
        message_id AS id,
        is_active`,
      {
        replacements: { id },
        type: QueryTypes.UPDATE,
      }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Broadcast not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('[Broadcasts] Error toggling broadcast:', err);
    res.status(500).json({ 
      error: 'Database error',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

export default router;