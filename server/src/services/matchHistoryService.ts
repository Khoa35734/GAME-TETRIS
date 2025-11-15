// Match History Service
// File: server/src/services/matchHistoryService.ts
// Purpose: Lưu kết quả trận đấu BO3 vào PostgreSQL

import { Pool } from 'pg';

// =============================================
// INTERFACES
// =============================================

/**
 * Chỉ số thống kê của 1 người chơi trong 1 ván
 */
export interface PlayerGameStats {
  // Old fields (for backward compatibility)
  pieces: number;        // Số Tetromino đã đặt
  attack_lines: number;  // Số dòng rác đã gửi
  time_seconds: number;  // Thời gian chơi (giây)
  pps: number;           // Pieces Per Second
  apm: number;           // Attack Per Minute
  
  // New detailed fields (optional for backward compatibility)
  lines_cleared?: number;      // Số dòng đã xóa
  pieces_placed?: number;      // Số Tetromino đã đặt (new format)
  attacks_sent?: number;       // Số dòng rác đã gửi (new format)
  garbage_received?: number;   // Số dòng rác đã nhận
  holds?: number;              // Số lần dùng hold
  inputs?: number;             // Tổng số input
  elapsed_ms?: number;         // Thời gian chơi (milliseconds)
}

/**
 * Thông tin 1 ván đấu (game) trong trận BO3
 */
export interface GameData {
  game_number: number;                    // Ván 1, 2, hay 3
  winner_id: number;                      // ID người thắng ván này
  time_seconds: number;                   // Thời gian ván đấu
  player1_stats: PlayerGameStats;         // Stats của player 1
  player2_stats: PlayerGameStats;         // Stats của player 2
}

/**
 * Dữ liệu trận đấu BO3 đầy đủ
 */
export interface MatchData {
  player1_id: number;
  player2_id: number;
  player1_wins: number;
  player2_wins: number;
  winner_id: number | null;  // NULL nếu hòa (không bao giờ xảy ra trong BO3)
  mode: 'casual' | 'ranked' | 'custom';
  games: GameData[];         // Mảng chứa dữ liệu từng ván (1-3 ván)
  end_reason?: string;       // Lý do kết thúc: 'normal', 'player1_disconnect', 'player2_disconnect', etc.
}

// =============================================
// DATABASE CONNECTION
// =============================================

/**
 * Tạo PostgreSQL Pool connection
 * Sử dụng cùng config với routes/matches.ts
 */
export const createMatchHistoryPool = (): Pool => {
  const host = process.env.PG_HOST || 'localhost';
  const port = Number(process.env.PG_PORT ?? 5432);
  const database = process.env.PG_DATABASE || process.env.PG_DB || 'tetris';
  const user = process.env.PG_USER || 'devuser';
  const passwordEnv = process.env.PG_PASSWORD;
  const password = typeof passwordEnv === 'string' && passwordEnv.length > 0
    ? passwordEnv
    : '123456';

  return new Pool({
    user,
    host,
    database,
    password,
    port,
  });
};

// Singleton pool instance
let poolInstance: Pool | null = null;

/**
 * Lấy hoặc tạo mới Pool instance
 */
export const getPool = (): Pool => {
  if (!poolInstance) {
    poolInstance = createMatchHistoryPool();
  }
  return poolInstance;
};

// =============================================
// CORE FUNCTION: SAVE MATCH DATA
// =============================================

/**
 * Lưu kết quả trận đấu BO3 vào database
 * 
 * Logic:
 * 1. Bắt đầu Transaction
 * 2. INSERT vào bảng `matches`
 * 3. Lấy `match_id` vừa tạo
 * 4. INSERT vào bảng `game_stats` cho từng ván (2 hàng/ván)
 * 5. Commit transaction
 * 
 * @param matchData - Dữ liệu trận đấu đầy đủ
 * @returns Promise<number> - match_id vừa được tạo
 * @throws Error nếu có lỗi trong quá trình lưu
 */
export async function saveMatchData(matchData: MatchData): Promise<number> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('[MatchHistoryService] 🚀 Starting transaction to save match data...');
    
    // === 1. BẮT ĐẦU TRANSACTION ===
    await client.query('BEGIN');

    // === 2. VALIDATE DỮ LIỆU ===
    if (!matchData.player1_id || !matchData.player2_id) {
      throw new Error('Invalid player IDs');
    }

    if (!matchData.games || matchData.games.length === 0) {
      throw new Error('No game data provided');
    }

    if (!['casual', 'ranked', 'custom'].includes(matchData.mode)) {
      throw new Error(`Invalid mode: ${matchData.mode}`);
    }

    // === 3. INSERT VÀO BẢNG `matches` ===
    const insertMatchQuery = `
      INSERT INTO matches (
        player1_id,
        player2_id,
        player1_wins,
        player2_wins,
        winner_id,
        mode,
        match_timestamp,
        end_reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
      RETURNING match_id
    `;

    const matchResult = await client.query(insertMatchQuery, [
      matchData.player1_id,
      matchData.player2_id,
      matchData.player1_wins,
      matchData.player2_wins,
      matchData.winner_id,
      matchData.mode,
      matchData.end_reason || 'normal',
    ]);

    const matchId = matchResult.rows[0].match_id;
    console.log(`[MatchHistoryService] ✅ Inserted match with ID: ${matchId}`);

    // === 4. INSERT VÀO BẢNG `game_stats` ===
    const insertGameStatsQuery = `
      INSERT INTO game_stats (
        match_id,
        game_number,
        player_id,
        is_winner,
        pieces,
        attack_lines,
        time_seconds,
        pps,
        apm,
        lines_cleared,
        pieces_placed,
        attacks_sent,
        garbage_received,
        holds,
        inputs,
        elapsed_ms
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `;

    // Lặp qua từng ván đấu
    for (const game of matchData.games) {
      // Validate game data
      if (game.game_number < 1 || game.game_number > 3) {
        throw new Error(`Invalid game_number: ${game.game_number}`);
      }

      // === 4.1. INSERT STATS CHO PLAYER 1 ===
      await client.query(insertGameStatsQuery, [
        matchId,
        game.game_number,
        matchData.player1_id,
        game.winner_id === matchData.player1_id, // is_winner
        game.player1_stats.pieces, // old field for backward compatibility
        game.player1_stats.attack_lines, // old field
        game.player1_stats.time_seconds, // old field
        game.player1_stats.pps,
        game.player1_stats.apm,
        game.player1_stats.lines_cleared || 0,
        game.player1_stats.pieces_placed || game.player1_stats.pieces || 0,
        game.player1_stats.attacks_sent || game.player1_stats.attack_lines || 0,
        game.player1_stats.garbage_received || 0,
        game.player1_stats.holds || 0,
        game.player1_stats.inputs || 0,
        game.player1_stats.elapsed_ms || Math.round((game.player1_stats.time_seconds || 0) * 1000),
      ]);

      console.log(`[MatchHistoryService] ✅ Inserted game ${game.game_number} stats for Player 1`);

      // === 4.2. INSERT STATS CHO PLAYER 2 ===
      await client.query(insertGameStatsQuery, [
        matchId,
        game.game_number,
        matchData.player2_id,
        game.winner_id === matchData.player2_id, // is_winner
        game.player2_stats.pieces, // old field
        game.player2_stats.attack_lines, // old field
        game.player2_stats.time_seconds, // old field
        game.player2_stats.pps,
        game.player2_stats.apm,
        game.player2_stats.lines_cleared || 0,
        game.player2_stats.pieces_placed || game.player2_stats.pieces || 0,
        game.player2_stats.attacks_sent || game.player2_stats.attack_lines || 0,
        game.player2_stats.garbage_received || 0,
        game.player2_stats.holds || 0,
        game.player2_stats.inputs || 0,
        game.player2_stats.elapsed_ms || Math.round((game.player2_stats.time_seconds || 0) * 1000),
      ]);

      console.log(`[MatchHistoryService] ✅ Inserted game ${game.game_number} stats for Player 2`);
    }

    // === 5. COMMIT TRANSACTION ===
    await client.query('COMMIT');
    console.log(`[MatchHistoryService] 🎉 Transaction committed successfully! Match ID: ${matchId}`);

    return matchId;

  } catch (error) {
    // === ROLLBACK NẾU CÓ LỖI ===
    await client.query('ROLLBACK');
    console.error('[MatchHistoryService] ❌ Transaction failed, rolled back:', error);
    throw error;

  } finally {
    // === LUÔN RELEASE CLIENT ===
    client.release();
  }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Tính toán PPS (Pieces Per Second)
 * @param pieces - Số Tetromino đã đặt
 * @param timeSeconds - Thời gian chơi (giây)
 */
export function calculatePPS(pieces: number, timeSeconds: number): number {
  if (timeSeconds <= 0) return 0;
  return Math.round((pieces / timeSeconds) * 100) / 100; // 2 chữ số thập phân
}

/**
 * Tính toán APM (Attack Per Minute)
 * @param attackLines - Số dòng rác đã gửi
 * @param timeSeconds - Thời gian chơi (giây)
 */
export function calculateAPM(attackLines: number, timeSeconds: number): number {
  if (timeSeconds <= 0) return 0;
  const minutes = timeSeconds / 60;
  return Math.round((attackLines / minutes) * 100) / 100; // 2 chữ số thập phân
}

/**
 * Đóng Pool connection (gọi khi shutdown server)
 */
export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    console.log('[MatchHistoryService] 🔌 Database pool closed');
  }
}

// =============================================
// EXPORT DEFAULT
// =============================================

export default {
  saveMatchData,
  calculatePPS,
  calculateAPM,
  getPool,
  closePool,
};
