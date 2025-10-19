// Server-side Matchmaking System with Penalty Management
// File: server/src/matchmaking.ts

import { Server, Socket } from 'socket.io';
import { getSocketUserInfo, storeSocketUser } from './stores/redisStore';
import { matchManager } from './managers/matchManager';
import BO3MatchManager from './managers/bo3MatchManager';

const normalizeBestOf = (value: number): number => {
  const cleaned = Math.max(1, Math.floor(value));
  return cleaned % 2 === 0 ? cleaned + 1 : cleaned;
};

const DEFAULT_SERIES_BEST_OF = normalizeBestOf(Number(process.env.MATCH_SERIES_BEST_OF ?? 3));
const DEFAULT_SERIES_WINS_REQUIRED = Math.floor(DEFAULT_SERIES_BEST_OF / 2) + 1;

interface Player {
  socketId: string;
  accountId: number;
  username: string;
  mode: 'casual' | 'ranked';
  rating?: number; // For ranked matchmaking
  searchStartTime: number;
}

interface Match {
  matchId: string;
  player1: Player;
  player2: Player;
  mode: 'casual' | 'ranked';
  confirmedPlayers: Set<string>;
  createdAt: number;
  confirmTimeout?: NodeJS.Timeout;
}

interface PenaltyRecord {
  accountId: number;
  declineCount: number;
  lastDeclineTime: number;
  penaltyUntil: number; // Timestamp when penalty expires
}

class MatchmakingSystem {
  private io: Server;
  private bo3MatchManager: BO3MatchManager;
  private casualQueue: Player[] = [];
  private rankedQueue: Player[] = [];
  private activeMatches: Map<string, Match> = new Map();
  private penalties: Map<number, PenaltyRecord> = new Map();
  
  // Penalty settings
  private readonly PENALTY_BASE_DURATION = 60; // 60 seconds base penalty
  private readonly PENALTY_MULTIPLIER = 2; // Multiply by 2 for each additional decline
  private readonly PENALTY_RESET_TIME = 24 * 60 * 60 * 1000; // Reset counter after 24 hours
  private readonly MATCH_CONFIRM_TIMEOUT = 30000; // 30 seconds to confirm (tăng lên cho dễ test)

  constructor(io: Server) {
    this.io = io;
    this.bo3MatchManager = new BO3MatchManager(io);
    this.setupSocketHandlers();
    
    // Periodic matchmaking check every 2 seconds
    setInterval(() => this.processMatchmaking(), 2000);
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[Matchmaking] Player connected: ${socket.id}`);

      // Join matchmaking queue
      socket.on('matchmaking:join', (data: { mode: 'casual' | 'ranked' }) => {
        this.handleJoinQueue(socket, data);
      });

      // Cancel matchmaking
      socket.on('matchmaking:cancel', () => {
        this.handleCancelQueue(socket);
      });

      // Confirm match
      socket.on('matchmaking:confirm-accept', (data: { matchId: string }) => {
        this.handleConfirmAccept(socket, data.matchId);
      });

      // Decline match
      socket.on('matchmaking:confirm-decline', (data: { matchId: string }) => {
        this.handleConfirmDecline(socket, data.matchId);
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleJoinQueue(socket: Socket, data: { mode: 'casual' | 'ranked' }) {
    const { mode } = data;
    
    // Get player info from Redis (with socket fallback)
    getSocketUserInfo(socket.id).then(async (userInfo) => {
      let accountId = userInfo?.accountId;
      let username = userInfo?.username;

      if (!accountId) {
        const socketAccount = (socket as any).accountId;
        if (typeof socketAccount === 'number' && !isNaN(socketAccount)) {
          accountId = socketAccount;
        }
      }

      if (!username) {
        const socketUsername = (socket as any).username;
        if (typeof socketUsername === 'string') {
          username = socketUsername;
        } else if (accountId) {
          username = `User${accountId}`;
        }
      }

      if (!accountId) {
        console.warn(`[Matchmaking] Socket ${socket.id} not authenticated`);
        socket.emit('matchmaking:error', { error: 'Not authenticated' });
        return;
      }

      // Attempt to backfill Redis if missing
      if (!userInfo && username) {
        try {
          await storeSocketUser(socket.id, accountId, username);
        } catch (error) {
          console.error('[Matchmaking] Failed to backfill socket user in Redis:', error);
        }
      }

      // Check if player has active penalty
      const penalty = this.penalties.get(accountId);
      if (penalty && Date.now() < penalty.penaltyUntil) {
        const remainingTime = Math.ceil((penalty.penaltyUntil - Date.now()) / 1000);
        socket.emit('matchmaking:penalty', { duration: remainingTime });
        return;
      }

      // Remove from any existing queue
      this.removeFromQueue(socket.id);

      const player: Player = {
        socketId: socket.id,
        accountId,
        username: username || `User${accountId}`,
        mode,
        searchStartTime: Date.now(),
      };

      if (mode === 'casual') {
        this.casualQueue.push(player);
        console.log(`[Matchmaking] Player ${username} (ID: ${accountId}) joined casual queue`);
      } else {
        // For ranked, add rating (placeholder - get from database)
        player.rating = 1500;
        this.rankedQueue.push(player);
        console.log(`[Matchmaking] Player ${username} (ID: ${accountId}) joined ranked queue (Rating: ${player.rating})`);
      }
    }).catch(err => {
      console.error(`[Matchmaking] Error getting user info:`, err);
      socket.emit('matchmaking:error', { error: 'Authentication error' });
    });
  }

  private handleCancelQueue(socket: Socket) {
    this.removeFromQueue(socket.id);
    console.log(`[Matchmaking] Player ${socket.id} cancelled search`);
  }

  private handleConfirmAccept(socket: Socket, matchId: string) {
    const match = this.activeMatches.get(matchId);
    if (!match) {
      socket.emit('matchmaking:error', { error: 'Match not found' });
      return;
    }

    match.confirmedPlayers.add(socket.id);
    
    const playerName = match.player1.socketId === socket.id 
      ? match.player1.username 
      : match.player2.username;
    
    console.log(`✅ [Matchmaking] ${playerName} đã chấp nhận match ${matchId}`);
    console.log(`   Confirmed: ${match.confirmedPlayers.size}/2`);

    // ✅ XÓA player khỏi queue ngay khi confirm để tránh bị match lại
    this.removeFromQueue(socket.id);
    console.log(`   🗑️ Removed ${playerName} from queue (already confirmed)`);

    // Notify this player they're waiting for opponent
    if (match.confirmedPlayers.size === 1) {
      socket.emit('matchmaking:waiting', { 
        message: 'Đang chờ đối thủ chấp nhận...' 
      });
      console.log(`   ⏳ Đang chờ đối thủ...`);
    }

    // If both players confirmed, start the match
    if (match.confirmedPlayers.size === 2) {
      console.log(`✅ [Matchmaking] Cả 2 người chơi đã chấp nhận! Bắt đầu tạo BO3 match...`);
      this.startMatch(match);
    }
  }

  private handleConfirmDecline(socket: Socket, matchId: string) {
    const match = this.activeMatches.get(matchId);
    if (!match) return;

    // Get accountId from Redis
    getSocketUserInfo(socket.id).then(userInfo => {
      if (userInfo) {
        this.applyPenalty(userInfo.accountId);
      }

      // Notify other player
      const otherPlayerId = match.player1.socketId === socket.id 
        ? match.player2.socketId 
        : match.player1.socketId;
      
      this.io.to(otherPlayerId).emit('matchmaking:opponent-declined');

      // Return other player to queue
      const otherPlayer = match.player1.socketId === socket.id ? match.player2 : match.player1;
      if (match.mode === 'casual') {
        this.casualQueue.push(otherPlayer);
      } else {
        this.rankedQueue.push(otherPlayer);
      }

      // Clean up match
      if (match.confirmTimeout) {
        clearTimeout(match.confirmTimeout);
      }
      this.activeMatches.delete(matchId);

      console.log(`[Matchmaking] Player ${socket.id} declined match ${matchId}`);
    });
  }

  private handleDisconnect(socket: Socket) {
    this.removeFromQueue(socket.id);
    
    // Check if player is in an active match confirmation
    for (const [matchId, match] of this.activeMatches.entries()) {
      if (match.player1.socketId === socket.id || match.player2.socketId === socket.id) {
        // Treat disconnect as decline - get accountId from Redis
        getSocketUserInfo(socket.id).then(userInfo => {
          if (userInfo) {
            this.applyPenalty(userInfo.accountId);
          }
        });

        // Notify other player
        const otherPlayerId = match.player1.socketId === socket.id 
          ? match.player2.socketId 
          : match.player1.socketId;
        
        this.io.to(otherPlayerId).emit('matchmaking:opponent-declined');

        // Return other player to queue
        const otherPlayer = match.player1.socketId === socket.id ? match.player2 : match.player1;
        if (match.mode === 'casual') {
          this.casualQueue.push(otherPlayer);
        } else {
          this.rankedQueue.push(otherPlayer);
        }

        // Clean up
        if (match.confirmTimeout) {
          clearTimeout(match.confirmTimeout);
        }
        this.activeMatches.delete(matchId);
      }
    }
  }

  private processMatchmaking() {
    // Process casual queue
    this.matchPlayers(this.casualQueue, 'casual');
    
    // Process ranked queue (with MMR matching)
    this.matchPlayersRanked(this.rankedQueue);
  }

  private matchPlayers(queue: Player[], mode: 'casual' | 'ranked') {
    while (queue.length >= 2) {
      const player1 = queue.shift()!;
      const player2 = queue.shift()!;

      this.createMatch(player1, player2, mode);
    }
  }

  private matchPlayersRanked(queue: Player[]) {
    if (queue.length < 2) return;

    // Sort by rating
    queue.sort((a, b) => (a.rating || 0) - (b.rating || 0));

    // Match players with close ratings
    const matched: Player[] = [];
    for (let i = 0; i < queue.length - 1; i++) {
      if (matched.includes(queue[i])) continue;

      const player1 = queue[i];
      const player2 = queue[i + 1];

      // Check rating difference (expand search range over time)
      const searchDuration = Date.now() - player1.searchStartTime;
      const maxRatingDiff = 100 + Math.floor(searchDuration / 10000) * 50; // Expand by 50 every 10s

      if (Math.abs((player1.rating || 0) - (player2.rating || 0)) <= maxRatingDiff) {
        this.createMatch(player1, player2, 'ranked');
        matched.push(player1, player2);
      }
    }

    // Remove matched players from queue
    this.rankedQueue = queue.filter(p => !matched.includes(p));
  }

  private createMatch(player1: Player, player2: Player, mode: 'casual' | 'ranked') {
    const matchId = this.generateMatchId();
    
    const match: Match = {
      matchId,
      player1,
      player2,
      mode,
      confirmedPlayers: new Set(),
      createdAt: Date.now(),
    };

    this.activeMatches.set(matchId, match);

    console.log(`
🎮 [Matchmaking] ĐÃ TÌM THẤY TRẬN ĐẤU!`);
    console.log(`   Match ID: ${matchId}`);
    console.log(`   Player 1: ${player1.username} (${player1.accountId})`);
    console.log(`   Player 2: ${player2.username} (${player2.accountId})`);
    console.log(`   Mode: ${mode}`);
    console.log(`   ⏰ Có 10 giây để chấp nhận...`);

    // Notify both players
    this.io.to(player1.socketId).emit('matchmaking:found', {
      matchId,
      opponent: { username: player2.username },
      timeout: 10, // 10 seconds
    });

    this.io.to(player2.socketId).emit('matchmaking:found', {
      matchId,
      opponent: { username: player1.username },
      timeout: 10, // 10 seconds
    });

    // Set timeout for confirmation
    match.confirmTimeout = setTimeout(() => {
      this.handleConfirmTimeout(matchId);
    }, this.MATCH_CONFIRM_TIMEOUT);
  }

  private handleConfirmTimeout(matchId: string) {
    const match = this.activeMatches.get(matchId);
    if (!match) return;

    // Check who didn't confirm
    const player1Confirmed = match.confirmedPlayers.has(match.player1.socketId);
    const player2Confirmed = match.confirmedPlayers.has(match.player2.socketId);

    // Apply penalty to players who didn't confirm
    if (!player1Confirmed) {
      // this.applyPenalty(match.player1.accountId); // ⚠️ TẮT PENALTY KHI TEST
      console.log(`⚠️ [Matchmaking] Player 1 didn't confirm (penalty disabled for testing)`);
      this.io.to(match.player1.socketId).emit('matchmaking:timeout');
    }

    if (!player2Confirmed) {
      // this.applyPenalty(match.player2.accountId); // ⚠️ TẮT PENALTY KHI TEST
      console.log(`⚠️ [Matchmaking] Player 2 didn't confirm (penalty disabled for testing)`);
      this.io.to(match.player2.socketId).emit('matchmaking:timeout');
    }

    // Return confirmed player(s) to queue
    if (player1Confirmed) {
      this.io.to(match.player1.socketId).emit('matchmaking:opponent-declined');
      if (match.mode === 'casual') {
        this.casualQueue.push(match.player1);
      } else {
        this.rankedQueue.push(match.player1);
      }
    }

    if (player2Confirmed) {
      this.io.to(match.player2.socketId).emit('matchmaking:opponent-declined');
      if (match.mode === 'casual') {
        this.casualQueue.push(match.player2);
      } else {
        this.rankedQueue.push(match.player2);
      }
    }

    this.activeMatches.delete(matchId);
    console.log(`[Matchmaking] Match ${matchId} timed out`);
  }

  private async startMatch(match: Match) {
    // Create room for the BO3 match
    const roomId = `match_${match.matchId}`;

    // Clear timeout
    if (match.confirmTimeout) {
      clearTimeout(match.confirmTimeout);
    }

    console.log(`[Matchmaking] 🎮 Cả 2 người chơi đã chấp nhận! Đang tạo BO3 match...`);
    console.log(`   Player 1: ${match.player1.username} (${match.player1.accountId})`);
    console.log(`   Player 2: ${match.player2.username} (${match.player2.accountId})`);

    try {
      // 1. Create match in Redis via MatchManager (để room tồn tại)
      await matchManager.createMatch({
        matchId: roomId,
        hostPlayerId: match.player1.socketId,
        hostSocketId: match.player1.socketId,
        mode: 'custom', // Use 'custom' mode for matchmaking rooms
        maxPlayers: 2,
        roomId: roomId,
        hostAccountId: String(match.player1.accountId),
      });

      // 2. Add player 2 to the match
      await matchManager.addPlayer(roomId, {
        playerId: match.player2.socketId,
        socketId: match.player2.socketId,
        accountId: String(match.player2.accountId),
      });

      // 3. Join socket.io rooms for broadcasting
      const socket1 = this.io.sockets.sockets.get(match.player1.socketId);
      const socket2 = this.io.sockets.sockets.get(match.player2.socketId);
      
      if (socket1) await socket1.join(roomId);
      if (socket2) await socket2.join(roomId);

      // 3.5. ✅ SET CẢ 2 PLAYERS READY (matchmaking không cần lobby)
      await matchManager.setPlayerReady(roomId, match.player1.socketId, true);
      await matchManager.setPlayerReady(roomId, match.player2.socketId, true);
      
      console.log(`[Matchmaking] ✅ Both players set to READY (auto-start)`);

      // 4. ✅ TẠO BO3 MATCH để quản lý best of 3
      const bo3Match = this.bo3MatchManager.createMatch(
        match.matchId,
        roomId,
        {
          socketId: match.player1.socketId,
          accountId: match.player1.accountId,
          username: match.player1.username
        },
        {
          socketId: match.player2.socketId,
          accountId: match.player2.accountId,
          username: match.player2.username
        },
        match.mode
      );

      // Ensure series metadata always has sane values even if manager defaults change
      const seriesBestOf = bo3Match?.bestOf ?? DEFAULT_SERIES_BEST_OF;
      const seriesWinsRequired = bo3Match?.winsRequired ?? DEFAULT_SERIES_WINS_REQUIRED;

      console.log(`[Matchmaking] ✅ BO3 Match created successfully!`);
      console.log(`   Room ID: ${roomId}`);
      console.log(`   Mode: ${match.mode} (Best of 3)`);
      console.log(`   Status: Ready to start`);

      // 5. ✅ QUAN TRỌNG: Đợi 500ms để đảm bảo Redis đã lưu xong
      await new Promise(resolve => setTimeout(resolve, 500));

      // 6. Verify room exists in Redis before notifying clients
      const verifyRoom = await matchManager.getMatch(roomId);
      if (!verifyRoom) {
        throw new Error('Room verification failed - not found in Redis');
      }

      console.log(`[Matchmaking] ✅ Room verified in Redis, notifying clients...`);

      // 7. Notify both players to start
      this.io.to(match.player1.socketId).emit('matchmaking:start', { 
        roomId,
        matchType: 'bo3',
        mode: match.mode,
        autoStart: true, // ✅ Auto start game, không cần lobby
        playerRole: 'player1',
        player: {
          username: match.player1.username,
          accountId: match.player1.accountId,
        },
        opponent: {
          username: match.player2.username,
          accountId: match.player2.accountId,
        },
        series: {
          bestOf: seriesBestOf,
          winsRequired: seriesWinsRequired,
          currentGame: bo3Match.currentGame,
          score: {
            player: bo3Match.score.player1Wins,
            opponent: bo3Match.score.player2Wins,
          },
        },
      });
      this.io.to(match.player2.socketId).emit('matchmaking:start', { 
        roomId,
        matchType: 'bo3',
        mode: match.mode,
        autoStart: true, // ✅ Auto start game, không cần lobby
        playerRole: 'player2',
        player: {
          username: match.player2.username,
          accountId: match.player2.accountId,
        },
        opponent: {
          username: match.player1.username,
          accountId: match.player1.accountId,
        },
        series: {
          bestOf: seriesBestOf,
          winsRequired: seriesWinsRequired,
          currentGame: bo3Match.currentGame,
          score: {
            player: bo3Match.score.player2Wins,
            opponent: bo3Match.score.player1Wins,
          },
        },
      });

      // ⏳ ĐỢI 1 GIÂY để client navigate và setup listeners xong
      console.log(`[Matchmaking] ⏳ Waiting 1s for clients to navigate and setup listeners...`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 8. ✅ EMIT game:start riêng cho từng player với opponent socketId để setup WebRTC
      console.log(`
[Matchmaking] 🎮 EMITTING game:start events...`);
      
      // Player 1 nhận opponent là player 2
      const payload1 = {
        roomId,
        countdown: 3,
        matchType: 'bo3',
        mode: match.mode,
        opponent: match.player2.socketId, // ← WebRTC cần opponent socket.id
        series: {
          bestOf: seriesBestOf,
          winsRequired: seriesWinsRequired,
          currentGame: bo3Match.currentGame,
          score: {
            player: bo3Match.score.player1Wins,
            opponent: bo3Match.score.player2Wins,
          },
        },
      };
      console.log(`   📤 Sending to Player 1 (${match.player1.socketId}):`, payload1);
      this.io.to(match.player1.socketId).emit('game:start', payload1);

      // Player 2 nhận opponent là player 1  
      const payload2 = {
        roomId,
        countdown: 3,
        matchType: 'bo3',
        mode: match.mode,
        opponent: match.player1.socketId, // ← WebRTC cần opponent socket.id
        series: {
          bestOf: seriesBestOf,
          winsRequired: seriesWinsRequired,
          currentGame: bo3Match.currentGame,
          score: {
            player: bo3Match.score.player2Wins,
            opponent: bo3Match.score.player1Wins,
          },
        },
      };
      console.log(`   📤 Sending to Player 2 (${match.player2.socketId}):`, payload2);
      this.io.to(match.player2.socketId).emit('game:start', payload2);

      console.log(`[Matchmaking] ✅ Game start events emitted - Check if clients receive them!
`);

      console.log(`[Matchmaking] ✅ Match ${match.matchId} started successfully (Best of ${seriesBestOf})`);
      
    } catch (error) {
      console.error(`[Matchmaking] ❌ Error creating BO3 match:`, error);
      
      // Notify players about error
      this.io.to(match.player1.socketId).emit('matchmaking:error', { error: 'Failed to create room' });
      this.io.to(match.player2.socketId).emit('matchmaking:error', { error: 'Failed to create room' });
      
      // Return both to queue
      if (match.mode === 'casual') {
        this.casualQueue.push(match.player1, match.player2);
      } else {
        this.rankedQueue.push(match.player1, match.player2);
      }
      this.activeMatches.delete(match.matchId);
    }
  }

  private applyPenalty(accountId: number) {
    const now = Date.now();
    let penalty = this.penalties.get(accountId);

    if (!penalty) {
      penalty = {
        accountId,
        declineCount: 0,
        lastDeclineTime: now,
        penaltyUntil: 0,
      };
      this.penalties.set(accountId, penalty);
    }

    // Reset counter if last decline was more than 24 hours ago
    if (now - penalty.lastDeclineTime > this.PENALTY_RESET_TIME) {
      penalty.declineCount = 0;
    }

    penalty.declineCount++;
    penalty.lastDeclineTime = now;

    // Calculate penalty duration: 60s * (2^declineCount)
    const duration = this.PENALTY_BASE_DURATION * Math.pow(this.PENALTY_MULTIPLIER, penalty.declineCount - 1);
    penalty.penaltyUntil = now + duration * 1000;

    console.log(`[Matchmaking] Penalty applied to ${accountId}: ${duration}s (Decline count: ${penalty.declineCount})`);

    // Notify player
    const socket = this.findSocketByAccountId(accountId);
    if (socket) {
      socket.emit('matchmaking:penalty', { duration });
    }
  }

  private removeFromQueue(socketId: string) {
    this.casualQueue = this.casualQueue.filter(p => p.socketId !== socketId);
    this.rankedQueue = this.rankedQueue.filter(p => p.socketId !== socketId);
  }

  private findSocketByAccountId(accountId: number): Socket | null {
    const sockets = Array.from(this.io.sockets.sockets.values());
    return sockets.find(s => (s as any).accountId === accountId) || null;
  }

  private generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API for stats
  public getQueueStats() {
    return {
      casual: {
        players: this.casualQueue.length,
        averageWaitTime: this.calculateAverageWaitTime(this.casualQueue),
      },
      ranked: {
        players: this.rankedQueue.length,
        averageWaitTime: this.calculateAverageWaitTime(this.rankedQueue),
      },
      activeMatches: this.activeMatches.size,
      penalizedPlayers: this.penalties.size,
    };
  }

  private calculateAverageWaitTime(queue: Player[]): number {
    if (queue.length === 0) return 0;
    const now = Date.now();
    const totalWait = queue.reduce((sum, p) => sum + (now - p.searchStartTime), 0);
    return Math.floor(totalWait / queue.length / 1000); // Return seconds
  }
}

export default MatchmakingSystem;
