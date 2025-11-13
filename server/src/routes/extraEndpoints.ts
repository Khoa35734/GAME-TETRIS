import { Express } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../stores/postgres';
import { redis } from '../stores/redisStore';

export function mountExtraEndpoints(app: Express) {
  // Reports
  app.get('/api/reports', async (_req, res) => {
    try {
      console.log('[GET /api/reports] Fetching reports from database...');
      const result = await sequelize.query(
        `
        SELECT 
          ur.report_id AS id,
          ur.reporter_id,
          u1.user_name AS reporter_name,
          ur.reported_user_id,
          u2.user_name AS reported_user_name,
          ur.report_type AS type,
          ur.description AS message,
          ur.status,
          ur.evidence_url,
          ur.created_at
        FROM user_reports ur
        LEFT JOIN users u1 ON ur.reporter_id = u1.user_id
        LEFT JOIN users u2 ON ur.reported_user_id = u2.user_id
        ORDER BY ur.created_at DESC
        LIMIT 100
        `,
        { type: QueryTypes.SELECT }
      );
      res.json(result);
    } catch (err) {
      console.error('[GET /api/reports] Database Error:', err);
      res.status(500).json({
        error: 'Database error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // Feedbacks
  app.get('/api/feedbacks', async (_req, res) => {
    try {
      console.log('[GET /api/feedbacks] Fetching feedbacks from database...');
      const result = await sequelize.query(
        `
        SELECT 
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
        ORDER BY f.created_at DESC
        LIMIT 100
        `,
        { type: QueryTypes.SELECT }
      );
      res.json(result);
    } catch (err) {
      console.error('[GET /api/feedbacks] Database Error:', err);
      res.status(500).json({
        error: 'Database error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // Broadcasts
  app.get('/api/broadcasts', async (_req, res) => {
    try {
      console.log('[GET /api/broadcasts] Fetching broadcasts from database...');
      const result = await sequelize.query(
        `
        SELECT 
          bm.message_id AS id,
          bm.title,
          bm.content AS message,
          bm.message_type,
          bm.priority,
          bm.is_active,
          u.user_name AS admin_name,
          bm.start_date,
          bm.end_date,
          bm.created_at AS sent_at
        FROM broadcast_messages bm
        LEFT JOIN users u ON bm.admin_id = u.user_id
        ORDER BY bm.created_at DESC
        LIMIT 50
        `,
        { type: QueryTypes.SELECT }
      );
      res.json(result);
    } catch (err) {
      console.error('[GET /api/broadcasts] Database Error:', err);
      res.status(500).json({
        error: 'Database error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // Rooms (Redis)
  app.get('/api/rooms', async (_req, res) => {
    try {
      console.log('[GET /api/rooms] Fetching rooms from Redis...');
      const matchKeys = await redis.keys('match:*');
      const rooms: any[] = [];
      for (const key of matchKeys) {
        const matchData = await redis.get(key);
        if (matchData) {
          const match = JSON.parse(matchData);
          rooms.push({
            id: match.matchId,
            players: match.players.length,
            status: match.status,
            createdAt: match.createdAt || Date.now(),
          });
        }
      }
      res.json(rooms);
    } catch (err) {
      console.error('[GET /api/rooms] Redis Error:', err);
      res.status(500).json({
        error: 'Redis error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // Players
  app.get('/api/players', async (_req, res) => {
    try {
      console.log('[GET /api/players] Fetching players from database...');
      const result = await sequelize.query(
        `
        SELECT 
          u.user_id AS id,
          u.user_name AS name,
          u.email,
          COALESCE(us.elo_rating, 1000) AS rating,
          u.role,
          u.is_active,
          u.created_at,
          u.last_login,
          COALESCE(us.total_games_played, 0) AS games_played,
          COALESCE(us.total_games_won, 0) AS games_won
        FROM users u
        LEFT JOIN user_stats us ON u.user_id = us.user_id
        ORDER BY COALESCE(us.elo_rating, 1000) DESC, u.created_at DESC
        LIMIT 200
        `,
        { type: QueryTypes.SELECT }
      );
      res.json(result);
    } catch (err) {
      console.error('[GET /api/players] Database Error:', err);
      res.status(500).json({
        error: 'Database error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });
}
