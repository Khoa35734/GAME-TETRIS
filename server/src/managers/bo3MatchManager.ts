// BO3 Match Manager
// File: server/src/bo3MatchManager.ts

import { Server, Socket } from 'socket.io';
import { saveMatchData, calculatePPS, calculateAPM } from '../services/matchHistoryService';
import type { MatchData, GameData, PlayerGameStats } from '../services/matchHistoryService';

const DEFAULT_BEST_OF = 3;

const calculateWinsRequired = (bestOf: number): number => Math.floor(bestOf / 2) + 1;

interface GameStats {
  lines: number;          // Lines cleared (deprecated, use lines_cleared)
  pps: number;
  finesse: number;
  pieces: number;         // Pieces placed (deprecated, use pieces_placed)
  holds: number;
  inputs: number;
  time: number;           // Time in seconds (deprecated, use elapsed_ms)
  // 🔽 THÊM CÁC FIELD MỚI CHO DATABASE 🔽
  attack_lines?: number;      // Số dòng rác đã gửi
  apm?: number;               // Attack Per Minute
  lines_cleared?: number;     // Số dòng đã xóa (new format)
  pieces_placed?: number;     // Số Tetromino đã đặt (new format)
  attacks_sent?: number;      // Số dòng rác đã gửi (new format)
  garbage_received?: number;  // Số dòng rác đã nhận
  elapsed_ms?: number;        // Thời gian chơi (milliseconds)
}

interface GameResult {
  gameNumber: number;
  winner: 'player1' | 'player2';
  player1Stats: GameStats;
  player2Stats: GameStats;
  timestamp: number;
}

interface BO3Match {
  matchId: string;
  roomId: string;
  player1: {
    socketId: string;
    accountId: number;
    username: string;
  };
  player2: {
    socketId: string;
    accountId: number;
    username: string;
  };
  mode: 'casual' | 'ranked';
  currentGame: number; // 1, 2, or 3
  bestOf: number;
  winsRequired: number;
  score: {
    player1Wins: number;
    player2Wins: number;
  };
  games: GameResult[];
  status: 'in-progress' | 'completed';
  createdAt: number;
  roundActive: boolean;
  tempPlayer1Stats?: GameStats;
  tempPlayer2Stats?: GameStats;
}

class BO3MatchManager {
  private io: Server;
  private activeMatches: Map<string, BO3Match> = new Map();

  private createEmptyStats(): GameStats {
    return {
      lines: 0,
      pps: 0,
      finesse: 0,
      pieces: 0,
      holds: 0,
      inputs: 0,
      time: 0,
      attack_lines: 0,
      apm: 0,
    };
  }

  private async waitForTempStats(
    match: BO3Match,
    key: 'tempPlayer1Stats' | 'tempPlayer2Stats',
    label: string,
  ): Promise<GameStats> {
    const existing = match[key];
    if (existing) {
      return existing;
    }

    const attempts = 6;
    const delayMs = 50;
    for (let attempt = 0; attempt < attempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const stats = match[key];
      if (stats) {
        console.log(`[BO3] ⏱️ Received ${label} stats after ${(attempt + 1) * delayMs}ms delay`);
        return stats;
      }
    }

    console.warn(`[BO3] ⚠️ Missing ${label} stats after waiting ${attempts * delayMs}ms – using zero stats.`);
    return this.createEmptyStats();
  }

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      // 🔽 NHẬN STATS TỪ MỖI PLAYER 🔽
      socket.on('bo3:player-stats', (data: {
        roomId: string;
        stats: GameStats;
      }) => {
        const match = this.activeMatches.get(data.roomId);
        if (!match) {
          console.warn(`[BO3] ⚠️ Received stats for unknown room ${data.roomId}`);
          return;
        }

        console.log(`[BO3] 📊 Received stats from ${socket.id}:`, JSON.stringify(data.stats));

        // Lưu stats vào match object
        if (socket.id === match.player1.socketId) {
          match.tempPlayer1Stats = data.stats;
          console.log(`[BO3] ✅ Saved Player1 stats (socketId: ${socket.id}, username: ${match.player1.username})`);
        } else if (socket.id === match.player2.socketId) {
          match.tempPlayer2Stats = data.stats;
          console.log(`[BO3] ✅ Saved Player2 stats (socketId: ${socket.id}, username: ${match.player2.username})`);
        } else {
          console.warn(`[BO3] ⚠️ Stats from unknown socket ${socket.id} in room ${data.roomId}`);
          console.warn(`[BO3] ⚠️ Expected sockets: P1=${match.player1.socketId}, P2=${match.player2.socketId}`);
        }
      });

      // Game finished in current round (DEPRECATED - chỉ dùng để backward compatibility)
      socket.on('bo3:game-finished', (data: {
        roomId: string;
        winner?: 'player1' | 'player2' | 'opponent';
        stats?: {
          player1?: GameStats;
          player2?: GameStats;
        };
      }) => {
        console.log('[BO3] 📥 Received bo3:game-finished from client:', socket.id, data);
        this.handleGameFinished(socket, data);
      });

      // Player ready for next game
      socket.on('bo3:ready-next', (data: { roomId: string }) => {
        this.handlePlayerReady(socket, data.roomId);
      });

      // Get match status
      socket.on('bo3:get-status', (data: { roomId: string }) => {
        this.sendMatchStatus(socket, data.roomId);
      });
    });
  }

  // Create new BO3 match
  public createMatch(
    matchId: string,
    roomId: string,
    player1: { socketId: string; accountId: number; username: string },
    player2: { socketId: string; accountId: number; username: string },
    mode: 'casual' | 'ranked',
    bestOf: number = DEFAULT_BEST_OF
  ): BO3Match {
    const normalizedBestOf = Math.max(1, bestOf % 2 === 0 ? bestOf + 1 : bestOf);
    const winsRequired = calculateWinsRequired(normalizedBestOf);

    const match: BO3Match = {
      matchId,
      roomId,
      player1,
      player2,
      mode,
      currentGame: 1,
      bestOf: normalizedBestOf,
      winsRequired,
      score: {
        player1Wins: 0,
        player2Wins: 0
      },
      games: [],
      status: 'in-progress',
      createdAt: Date.now(),
      roundActive: true,
    };

    this.activeMatches.set(roomId, match);
    
    // Notify both players
    this.io.to(roomId).emit('bo3:match-start', {
      matchId,
      mode,
      currentGame: 1,
      score: match.score,
      bestOf: normalizedBestOf,
      winsRequired,
      player1: {
        socketId: player1.socketId,
        accountId: player1.accountId,
        username: player1.username,
      },
      player2: {
        socketId: player2.socketId,
        accountId: player2.accountId,
        username: player2.username,
      },
    });

    console.log(`[BO3] Match created: ${matchId} (${player1.username} vs ${player2.username})`);
    return match;
  }

  private handleGameFinished(
    socket: Socket,
    data: {
      roomId: string;
      winner?: 'player1' | 'player2' | 'opponent';
      stats?: {
        player1?: GameStats;
        player2?: GameStats;
      };
    }
  ) {
    const match = this.activeMatches.get(data.roomId);
    if (!match) {
      socket.emit('error', { message: 'Match not found' });
      return;
    }

      if (match.roundActive === false) {
        console.warn(`[BO3] ⚠️ Duplicate finish detected for room ${data.roomId}, current game ${match.currentGame}. Ignoring.`);
        return;
      }

      match.roundActive = false;

    // === XÁC ĐỊNH WINNER ===
    // Nếu client gửi 'opponent', nghĩa là người gọi đã thua
    let winner: 'player1' | 'player2';
    
    if (data.winner === 'opponent' || !data.winner) {
      // Client gửi 'opponent' hoặc không gửi winner -> xác định từ socketId
      if (socket.id === match.player1.socketId) {
        winner = 'player2'; // Player 1 thua -> Player 2 thắng
      } else if (socket.id === match.player2.socketId) {
        winner = 'player1'; // Player 2 thua -> Player 1 thắng
      } else {
        console.error(`[BO3] Unknown socket ${socket.id} sent game-finished for room ${data.roomId}`);
        return;
      }
    } else {
      winner = data.winner;
    }

    console.log(`[BO3] 📊 Game ${match.currentGame} finished: Winner = ${winner}`);

    // === LẤY STATS TỪ CLIENT HOẶC TẠO DUMMY ===
    const player1Stats: GameStats = data.stats?.player1 || {
      lines: 0, pps: 0, finesse: 0, pieces: 0, holds: 0, inputs: 0, time: 0,
      attack_lines: 0, apm: 0
    };

    const player2Stats: GameStats = data.stats?.player2 || {
      lines: 0, pps: 0, finesse: 0, pieces: 0, holds: 0, inputs: 0, time: 0,
      attack_lines: 0, apm: 0
    };

    // Record game result
    const gameResult: GameResult = {
      gameNumber: match.currentGame,
      winner: winner,
      player1Stats: player1Stats,
      player2Stats: player2Stats,
      timestamp: Date.now()
    };

    match.games.push(gameResult);

    // Update score
    if (winner === 'player1') {
      match.score.player1Wins++;
    } else {
      match.score.player2Wins++;
    }

    console.log(`[BO3] Game ${match.currentGame} finished in ${data.roomId}: ${winner} wins`);
    console.log(`[BO3] Score: ${match.score.player1Wins}-${match.score.player2Wins}`);

    // Check if match is over (someone reached required wins)
    if (
      match.score.player1Wins >= match.winsRequired ||
      match.score.player2Wins >= match.winsRequired ||
      match.currentGame >= match.bestOf
    ) {
      this.finishMatch(match);
    } else {
      // Prepare for next game
      match.currentGame = Math.min(match.currentGame + 1, match.bestOf);
      
      this.io.to(data.roomId).emit('bo3:game-result', {
        gameNumber: gameResult.gameNumber,
        winner: winner,
        score: match.score,
        nextGame: match.currentGame,
        bestOf: match.bestOf,
        winsRequired: match.winsRequired,
      });

      // Start countdown for next game (e.g., 5 seconds)
      setTimeout(() => {
    match.roundActive = true;
        this.io.to(data.roomId).emit('bo3:next-game-start', {
          gameNumber: match.currentGame,
          score: match.score,
          bestOf: match.bestOf,
          winsRequired: match.winsRequired,
        });
      }, 5000);
    }
  }

  private async finishMatch(match: BO3Match) {
    match.status = 'completed';
    
    const overallWinner = match.score.player1Wins > match.score.player2Wins ? 'player1' : 'player2';
    const finalScore = `${match.score.player1Wins}-${match.score.player2Wins}`;

    console.log(`[BO3] Match ${match.matchId} completed: ${overallWinner} wins (${finalScore})`);

    // Notify players
    this.io.to(match.roomId).emit('bo3:match-end', {
      winner: overallWinner,
      score: match.score,
      finalScore,
      games: match.games,
      bestOf: match.bestOf,
      winsRequired: match.winsRequired,
    });

    // Save match history to database
    await this.saveMatchHistory(match, overallWinner);

    // Clean up after 30 seconds
    setTimeout(() => {
      this.activeMatches.delete(match.roomId);
      console.log(`[BO3] Match ${match.matchId} cleaned up`);
    }, 30000);
  }

  private async saveMatchHistory(match: BO3Match, winner: 'player1' | 'player2') {
    try {
      console.log(`[BO3] 💾 Saving match history to database...`);
      console.log(`[BO3] 💾 Match ID: ${match.matchId}, Room: ${match.roomId}`);
      console.log(`[BO3] 💾 Player 1: ${match.player1.username} (ID: ${match.player1.accountId})`);
      console.log(`[BO3] 💾 Player 2: ${match.player2.username} (ID: ${match.player2.accountId})`);
      console.log(`[BO3] 💾 Score: ${match.score.player1Wins}-${match.score.player2Wins}`);
      console.log(`[BO3] 💾 Winner: ${winner}`);
      console.log(`[BO3] 💾 Total games: ${match.games.length}`);

      // === XÁC ĐỊNH WINNER_ID ===
      const winnerId = winner === 'player1' ? match.player1.accountId : match.player2.accountId;

      // === CHUẨN BỊ DỮ LIỆU CHO DATABASE ===
      const gamesData: GameData[] = match.games.map((game) => {
        // Tính toán stats nếu chưa có
        const p1Stats = game.player1Stats;
        const p2Stats = game.player2Stats;

        const p1Time = p1Stats.time || 0;
        const p2Time = p2Stats.time || 0;
        
        // TIME CHUNG CHO CẢ 2 PLAYER (thời gian dài hơn = thời gian thực của ván)
        const gameTime = Math.max(p1Time, p2Time);
        const gameTimeMs = Math.round(gameTime * 1000);

        const player1Stats: PlayerGameStats = {
          // Old fields for backward compatibility
          pieces: p1Stats.pieces || 0,
          attack_lines: p1Stats.attack_lines || p1Stats.attacks_sent || 0,
          time_seconds: gameTime, // Dùng time chung
          pps: p1Stats.pps || calculatePPS(p1Stats.pieces || 0, gameTime),
          apm: p1Stats.apm || calculateAPM(p1Stats.attack_lines || 0, gameTime),
          // New detailed fields
          lines_cleared: p1Stats.lines_cleared || p1Stats.lines || 0,
          pieces_placed: p1Stats.pieces_placed || p1Stats.pieces || 0,
          attacks_sent: p1Stats.attacks_sent || p1Stats.attack_lines || 0,
          garbage_received: p1Stats.garbage_received || 0,
          holds: p1Stats.holds || 0,
          inputs: p1Stats.inputs || 0,
          elapsed_ms: gameTimeMs, // Dùng time chung
        };

        const player2Stats: PlayerGameStats = {
          // Old fields for backward compatibility
          pieces: p2Stats.pieces || 0,
          attack_lines: p2Stats.attack_lines || p2Stats.attacks_sent || 0,
          time_seconds: gameTime, // Dùng time chung
          pps: p2Stats.pps || calculatePPS(p2Stats.pieces || 0, gameTime),
          apm: p2Stats.apm || calculateAPM(p2Stats.attack_lines || 0, gameTime),
          // New detailed fields
          lines_cleared: p2Stats.lines_cleared || p2Stats.lines || 0,
          pieces_placed: p2Stats.pieces_placed || p2Stats.pieces || 0,
          attacks_sent: p2Stats.attacks_sent || p2Stats.attack_lines || 0,
          garbage_received: p2Stats.garbage_received || 0,
          holds: p2Stats.holds || 0,
          inputs: p2Stats.inputs || 0,
          elapsed_ms: gameTimeMs, // Dùng time chung
        };

        // Xác định winner_id của ván này
        const gameWinnerId = game.winner === 'player1' 
          ? match.player1.accountId 
          : match.player2.accountId;

        return {
          game_number: game.gameNumber,
          winner_id: gameWinnerId,
          time_seconds: gameTime, // Time chung cho GameData
          player1_stats: player1Stats,
          player2_stats: player2Stats,
        };
      });

      // === TẠO PAYLOAD ===
      const matchData: MatchData = {
        player1_id: match.player1.accountId,
        player2_id: match.player2.accountId,
        player1_wins: match.score.player1Wins,
        player2_wins: match.score.player2Wins,
        winner_id: winnerId,
        mode: match.mode,
        games: gamesData,
      };

      // === LƯU VÀO DATABASE ===
      console.log('[BO3] 🔄 Calling saveMatchData with payload:', JSON.stringify(matchData, null, 2));
      const matchId = await saveMatchData(matchData);
      
      console.log(`[BO3] ✅ Match history saved successfully! DB Match ID: ${matchId}`);
      console.log(`[BO3] 📊 Player 1: ${match.player1.username} (ID: ${match.player1.accountId}) - ${match.score.player1Wins} wins`);
      console.log(`[BO3] 📊 Player 2: ${match.player2.username} (ID: ${match.player2.accountId}) - ${match.score.player2Wins} wins`);
      console.log(`[BO3] 🏆 Winner: ${winner === 'player1' ? match.player1.username : match.player2.username}`);
      console.log(`[BO3] 📝 Total games played: ${match.games.length}`);

    } catch (error) {
      console.error('[BO3] ❌ Failed to save match history:', error);
      if (error instanceof Error) {
        console.error('[BO3] ❌ Error details:', error.message);
        console.error('[BO3] ❌ Error stack:', error.stack);
      }
      // Không throw error để không làm crash server
    }
  }

  private handlePlayerReady(socket: Socket, roomId: string) {
    const match = this.activeMatches.get(roomId);
    if (!match) return;

    // Broadcast ready status
    this.io.to(roomId).emit('bo3:player-ready', {
      socketId: socket.id
    });
  }

  private sendMatchStatus(socket: Socket, roomId: string) {
    const match = this.activeMatches.get(roomId);
    
    if (!match) {
      socket.emit('bo3:status', { error: 'Match not found' });
      return;
    }

    socket.emit('bo3:status', {
      matchId: match.matchId,
      mode: match.mode,
      currentGame: match.currentGame,
      score: match.score,
      games: match.games,
      status: match.status
    });
  }
  public async handleGameTopout(roomId: string, loserSocketId: string, reason: string) {
    const match = this.activeMatches.get(roomId);
    if (!match) {
      console.warn(`[BO3] handleGameTopout: Không tìm thấy trận đấu ${roomId}`);
      return;
    }

    if (match.status === 'completed') {
      console.warn(`[BO3] handleGameTopout: Trận đấu ${roomId} đã kết thúc`);
      return;
    }

    let winner: 'player1' | 'player2';

    // Xác định người thắng
    if (match.player1.socketId === loserSocketId) {
      winner = 'player2';
    } else if (match.player2.socketId === loserSocketId) {
      winner = 'player1';
    } else {
      console.error(`[BO3] handleGameTopout: loserSocketId ${loserSocketId} không có trong trận ${roomId}`);
      return;
    }

    console.log(`[BO3] handleGameTopout: ${winner} thắng game ${match.currentGame} (do ${loserSocketId} top-out)`);

    // 🔽 CHECK STATS CÓ TỒN TẠI KHÔNG 🔽
    console.log(`[BO3] 🔍 Checking temp stats...`);
  console.log(`[BO3] 🔍 tempPlayer1Stats exists:`, !!match.tempPlayer1Stats);
  console.log(`[BO3] 🔍 tempPlayer2Stats exists:`, !!match.tempPlayer2Stats);

    // 🔽 SỬ DỤNG STATS THỰC TẾ TỪ CẢ 2 PLAYER (nếu có) 🔽
    const player1Stats = await this.waitForTempStats(match, 'tempPlayer1Stats', 'Player1');
    const player2Stats = await this.waitForTempStats(match, 'tempPlayer2Stats', 'Player2');

    console.log(`[BO3] 📊 Using stats - Player1:`, JSON.stringify(player1Stats));
    console.log(`[BO3] 📊 Using stats - Player2:`, JSON.stringify(player2Stats));

    // Clear temp stats
    delete match.tempPlayer1Stats;
    delete match.tempPlayer2Stats;

    // Gọi hàm logic chính để xử lý kết quả
    this.handleGameFinished(
      { emit: (event, payload) => console.log(`[BO3] Dummy socket emit: ${event}`) } as Socket,
      {
        roomId,
        winner,
        stats: {
          player1: player1Stats,
          player2: player2Stats,
        }
      }
    );
  }
  // Get match by room ID
  public getMatch(roomId: string): BO3Match | undefined {
    return this.activeMatches.get(roomId);
  }

  // Get all active matches
  public getActiveMatchesCount(): number {
    return this.activeMatches.size;
  }
}

export default BO3MatchManager;
export type { BO3Match, GameResult, GameStats };
