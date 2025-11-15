import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT ?? 5432),
  database: process.env.PG_DATABASE || process.env.PG_DB || 'postgres',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '123456789Quoc#',
});

router.get('/', async (req: Request, res: Response) => {
  const sortParam = req.query.sort === 'winrate' ? 'winrate' : 'rating';
  const limitParam = Math.min(Math.max(parseInt(String(req.query.limit ?? '100'), 10) || 100, 1), 200);
  const offsetParam = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);

  try {
    const query = `
      WITH ranked_players AS (
        SELECT
          u.user_id,
          u.user_name,
          COALESCE(u.elo_rating, 1000) AS elo_rating,
          COALESCE(u.win_streak, 0) AS win_streak,
          COALESCE(SUM(CASE WHEN m.winner_id = u.user_id THEN 1 ELSE 0 END), 0)::int AS games_won,
          COALESCE(SUM(CASE WHEN m.player1_id = u.user_id OR m.player2_id = u.user_id THEN 1 ELSE 0 END), 0)::int AS games_played,
          CASE
            WHEN COALESCE(SUM(CASE WHEN m.player1_id = u.user_id OR m.player2_id = u.user_id THEN 1 ELSE 0 END), 0) = 0
              THEN 0
            ELSE ROUND(
              (COALESCE(SUM(CASE WHEN m.winner_id = u.user_id THEN 1 ELSE 0 END), 0)::numeric * 100.0)
              /
              NULLIF(COALESCE(SUM(CASE WHEN m.player1_id = u.user_id OR m.player2_id = u.user_id THEN 1 ELSE 0 END), 0)::numeric, 0),
              1
            )
          END AS win_rate
        FROM users u
        LEFT JOIN matches m
          ON m.mode = 'ranked'
         AND (m.player1_id = u.user_id OR m.player2_id = u.user_id)
        WHERE COALESCE(LOWER(u.role), 'player') <> 'admin'
        GROUP BY u.user_id
      )
      SELECT *
      FROM ranked_players
      ORDER BY
        ${sortParam === 'rating' ? 'elo_rating DESC, win_rate DESC' : 'win_rate DESC, games_played DESC, elo_rating DESC'}
      OFFSET $1
      LIMIT $2;
    `;

    const { rows } = await pool.query(query, [offsetParam, limitParam]);

    const payload = rows.map((row, index) => {
      const gamesPlayed = Number(row.games_played) || 0;
      const gamesWon = Number(row.games_won) || 0;
      const gamesLost = Math.max(gamesPlayed - gamesWon, 0);

      return {
        account_id: Number(row.user_id),
        username: row.user_name,
        elo_rating: Number(row.elo_rating) || 0,
        games_played: gamesPlayed,
        games_won: gamesWon,
        games_lost: gamesLost,
        win_rate: Number(row.win_rate) || 0,
        win_streak: Number(row.win_streak) || 0,
        rank: offsetParam + index + 1,
      };
    });

    res.json({
      success: true,
      data: payload,
      pagination: {
        total: payload.length,
        limit: limitParam,
        offset: offsetParam,
        hasMore: payload.length === limitParam,
      },
    });
  } catch (error) {
    console.error('[Leaderboard] Failed to fetch leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
