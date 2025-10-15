// Server-side Matchmaking System with Penalty Management
// File: server/src/matchmaking.ts

import { Server, Socket } from 'socket.io';

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
  private casualQueue: Player[] = [];
  private rankedQueue: Player[] = [];
  private activeMatches: Map<string, Match> = new Map();
  private penalties: Map<number, PenaltyRecord> = new Map();
  
  // Penalty settings
  private readonly PENALTY_BASE_DURATION = 60; // 60 seconds base penalty
  private readonly PENALTY_MULTIPLIER = 2; // Multiply by 2 for each additional decline
  private readonly PENALTY_RESET_TIME = 24 * 60 * 60 * 1000; // Reset counter after 24 hours
  private readonly MATCH_CONFIRM_TIMEOUT = 10000; // 10 seconds to confirm

  constructor(io: Server) {
    this.io = io;
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
    
    // Get player info from socket auth
    const accountId = (socket as any).accountId;
    const username = (socket as any).username || 'Player';

    if (!accountId) {
      socket.emit('matchmaking:error', { error: 'Not authenticated' });
      return;
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
      username,
      mode,
      searchStartTime: Date.now(),
    };

    if (mode === 'casual') {
      this.casualQueue.push(player);
      console.log(`[Matchmaking] Player ${username} joined casual queue`);
    } else {
      // For ranked, add rating (placeholder - get from database)
      player.rating = 1500;
      this.rankedQueue.push(player);
      console.log(`[Matchmaking] Player ${username} joined ranked queue (Rating: ${player.rating})`);
    }
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
    console.log(`[Matchmaking] Player ${socket.id} confirmed match ${matchId}`);

    // If both players confirmed, start the match
    if (match.confirmedPlayers.size === 2) {
      this.startMatch(match);
    }
  }

  private handleConfirmDecline(socket: Socket, matchId: string) {
    const match = this.activeMatches.get(matchId);
    if (!match) return;

    const accountId = (socket as any).accountId;
    if (accountId) {
      this.applyPenalty(accountId);
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
  }

  private handleDisconnect(socket: Socket) {
    this.removeFromQueue(socket.id);
    
    // Check if player is in an active match confirmation
    for (const [matchId, match] of this.activeMatches.entries()) {
      if (match.player1.socketId === socket.id || match.player2.socketId === socket.id) {
        // Treat disconnect as decline
        const accountId = (socket as any).accountId;
        if (accountId) {
          this.applyPenalty(accountId);
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

    // Notify both players
    this.io.to(player1.socketId).emit('matchmaking:found', {
      matchId,
      opponent: { username: player2.username },
    });

    this.io.to(player2.socketId).emit('matchmaking:found', {
      matchId,
      opponent: { username: player1.username },
    });

    // Set timeout for confirmation
    match.confirmTimeout = setTimeout(() => {
      this.handleConfirmTimeout(matchId);
    }, this.MATCH_CONFIRM_TIMEOUT);

    console.log(`[Matchmaking] Match created: ${matchId} (${player1.username} vs ${player2.username})`);
  }

  private handleConfirmTimeout(matchId: string) {
    const match = this.activeMatches.get(matchId);
    if (!match) return;

    // Check who didn't confirm
    const player1Confirmed = match.confirmedPlayers.has(match.player1.socketId);
    const player2Confirmed = match.confirmedPlayers.has(match.player2.socketId);

    // Apply penalty to players who didn't confirm
    if (!player1Confirmed) {
      this.applyPenalty(match.player1.accountId);
      this.io.to(match.player1.socketId).emit('matchmaking:timeout');
    }

    if (!player2Confirmed) {
      this.applyPenalty(match.player2.accountId);
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

  private startMatch(match: Match) {
    // Create room for the match
    const roomId = `match_${match.matchId}`;

    // Clear timeout
    if (match.confirmTimeout) {
      clearTimeout(match.confirmTimeout);
    }

    // Notify both players to start
    this.io.to(match.player1.socketId).emit('matchmaking:start', { roomId });
    this.io.to(match.player2.socketId).emit('matchmaking:start', { roomId });

    this.activeMatches.delete(match.matchId);
    console.log(`[Matchmaking] Match ${match.matchId} started (Room: ${roomId})`);
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
