import express, { Request, Response } from 'express';
import { sequelize } from '../stores/postgres';
import { QueryTypes } from 'sequelize';

const router = express.Router();

interface LeaderboardQuery {
  search?: string;
  sort?: 'rating' | 'wins' | 'games' | 'winrate';
  order?: 'asc' | 'desc';
  limit?: string;
  offset?: string;
}

/**
 * GET /api/leaderboard
 * Get leaderboard - simplified version, just display the list
 */
router.get('/', async (req: Request<{}, {}, {}, LeaderboardQuery>, res: Response) => {
  console.log('[Leaderboard] 🎯 Request received');
  
  try {
    // Simple query - just get top 50 players by rank_points
    const dataQuery = `
      SELECT 
        u.user_id,
        u.user_name as username,
        u.email,
        l.rank_points as elo_rating,
        l.games_played,
        CASE 
          WHEN l.games_played > 0 THEN ROUND(l.games_played * l.winrate / 100)
          ELSE 0 
        END as games_won,
        CASE 
          WHEN l.games_played > 0 THEN (l.games_played - ROUND(l.games_played * l.winrate / 100))
          ELSE 0 
        END as games_lost,
        u.created_at,
        u.last_login,
        COALESCE(l.winrate, 0) as win_rate,
        l.rank_position as rank
      FROM leaderboards l
      INNER JOIN users u ON l.user_id = u.user_id
      WHERE u.is_active = TRUE
      ORDER BY l.rank_points DESC
      LIMIT 50
    `;

    console.log('[Leaderboard] Executing query...');

    const result = await sequelize.query(dataQuery, {
      type: QueryTypes.SELECT
    });

    console.log('[Leaderboard] ✅ Success! Found', result.length, 'players');

    res.json({
      success: true,
      data: result,
      pagination: {
        total: result.length,
        limit: 50,
        offset: 0,
        hasMore: false
      }
    });

  } catch (error) {
    console.error('[Leaderboard] ❌ ERROR:', error);
    console.error('[Leaderboard] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : 'No stack'
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/leaderboard/stats
 * Get overall leaderboard statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_players,
        COUNT(*) FILTER (WHERE l.games_played > 0) as active_players,
        COALESCE(AVG(l.rank_points)::INTEGER, 1000) as avg_rating,
        COALESCE(MAX(l.rank_points), 1000) as max_rating,
        COALESCE(MIN(l.rank_points) FILTER (WHERE l.games_played > 0), 1000) as min_rating,
        COALESCE(SUM(l.games_played), 0) as total_games,
        COALESCE(SUM(ROUND(l.games_played * l.winrate / 100)), 0) as total_wins
      FROM leaderboards l
      INNER JOIN users u ON l.user_id = u.user_id
      WHERE u.is_active = TRUE
    `;

    const result = await sequelize.query(statsQuery, {
      type: QueryTypes.SELECT
    }) as any[];
    const stats = result[0];

    res.json({
      success: true,
      stats: {
        totalPlayers: parseInt(stats.total_players) || 0,
        activePlayers: parseInt(stats.active_players) || 0,
        avgRating: parseInt(stats.avg_rating) || 1000,
        maxRating: parseInt(stats.max_rating) || 1000,
        minRating: parseInt(stats.min_rating) || 1000,
        totalGames: parseInt(stats.total_games) || 0,
        totalWins: parseInt(stats.total_wins) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/leaderboard/user/:userId
 * Get specific user's rank and stats
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const query = `
      WITH ranked_users AS (
        SELECT 
          account_id,
          username,
          elo_rating,
          games_played,
          games_won,
          games_lost,
          CASE 
            WHEN games_played > 0 
            THEN ROUND((games_won::NUMERIC / games_played) * 100, 2)
            ELSE 0 
          END as win_rate,
          ROW_NUMBER() OVER (ORDER BY elo_rating DESC) as rank
        FROM users
        WHERE is_active = TRUE
      )
      SELECT * FROM ranked_users
      WHERE account_id = $1
    `;

    const result = await sequelize.query(query, {
      replacements: [userId],
      type: QueryTypes.SELECT
    });

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('Error fetching user rank:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user rank',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/leaderboard/top/:count
 * Get top N players
 */
router.get('/top/:count', async (req: Request, res: Response) => {
  try {
    const count = Math.min(parseInt(req.params.count) || 10, 100); // Max 100

    const query = `
      SELECT 
        u.account_id,
        u.username,
        u.elo_rating,
        u.games_played,
        u.games_won,
        u.games_lost,
        CASE 
          WHEN u.games_played > 0 
          THEN ROUND((u.games_won::NUMERIC / u.games_played) * 100, 2)
          ELSE 0 
        END as win_rate,
        ROW_NUMBER() OVER (ORDER BY u.elo_rating DESC) as rank
      FROM users u
      WHERE u.is_active = TRUE AND u.games_played > 0
      ORDER BY u.elo_rating DESC
      LIMIT $1
    `;

    const result = await sequelize.query(query, {
      replacements: [count],
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching top players:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top players',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
