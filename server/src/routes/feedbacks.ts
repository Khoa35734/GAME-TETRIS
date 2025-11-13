import express from 'express';
import { sequelize } from '../stores/postgres';
import { QueryTypes } from 'sequelize';

const router = express.Router();

// Fetch all feedbacks
router.get('/', async (req, res) => {
  try {
    const feedbacks = await sequelize.query(
      `SELECT 
        f.feedback_id AS id,
        f.user_id,
        u.user_name,
        f.category,
        f.subject,
        f.description AS message,
        f.status,
        f.admin_response,
        f.created_at
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.user_id
      ORDER BY f.created_at DESC`,
      { type: QueryTypes.SELECT }
    );
    res.json(feedbacks);
  } catch (err) {
    console.error('[Feedbacks] Error fetching feedbacks:', err);
    res.status(500).json({ 
      error: 'Database error',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Get single feedback by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [feedback] = await sequelize.query(
      `SELECT 
        f.feedback_id AS id,
        f.user_id,
        u.user_name,
        f.category,
        f.subject,
        f.description AS message,
        f.status,
        f.admin_response,
        f.created_at
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.user_id
      WHERE f.feedback_id = :id`,
      { 
        replacements: { id },
        type: QueryTypes.SELECT 
      }
    );
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found.' });
    }
    
    res.json(feedback);
  } catch (err) {
    console.error('[Feedbacks] Error fetching feedback:', err);
    res.status(500).json({ message: 'Error fetching feedback.' });
  }
});

// Create a new feedback
router.post('/', async (req, res) => {
  const { user_id, message, category, subject } = req.body;

  if (!user_id || !message) {
    return res.status(400).json({ message: 'Missing required fields (user_id, message).' });
  }

  try {
    const [newFeedback] = await sequelize.query(
      `INSERT INTO feedback (user_id, description, category, subject, status, created_at) 
       VALUES (:user_id, :message, :category, :subject, 'pending', NOW()) RETURNING *`,
      {
        replacements: { 
          user_id, 
          message, 
          category: category || 'general',
          subject: subject || 'Feedback'
        },
        type: QueryTypes.INSERT,
      }
    );
    res.status(201).json(newFeedback);
  } catch (err) {
    console.error('[Feedbacks] Error creating feedback:', err);
    res.status(500).json({ message: 'Error creating feedback.' });
  }
});

// Update feedback status
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Missing status field.' });
  }

  const validStatuses = ['pending', 'in_review', 'resolved', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    await sequelize.query(
      `UPDATE feedback SET status = :status WHERE feedback_id = :id`,
      {
        replacements: { id, status },
        type: QueryTypes.UPDATE,
      }
    );

    res.json({ message: 'Feedback status updated successfully.' });
  } catch (err) {
    console.error('[Feedbacks] Error updating feedback status:', err);
    res.status(500).json({ message: 'Error updating feedback status.' });
  }
});

// Add admin response to feedback
router.put('/:id/response', async (req, res) => {
  const { id } = req.params;
  const { admin_response } = req.body;

  if (!admin_response) {
    return res.status(400).json({ message: 'Missing admin_response field.' });
  }

  try {
    await sequelize.query(
      `UPDATE feedback 
       SET admin_response = :admin_response, status = 'resolved'
       WHERE feedback_id = :id`,
      {
        replacements: { id, admin_response },
        type: QueryTypes.UPDATE,
      }
    );

    res.json({ message: 'Admin response added successfully.' });
  } catch (err) {
    console.error('[Feedbacks] Error adding admin response:', err);
    res.status(500).json({ message: 'Error adding admin response.' });
  }
});

// Update feedback (full update)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { category, subject, message, status, admin_response } = req.body;

  try {
    const updates: string[] = [];
    const replacements: any = { id };

    if (category !== undefined) {
      updates.push('category = :category');
      replacements.category = category;
    }
    if (subject !== undefined) {
      updates.push('subject = :subject');
      replacements.subject = subject;
    }
    if (message !== undefined) {
      updates.push('description = :message');
      replacements.message = message;
    }
    if (status !== undefined) {
      updates.push('status = :status');
      replacements.status = status;
    }
    if (admin_response !== undefined) {
      updates.push('admin_response = :admin_response');
      replacements.admin_response = admin_response;
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update.' });
    }

    await sequelize.query(
      `UPDATE feedback SET ${updates.join(', ')} WHERE feedback_id = :id`,
      {
        replacements,
        type: QueryTypes.UPDATE,
      }
    );

    res.json({ message: 'Feedback updated successfully.' });
  } catch (err) {
    console.error('[Feedbacks] Error updating feedback:', err);
    res.status(500).json({ message: 'Error updating feedback.' });
  }
});

// Delete a feedback
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await sequelize.query(
      `DELETE FROM feedback WHERE feedback_id = :id`,
      {
        replacements: { id },
        type: QueryTypes.DELETE,
      }
    );

    res.json({ message: 'Feedback deleted successfully.' });
  } catch (err) {
    console.error('[Feedbacks] Error deleting feedback:', err);
    res.status(500).json({ message: 'Error deleting feedback.' });
  }
});

export default router;