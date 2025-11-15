// Feedback Routes
// File: server/src/routes/feedback.ts
// Purpose: Handle user feedback, complaints, and player reports

import express, { Request, Response } from 'express';
import { Pool } from 'pg';

const router = express.Router();

// Create PostgreSQL pool
const createPool = (): Pool => {
  const host = process.env.PG_HOST || 'localhost';
  const port = Number(process.env.PG_PORT ?? 5432);
  const database = process.env.PG_DATABASE || process.env.PG_DB || 'tetris';
  const user = process.env.PG_USER || 'devuser';
  const passwordEnv = process.env.PG_PASSWORD;
  const password = typeof passwordEnv === 'string' && passwordEnv.length > 0
    ? passwordEnv
    : '123456';

  return new Pool({
    user,
    host,
    database,
    password,
    port,
  });
};

const pool = createPool();

/**
 * POST /api/feedback
 * Submit new feedback, complaint, or report
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      category,
      subject,
      description,
      priority,
    } = req.body;

    // Validation
    if (!userId || !category || !subject || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'category', 'subject', 'description'],
      });
    }

    // Generate unique feedback_id
    const feedbackId = `FB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert feedback into database
    const insertQuery = `
      INSERT INTO feedback (
        user_id,
        feedback_id,
        category,
        subject,
        description,
        priority,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id, created_at
    `;

    const result = await pool.query(insertQuery, [
      userId,
      feedbackId,
      category,
      subject,
      description,
      priority || 'medium',
    ]);

    const feedback = result.rows[0];

    console.log(`[Feedback] New feedback submitted by user ${userId}: ${subject}`);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: feedback.id,
      createdAt: feedback.created_at,
    });
  } catch (error) {
    console.error('[Feedback API] Error submitting feedback:', error);
    res.status(500).json({
      error: 'Failed to submit feedback',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/feedback/user/:userId
 * Get all feedback submitted by a specific user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const query = `
      SELECT 
        id,
        feedback_id,
        category,
        subject,
        description,
        status,
        priority,
        admin_response,
        created_at,
        updated_at,
        resolved_at
      FROM feedback
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      success: true,
      feedbacks: result.rows,
    });
  } catch (error) {
    console.error('[Feedback API] Error fetching user feedback:', error);
    res.status(500).json({
      error: 'Failed to fetch feedback',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/feedback/admin
 * Get all feedback for admin review (protected route - add auth middleware in production)
 */
router.get('/admin', async (req: Request, res: Response) => {
  try {
    const { status, priority, limit = 100 } = req.query;

    let query = `
      SELECT 
        f.id,
        f.feedback_id,
        f.user_id,
        u.user_name as submitter_username,
        f.category,
        f.subject,
        f.description,
        f.status,
        f.priority,
        f.admin_response,
        f.admin_id,
        f.created_at,
        f.updated_at,
        f.resolved_at
      FROM feedback f
      JOIN users u ON f.user_id = u.user_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND f.status = $${paramCount}`;
      params.push(status);
    }

    if (priority) {
      paramCount++;
      query += ` AND f.priority = $${paramCount}`;
      params.push(priority);
    }

    query += ` ORDER BY f.created_at DESC LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit as string) || 100);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      feedbacks: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('[Feedback API] Error fetching admin feedback:', error);
    res.status(500).json({
      error: 'Failed to fetch feedback',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * PATCH /api/feedback/:feedbackId/status
 * Update feedback status (admin only)
 */
// PATCH /api/feedback/:id/status - Update feedback status and admin response
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminResponse, adminId, priority } = req.body;

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;

      // Set resolved_at if status is resolved
      if (status === 'resolved') {
        updates.push(`resolved_at = CURRENT_TIMESTAMP`);
      }
    }

    if (adminResponse !== undefined) {
      updates.push(`admin_response = $${paramCount}`);
      values.push(adminResponse);
      paramCount++;
    }

    if (adminId) {
      updates.push(`admin_id = $${paramCount}`);
      values.push(adminId);
      paramCount++;
    }

    if (priority) {
      updates.push(`priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await pool.query(
      `UPDATE feedback SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    res.json({ message: 'Feedback updated successfully' });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

export default router;
