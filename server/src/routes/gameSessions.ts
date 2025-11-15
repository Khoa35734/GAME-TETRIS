import express, { Request, Response } from 'express';
import { sequelize } from '../stores/postgres';
import { QueryTypes } from 'sequelize';

const router = express.Router();

interface SaveMatchRequest {
  player1Id: number;
  player2Id: number;
  winnerId: number;
  durationSeconds?: number;
  status?: string;
  gameMode?: string;
}

/**
 * POST /api/game-sessions
 * Save ranked BO3 match and update leaderboard
 */
router.post('/', async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      player1Id,
      player2Id,
      winnerId,
      durationSeconds = 0,
      status = 'completed',
      gameMode = 'ranked'
    } = req.body as SaveMatchRequest;

    console.log('[GameSession] 💾 Saving match:', { player1Id, player2Id, winnerId });

    if (!player1Id || !player2Id || winnerId === undefined) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing: player1Id, player2Id, winnerId'
      });
    }

    const seasonId = 1;
    const sessionType = (gameMode === 'ranked') ? 'ranked' : 'multiplayer';

    // 1. Insert game session
    const result = await sequelize.query(
      `INSERT INTO game_sessions (
        season_id, session_type, started_at, ended_at, 
        duration_second, winner_user_id, session_status
      ) VALUES (
        $1, $2::session_type, 
        NOW() - INTERVAL '1 second' * $3, 
        NOW(), $4, $5, $6::session_status
      ) RETURNING session_id`,
      {
        replacements: [seasonId, sessionType, durationSeconds, durationSeconds, winnerId, status],
        type: QueryTypes.INSERT,
        transaction
      }
    );

    const sessionId = (result[0] as any)[0].session_id;
    console.log('[GameSession] ✅ session_id:', sessionId);

    // 2. Update leaderboard
    if (gameMode === 'ranked') {
      const p1Data = await sequelize.query(
        'SELECT rank_points, games_played, winrate FROM leaderboards WHERE user_id = $1 AND season_id = $2',
        { replacements: [player1Id, seasonId], type: QueryTypes.SELECT, transaction }
      ) as any[];

      const p2Data = await sequelize.query(
        'SELECT rank_points, games_played, winrate FROM leaderboards WHERE user_id = $1 AND season_id = $2',
        { replacements: [player2Id, seasonId], type: QueryTypes.SELECT, transaction }
      ) as any[];

      const p1Elo = p1Data[0]?.rank_points || 1000;
      const p2Elo = p2Data[0]?.rank_points || 1000;

      const p1Change = (winnerId === player1Id) ? 100 : -100;
      const p2Change = (winnerId === player2Id) ? 100 : -100;

      let p1New = Math.max(0, p1Elo + p1Change);
      let p2New = Math.max(0, p2Elo + p2Change);

      console.log('[ELO] P1:', p1Elo, '→', p1New, '|', 'P2:', p2Elo, '→', p2New);

      // Update P1
      const p1Games = (p1Data[0]?.games_played || 0) + 1;
      const p1Wins = (p1Data[0] ? Math.round(p1Data[0].games_played * p1Data[0].winrate / 100) : 0) + (winnerId === player1Id ? 1 : 0);
      const p1WinRate = (p1Games > 0) ? (p1Wins / p1Games * 100) : 0;

      await sequelize.query(
        `INSERT INTO leaderboards (user_id, season_id, rank_points, games_played, winrate, rank_position, updated_at) 
         VALUES ($1, $2, $3, $4, $5, 0, NOW())
         ON CONFLICT (user_id, season_id) DO UPDATE SET 
           rank_points = $3, games_played = $4, winrate = $5, updated_at = NOW()`,
        { replacements: [player1Id, seasonId, p1New, p1Games, p1WinRate], type: QueryTypes.INSERT, transaction }
      );

      // Update P2
      const p2Games = (p2Data[0]?.games_played || 0) + 1;
      const p2Wins = (p2Data[0] ? Math.round(p2Data[0].games_played * p2Data[0].winrate / 100) : 0) + (winnerId === player2Id ? 1 : 0);
      const p2WinRate = (p2Games > 0) ? (p2Wins / p2Games * 100) : 0;

      await sequelize.query(
        `INSERT INTO leaderboards (user_id, season_id, rank_points, games_played, winrate, rank_position, updated_at)
         VALUES ($1, $2, $3, $4, $5, 0, NOW())
         ON CONFLICT (user_id, season_id) DO UPDATE SET 
           rank_points = $3, games_played = $4, winrate = $5, updated_at = NOW()`,
        { replacements: [player2Id, seasonId, p2New, p2Games, p2WinRate], type: QueryTypes.INSERT, transaction }
      );

      console.log('[GameSession] 🏆 Leaderboard updated');
    }

    await transaction.commit();
    res.json({ success: true, message: 'Match saved', data: { sessionId } });

  } catch (error) {
    await transaction.rollback();
    console.error('[GameSession] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save',
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
});

export default router;