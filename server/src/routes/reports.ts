import express from 'express';
import { sequelize } from '../stores/postgres'; // Ensure you have a Sequelize instance configured
import { QueryTypes } from 'sequelize';

const router = express.Router();

// Fetch all reports
router.get('/', async (req, res) => {
  try {
    const reports = await sequelize.query(
      `SELECT 
        ur.report_id AS id,
        ur.reporter_id,
        r.user_name AS reporter_username,
        ur.reported_user_id,
        ru.user_name AS reported_username,
        ur.report_type AS type,
        ur.reason,
        ur.description AS message,
        ur.status,
        ur.created_at,
        ur.resolved_at,
        ur.resolved_by,
        res.user_name AS resolved_by_username
      FROM user_reports ur
      LEFT JOIN users r ON ur.reporter_id = r.user_id
      LEFT JOIN users ru ON ur.reported_user_id = ru.user_id
      LEFT JOIN users res ON ur.resolved_by = res.user_id
      ORDER BY ur.created_at DESC`,
      { type: QueryTypes.SELECT }
    );
    res.json(reports);
  } catch (err) {
    console.error('[Reports] Error fetching reports:', err);
    res.status(500).json({ message: 'Error fetching reports.' });
  }
});

// Get single report by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [report] = await sequelize.query(
      `SELECT 
        ur.report_id AS id,
        ur.reporter_id,
        r.user_name AS reporter_username,
        ur.reported_user_id,
        ru.user_name AS reported_username,
        ur.report_type AS type,
        ur.reason,
        ur.description AS message,
        ur.status,
        ur.created_at,
        ur.resolved_at,
        ur.resolved_by,
        res.user_name AS resolved_by_username
      FROM user_reports ur
      LEFT JOIN users r ON ur.reporter_id = r.user_id
      LEFT JOIN users ru ON ur.reported_user_id = ru.user_id
      LEFT JOIN users res ON ur.resolved_by = res.user_id
      WHERE ur.report_id = :id`,
      { 
        replacements: { id },
        type: QueryTypes.SELECT 
      }
    );
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }
    
    res.json(report);
  } catch (err) {
    console.error('[Reports] Error fetching report:', err);
    res.status(500).json({ message: 'Error fetching report.' });
  }
});

// Create a new report
router.post('/', async (req, res) => {
  const { reporter_id, reported_user_id, type, reason, message } = req.body;

  if (!reporter_id || !reported_user_id || !type || !message) {
    return res.status(400).json({ message: 'Missing required fields (reporter_id, reported_user_id, type, message).' });
  }

  try {
    const [newReport] = await sequelize.query(
      `INSERT INTO user_reports (reporter_id, reported_user_id, report_type, reason, description, status, created_at) 
       VALUES (:reporter_id, :reported_user_id, :type, :reason, :message, 'pending', NOW()) RETURNING *`,
      {
        replacements: { 
          reporter_id, 
          reported_user_id,
          type, 
          reason: reason || '',
          message 
        },
        type: QueryTypes.INSERT,
      }
    );
    res.status(201).json(newReport);
  } catch (err) {
    console.error('[Reports] Error creating report:', err);
    res.status(500).json({ message: 'Error creating report.' });
  }
});

// Update report status
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, resolved_by } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Missing status field.' });
  }

  const validStatuses = ['pending', 'investigating', 'resolved', 'dismissed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    const updates: string[] = ['status = :status'];
    const replacements: any = { id, status };

    if (status === 'resolved' || status === 'dismissed') {
      updates.push('resolved_at = NOW()');
      if (resolved_by) {
        updates.push('resolved_by = :resolved_by');
        replacements.resolved_by = resolved_by;
      }
    }

    await sequelize.query(
      `UPDATE user_reports SET ${updates.join(', ')} WHERE report_id = :id`,
      {
        replacements,
        type: QueryTypes.UPDATE,
      }
    );

    res.json({ message: 'Report status updated successfully.' });
  } catch (err) {
    console.error('[Reports] Error updating report:', err);
    res.status(500).json({ message: 'Error updating report.' });
  }
});

// Update a report's full data
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { type, reason, message, status, resolved_by } = req.body;

  try {
    const updates: string[] = [];
    const replacements: any = { id };

    if (type !== undefined) {
      updates.push('report_type = :type');
      replacements.type = type;
    }
    if (reason !== undefined) {
      updates.push('reason = :reason');
      replacements.reason = reason;
    }
    if (message !== undefined) {
      updates.push('description = :message');
      replacements.message = message;
    }
    if (status !== undefined) {
      updates.push('status = :status');
      replacements.status = status;
      
      if (status === 'resolved' || status === 'dismissed') {
        updates.push('resolved_at = NOW()');
        if (resolved_by) {
          updates.push('resolved_by = :resolved_by');
          replacements.resolved_by = resolved_by;
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update.' });
    }

    await sequelize.query(
      `UPDATE user_reports SET ${updates.join(', ')} WHERE report_id = :id`,
      {
        replacements,
        type: QueryTypes.UPDATE,
      }
    );

    res.json({ message: 'Report updated successfully.' });
  } catch (err) {
    console.error('[Reports] Error updating report:', err);
    res.status(500).json({ message: 'Error updating report.' });
  }
});

// Delete a report
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await sequelize.query(
      `DELETE FROM user_reports WHERE report_id = :id`,
      {
        replacements: { id },
        type: QueryTypes.DELETE,
      }
    );

    res.json({ message: 'Report deleted successfully.' });
  } catch (err) {
    console.error('[Reports] Error deleting report:', err);
    res.status(500).json({ message: 'Error deleting report.' });
  }
});

export default router;