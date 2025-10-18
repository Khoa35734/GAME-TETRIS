// Match History Routes
// File: server/src/routes/matches.ts

import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

// Initialize PostgreSQL connection
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: Number(process.env.PG_PORT) || 5432,
});

// Middleware to verify JWT token
const verifyToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // TODO: Add JWT verification here
  // For now, extract userId from token or request
  next();
};

// Get match history for a user (last 10 matches)
router.get('/history/:userId', verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const result = await pool.query(
      `SELECT * FROM match_history 
       WHERE player_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 10`,
      [userId]
    );

    const matches = result.rows.map(row => ({
      matchId: row.match_id,
      mode: row.mode,
      opponent: row.opponent_name,
      result: row.result,
      score: row.score,
      timestamp: row.timestamp,
      games: row.games_data,
      bo3Score: {
        playerWins: row.player_wins,
        opponentWins: row.opponent_wins
      }
    }));

    res.json({ matches });
  } catch (error) {
    console.error('Error fetching match history:', error);
    res.status(500).json({ error: 'Failed to fetch match history' });
  }
});

// Save match result
router.post('/save', async (req, res) => {
  try {
    const {
      playerId,
      opponentId,
      opponentName,
      mode,
      result,
      score,
      games,
      playerWins,
      opponentWins
    } = req.body;

    // Generate match ID
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    // Insert match for player
    await pool.query(
      `INSERT INTO match_history 
       (match_id, player_id, opponent_id, opponent_name, mode, result, score, 
        games_data, player_wins, opponent_wins, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        matchId,
        playerId,
        opponentId,
        opponentName,
        mode,
        result,
        score,
        JSON.stringify(games),
        playerWins,
        opponentWins,
        timestamp
      ]
    );

    // Insert match for opponent (reverse perspective)
    const opponentResult = result === 'WIN' ? 'LOSE' : 'WIN';
    const opponentScore = score.split('-').reverse().join('-'); // "2-1" -> "1-2"
    
    // Get player name
    const playerResult = await pool.query(
      'SELECT username FROM account WHERE id = $1',
      [playerId]
    );
    const playerName = playerResult.rows[0]?.username || 'Unknown';

    await pool.query(
      `INSERT INTO match_history 
       (match_id, player_id, opponent_id, opponent_name, mode, result, score, 
        games_data, player_wins, opponent_wins, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        matchId,
        opponentId,
        playerId,
        playerName,
        mode,
        opponentResult,
        opponentScore,
        JSON.stringify(reverseGamesData(games)),
        opponentWins,
        playerWins,
        timestamp
      ]
    );

    // Clean up old matches (keep only last 10 for each player)
    await cleanOldMatches(playerId);
    await cleanOldMatches(opponentId);

    res.json({ success: true, matchId });
  } catch (error) {
    console.error('Error saving match:', error);
    res.status(500).json({ error: 'Failed to save match' });
  }
});

// Helper function to reverse games data for opponent perspective
function reverseGamesData(games: any[]) {
  return games.map(game => ({
    playerScore: game.opponentScore,
    opponentScore: game.playerScore,
    winner: game.winner === 'player' ? 'opponent' : 'player',
    playerStats: game.opponentStats,
    opponentStats: game.playerStats
  }));
}

// Helper function to clean old matches
async function cleanOldMatches(userId: number) {
  try {
    // Get all matches for user, ordered by timestamp DESC
    const result = await pool.query(
      `SELECT match_id FROM match_history 
       WHERE player_id = $1 
       ORDER BY timestamp DESC 
       OFFSET 10`,
      [userId]
    );

    // Delete matches beyond the 10 most recent
    if (result.rows.length > 0) {
      const matchIdsToDelete = result.rows.map(row => row.match_id);
      await pool.query(
        `DELETE FROM match_history 
         WHERE player_id = $1 AND match_id = ANY($2)`,
        [userId, matchIdsToDelete]
      );
      
      console.log(`[Match History] Cleaned ${matchIdsToDelete.length} old matches for user ${userId}`);
    }
  } catch (error) {
    console.error('Error cleaning old matches:', error);
  }
}

// Get user stats
router.get('/stats/:userId', verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_matches,
        SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN result = 'LOSE' THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN mode = 'ranked' AND result = 'WIN' THEN 1 ELSE 0 END) as ranked_wins,
        SUM(CASE WHEN mode = 'ranked' AND result = 'LOSE' THEN 1 ELSE 0 END) as ranked_losses
       FROM match_history 
       WHERE player_id = $1`,
      [userId]
    );

    const stats = result.rows[0];
    const winRate = stats.total_matches > 0 
      ? ((stats.wins / stats.total_matches) * 100).toFixed(1)
      : '0.0';

    res.json({
      totalMatches: parseInt(stats.total_matches),
      wins: parseInt(stats.wins),
      losses: parseInt(stats.losses),
      winRate: parseFloat(winRate),
      rankedWins: parseInt(stats.ranked_wins),
      rankedLosses: parseInt(stats.ranked_losses)
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
