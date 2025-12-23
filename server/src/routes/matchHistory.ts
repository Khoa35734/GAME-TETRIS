// File: server/src/routes/matchHistory.ts
import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

// Create database pool
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT ?? 5432),
  database: process.env.PG_DATABASE || process.env.PG_DB || 'postgres',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '123456789Quoc#',
});

/**
 * GET /api/match-history/:userId
 * Lấy 10 trận đấu gần nhất của user
 */
router.get('/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    // Query lấy 10 trận gần nhất
    const matchesQuery = `
      SELECT 
        m.match_id,
        m.player1_id,
        m.player2_id,
        p1.user_name as player1_name,
        p2.user_name as player2_name,
        m.player1_wins,
        m.player2_wins,
        m.winner_id,
        w.user_name as winner_name,
        m.mode,
        m.match_timestamp,
        m.end_reason,
        CASE 
          WHEN m.player1_id = $1 THEN 
            CASE WHEN m.winner_id = $1 THEN 'win' ELSE 'lose' END
          WHEN m.player2_id = $1 THEN 
            CASE WHEN m.winner_id = $1 THEN 'win' ELSE 'lose' END
          ELSE 'unknown'
        END as result
      FROM matches m
      JOIN users p1 ON m.player1_id = p1.user_id
      JOIN users p2 ON m.player2_id = p2.user_id
      LEFT JOIN users w ON m.winner_id = w.user_id
      WHERE m.player1_id = $1 OR m.player2_id = $1
      ORDER BY m.match_timestamp DESC
      LIMIT 10
    `;

    const matchesResult = await pool.query(matchesQuery, [userId]);

    // Format response to match client interface
    const matches = matchesResult.rows.map((row) => {
      const isPlayer1 = Number(row.player1_id) === userId;
      const selfName = isPlayer1 ? row.player1_name : row.player2_name;
      const opponentName = isPlayer1 ? row.player2_name : row.player1_name;
      const selfScore = isPlayer1 ? row.player1_wins : row.player2_wins;
      const opponentScore = isPlayer1 ? row.player2_wins : row.player1_wins;

      return {
        match_id: row.match_id,
        player1_id: row.player1_id,
        player2_id: row.player2_id,
        player1_name: row.player1_name,
        player2_name: row.player2_name,
        winner_id: row.winner_id,
        player1_score: row.player1_wins,
        player2_score: row.player2_wins,
        self_score: selfScore,
        opponent_score: opponentScore,
        match_timestamp: row.match_timestamp,
        result: (row.result === 'win' ? 'WIN' : 'LOSE') as 'WIN' | 'LOSE',
        opponent_name: opponentName,
        score: `${selfScore}-${opponentScore}`,
        mode: row.mode || 'casual', // Add mode field
        end_reason: row.end_reason, // Add end_reason field
      };
    });

    res.json(matches);
  } catch (error) {
    console.error('[Match History API] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch match history',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/match-history/:userId/:matchId
 * Lấy chi tiết 1 trận đấu (bao gồm stats từng ván)
 */
router.get('/stats/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  console.log('[MatchHistory] Stats request for userId param:', req.params.userId, '-> parsed:', userId);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const userQuery = await pool.query(
      'SELECT user_id, user_name, elo_rating, win_streak FROM users WHERE user_id = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userQuery.rows[0];

    const statsQuery = await pool.query(
      `SELECT 
        COUNT(*) as total_matches,
        SUM(CASE WHEN winner_id = $1 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN winner_id != $1 THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN mode = 'ranked' THEN 1 ELSE 0 END) as ranked_matches,
        SUM(CASE WHEN mode = 'casual' THEN 1 ELSE 0 END) as casual_matches
      FROM matches 
      WHERE player1_id = $1 OR player2_id = $1`,
      [userId]
    );

    const stats = statsQuery.rows[0];

    res.json({
      userId: user.user_id,
      username: user.user_name,
      eloRating: user.elo_rating ?? 1000,
      winStreak: user.win_streak ?? 0,
      totalMatches: parseInt(stats.total_matches) || 0,
      wins: parseInt(stats.wins) || 0,
      losses: parseInt(stats.losses) || 0,
      rankedMatches: parseInt(stats.ranked_matches) || 0,
      casualMatches: parseInt(stats.casual_matches) || 0,
      winRate: stats.total_matches > 0 
        ? ((parseInt(stats.wins) / parseInt(stats.total_matches)) * 100).toFixed(1)
        : 0,
    });
  } catch (error) {
    console.error('[Match History API] Error (stats):', error);
    res.status(500).json({
      error: 'Failed to fetch user stats',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get('/:userId/:matchId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const matchId = parseInt(req.params.matchId);

  if (isNaN(userId) || isNaN(matchId)) {
    return res.status(400).json({ error: 'Invalid user ID or match ID' });
  }

  try {
    // Query match overview
    const matchQuery = `
      SELECT 
        m.match_id,
        m.player1_id,
        m.player2_id,
        p1.user_name as player1_name,
        p2.user_name as player2_name,
        m.player1_wins,
        m.player2_wins,
        m.winner_id,
        w.user_name as winner_name,
        m.mode,
        m.match_timestamp
      FROM matches m
      JOIN users p1 ON m.player1_id = p1.user_id
      JOIN users p2 ON m.player2_id = p2.user_id
      LEFT JOIN users w ON m.winner_id = w.user_id
      WHERE m.match_id = $1 
        AND (m.player1_id = $2 OR m.player2_id = $2)
    `;

    const matchResult = await pool.query(matchQuery, [matchId, userId]);

    if (matchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const match = matchResult.rows[0];

    // Query game stats - select all fields including new detailed ones
    const statsQuery = `
      SELECT 
        gs.game_number,
        gs.player_id,
        u.user_name as player_name,
        gs.is_winner,
        gs.pieces,
        gs.attack_lines,
        gs.time_seconds,
        gs.pps,
        gs.apm,
        gs.lines_cleared,
        gs.pieces_placed,
        gs.attacks_sent,
        gs.garbage_received,
        gs.holds,
        gs.inputs,
        gs.elapsed_ms
      FROM game_stats gs
      JOIN users u ON gs.player_id = u.user_id
      WHERE gs.match_id = $1
      ORDER BY gs.game_number, gs.player_id
    `;

    const statsResult = await pool.query(statsQuery, [matchId]);

    // Format response to match client interface (flat array of stats)
    const games = statsResult.rows.map((row) => ({
      game_number: row.game_number,
      player_id: row.player_id,
      player_name: row.player_name,
      lines_cleared: row.lines_cleared || row.attack_lines || 0,
      pieces_placed: row.pieces_placed || row.pieces || 0,
      attacks_sent: row.attacks_sent || row.attack_lines || 0,
      garbage_received: row.garbage_received || 0,
      holds: row.holds || 0,
      inputs: row.inputs || 0,
      elapsed_ms: row.elapsed_ms || Math.round((row.time_seconds || 0) * 1000),
      is_winner: row.is_winner,
    }));

    // Format response to match MatchDetail interface
    const response = {
      match_id: match.match_id,
      player1_id: match.player1_id,
      player2_id: match.player2_id,
      player1_name: match.player1_name,
      player2_name: match.player2_name,
      winner_id: match.winner_id,
      player1_score: match.player1_wins,
      player2_score: match.player2_wins,
      match_timestamp: match.match_timestamp,
      games,
    };

    res.json(response);
  } catch (error) {
    console.error('[Match History API] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch match details',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
