import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT ?? 5432),
  database: process.env.PG_DATABASE || process.env.PG_DB || 'postgres',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '123456789Quoc#',
});

/**
 * Calculate ELO rating change for BO3 match with win streak bonus
 */
export function calculateRankChangeEloBO3(
  Rw: number,
  Rl: number,
  winScore: number,
  loseScore: number,
  winStreak: number
) {
  const K_base = 200;

  // 1. Xác suất thắng
  const Ew = 1 / (1 + Math.pow(10, (Rl - Rw) / 400));
  const El = 1 - Ew;

  // 2. Hệ số streak bonus
  const K_streak = K_base * (1 + 0.05 * Math.min(winStreak, 5));

  // 3. Hệ số dựa theo tỉ số BO3
  const ratio = winScore / (winScore + loseScore);
  const K_final = K_streak * (0.8 + 0.4 * ratio);

  // 4. Tính thay đổi điểm
  let deltaW = K_final * (1 - Ew);
  let deltaL = -K_final * Ew;

  // 5. Giới hạn theo yêu cầu
  deltaW = Math.max(100, Math.min(deltaW, 250));
  deltaL = Math.max(-100, Math.min(deltaL, -50));

  return {
    winGain: Math.round(deltaW),
    loseLoss: Math.round(deltaL),
  };
}

/**
 * Update ELO rating for both players after a ranked match
 */
export async function updateEloAfterMatch(
  winnerId: number,
  loserId: number,
  winScore: number,
  loseScore: number
): Promise<{ 
  winnerNewElo: number; 
  loserNewElo: number; 
  winnerOldElo: number;
  loserOldElo: number;
  eloChange: number;
  loserEloChange: number;
}> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current ELO and win streak
    const winnerQuery = await client.query(
      'SELECT elo_rating, win_streak FROM users WHERE user_id = $1',
      [winnerId]
    );
    const loserQuery = await client.query(
      'SELECT elo_rating, win_streak FROM users WHERE user_id = $1',
      [loserId]
    );

    if (!winnerQuery.rows[0] || !loserQuery.rows[0]) {
      throw new Error('Player not found');
    }

    const winnerElo = winnerQuery.rows[0].elo_rating || 1000;
    const loserElo = loserQuery.rows[0].elo_rating || 1000;
    const winStreak = winnerQuery.rows[0].win_streak || 0;

    // Calculate ELO changes
    const { winGain, loseLoss } = calculateRankChangeEloBO3(
      winnerElo,
      loserElo,
      winScore,
      loseScore,
      winStreak
    );

    const winnerNewElo = winnerElo + winGain;
    const loserNewElo = Math.max(0, loserElo + loseLoss); // Don't go below 0

    // Update winner: increase ELO and increment win streak
    await client.query(
      'UPDATE users SET elo_rating = $1, win_streak = win_streak + 1 WHERE user_id = $2',
      [winnerNewElo, winnerId]
    );

    // Update loser: decrease ELO and reset win streak
    await client.query(
      'UPDATE users SET elo_rating = $1, win_streak = 0 WHERE user_id = $2',
      [loserNewElo, loserId]
    );

    await client.query('COMMIT');

    console.log(`[ELO] Winner ${winnerId}: ${winnerElo} → ${winnerNewElo} (+${winGain})`);
    console.log(`[ELO] Loser ${loserId}: ${loserElo} → ${loserNewElo} (${loseLoss})`);

    return {
      winnerNewElo,
      loserNewElo,
      winnerOldElo: winnerElo,
      loserOldElo: loserElo,
      eloChange: winGain,
      loserEloChange: loseLoss, // negative value
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ELO] Failed to update ELO ratings:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get user's current ELO rating
 */
export async function getUserElo(userId: number): Promise<number> {
  const result = await pool.query(
    'SELECT elo_rating FROM users WHERE user_id = $1',
    [userId]
  );
  return result.rows[0]?.elo_rating || 1000;
}

/**
 * Get leaderboard (top players by ELO)
 */
export async function getEloLeaderboard(limit: number = 100): Promise<any[]> {
  const result = await pool.query(
    `SELECT user_id, user_name, elo_rating, win_streak 
     FROM users 
     ORDER BY elo_rating DESC 
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}
