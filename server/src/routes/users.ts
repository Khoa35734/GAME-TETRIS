import express from 'express';
import { sequelize } from '../stores/postgres';
import { QueryTypes } from 'sequelize';

const router = express.Router();

// Lookup by username (query param ?username=...)
router.get('/lookup', async (req, res) => {
  const username = String(req.query.username || '').trim();
  if (!username) return res.status(400).json({ message: 'Missing username query parameter.' });

  try {
    const [user] = await sequelize.query(
      `SELECT user_id AS userId, user_name AS username FROM users WHERE LOWER(user_name) = LOWER(:username) LIMIT 1`,
      {
        replacements: { username },
        type: QueryTypes.SELECT,
      }
    ) as any[];

    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (err) {
    console.error('[Users] Lookup error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user by id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [user] = await sequelize.query(
      `SELECT user_id AS userId, user_name AS username FROM users WHERE user_id = :id LIMIT 1`,
      {
        replacements: { id },
        type: QueryTypes.SELECT,
      }
    ) as any[];

    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (err) {
    console.error('[Users] Fetch by id error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
