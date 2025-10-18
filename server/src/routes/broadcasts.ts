import express from 'express';
import { sequelize } from '../stores/postgres';
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