import express from 'express';
import { sequelize } from '../postgres';
import { QueryTypes } from 'sequelize';

const router = express.Router();

// Lấy danh sách phòng
router.get('/rooms', async (req, res) => {
  try {
    const rooms = await sequelize.query(
      `SELECT * FROM game_rooms ORDER BY created_at DESC`,
      { type: QueryTypes.SELECT }
    );
    res.json(rooms);
  } catch (err) {
    console.error('[Admin] Error fetching rooms:', err);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách phòng.' });
  }
});

// Lấy danh sách người chơi
router.get('/players', async (req, res) => {
  try {
    const players = await sequelize.query(
      `SELECT user_id, user_name, rating, online, in_room FROM users ORDER BY user_name ASC`,
      { type: QueryTypes.SELECT }
    );
    res.json(players);
  } catch (err) {
    console.error('[Admin] Error fetching players:', err);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách người chơi.' });
  }
});

// Lấy thống kê
router.get('/stats', async (req, res) => {
  try {
    const stats = await sequelize.query(
      `SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS total_active_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS new_users_week,
        (SELECT COUNT(*) FROM game_sessions WHERE started_at >= CURRENT_DATE) AS games_today,
        (SELECT COUNT(*) FROM feedback WHERE status = 'pending') AS pending_feedback,
        (SELECT COUNT(*) FROM user_reports WHERE status = 'pending') AS pending_reports,
        (SELECT COUNT(*) FROM users WHERE is_banned = TRUE) AS banned_users,
        (SELECT COUNT(*) FROM game_rooms WHERE room_status = 'in_game') AS active_rooms`,
      { type: QueryTypes.SELECT }
    );
    res.json(stats[0]);
  } catch (err) {
    console.error('[Admin] Error fetching stats:', err);
    res.status(500).json({ message: 'Lỗi khi lấy thống kê.' });
  }
});

export default router;