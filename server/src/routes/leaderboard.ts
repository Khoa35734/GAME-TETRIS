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
 * Get leaderboard with search, sort, and pagination
 */
router.get('/', async (req: Request<{}, {}, {}, LeaderboardQuery>, res: Response) => {
  try {
    const {
      search = '',
      sort = 'rating',
      order = 'desc',
      limit = '50',
      offset = '0'
    } = req.query;

    const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100
    const offsetNum = parseInt(offset) || 0;

    // Build WHERE clause for search
    let whereClause = 'WHERE u.is_active = TRUE';
    const queryParams: any[] = [];
    
    if (search && search.trim()) {
      queryParams.push(`%${search.trim()}%`);
      whereClause += ` AND (u.username ILIKE $${queryParams.length} OR u.email ILIKE $${queryParams.length})`;
    }

    // Build ORDER BY clause
    let orderByClause = '';
    switch (sort) {
      case 'rating':
        orderByClause = 'u.elo_rating';
        break;
      case 'wins':
        orderByClause = 'u.games_won';
        break;
      case 'games':
        orderByClause = 'u.games_played';
        break;
      case 'winrate':
        orderByClause = 'CASE WHEN u.games_played > 0 THEN (u.games_won::FLOAT / u.games_played) ELSE 0 END';
        break;
      default:
        orderByClause = 'u.elo_rating';
    }
    orderByClause += ` ${order.toUpperCase()}`;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `;
    const countResult = await sequelize.query(countQuery, {
      replacements: queryParams,
      type: QueryTypes.SELECT
    }) as any[];
    const totalCount = parseInt(countResult[0].total);

    // Get leaderboard data
    queryParams.push(limitNum, offsetNum);
    const dataQuery = `
      SELECT 
        u.account_id,
        u.username,
        u.email,
        u.elo_rating,
        u.games_played,
        u.games_won,
        u.games_lost,
        u.created_at,
        u.last_login,
        CASE 
          WHEN u.games_played > 0 
          THEN ROUND((u.games_won::NUMERIC / u.games_played) * 100, 2)
          ELSE 0 
        END as win_rate,
        ROW_NUMBER() OVER (ORDER BY ${orderByClause}) as rank
      FROM users u
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const result = await sequelize.query(dataQuery, {
      replacements: queryParams,
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: result,
      pagination: {
        total: totalCount,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
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
        COUNT(*) FILTER (WHERE games_played > 0) as active_players,
        AVG(elo_rating)::INTEGER as avg_rating,
        MAX(elo_rating) as max_rating,
        MIN(elo_rating) FILTER (WHERE games_played > 0) as min_rating,
        SUM(games_played) as total_games,
        SUM(games_won) as total_wins
      FROM users
      WHERE is_active = TRUE
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
