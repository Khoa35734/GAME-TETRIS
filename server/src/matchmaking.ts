// Server-side matchmaking with BO3 support, confirmation flow, and penalties.
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
  rating?: number;
  searchStartTime: number;
}

interface Match {
  matchId: string;
  player1: Player;
  player2: Player;
  mode: 'casual' | 'ranked';
  bestOf: number;
  winsRequired: number;
  confirmedPlayers: Set<string>;
  createdAt: number;
  confirmTimeout?: NodeJS.Timeout;
}

interface PenaltyRecord {
  accountId: number;
  declineCount: number;
  lastDeclineTime: number;
  penaltyUntil: number;
}

class MatchmakingSystem {
  private io: Server;
  private bo3MatchManager: BO3MatchManager;
  private casualQueue: Player[] = [];
  private rankedQueue: Player[] = [];
  private activeMatches: Map<string, Match> = new Map();
  private penalties: Map<number, PenaltyRecord> = new Map();

  private readonly MATCHMAKING_TICK = 2000;
  private readonly MATCH_CONFIRM_TIMEOUT = 30000;
  private readonly PENALTY_BASE_DURATION = 60; // seconds
  private readonly PENALTY_MULTIPLIER = 2;
  private readonly PENALTY_RESET_TIME = 24 * 60 * 60 * 1000;

  constructor(io: Server) {
    this.io = io;
    console.log('[INIT] MatchmakingSystem constructed');

    this.bo3MatchManager = new BO3MatchManager(io);
    setInterval(() => this.processMatchmaking(), this.MATCHMAKING_TICK);
  }

  public handleSocketConnected(socket: Socket): void {
    const accountId = (socket as any).accountId;
    const username = (socket as any).username;
    console.log(
      `[Matchmaking] Player connected: ${username ?? 'Unknown'} (${accountId ?? 'n/a'})`,
    );
  }

  public async handleJoinQueue(socket: Socket, data: { mode: 'casual' | 'ranked' }): Promise<void> {
    const mode = data?.mode ?? 'casual';
    const userInfo = await getSocketUserInfo(socket.id);

    let accountId = userInfo?.accountId;
    let username = userInfo?.username;

    if (!accountId) {
      accountId = (socket as any).accountId;
      username = (socket as any).username;
      if (accountId && username) {
        console.log(`[Matchmaking] Fallback to socket auth: ${username} (${accountId})`);
      }
    }

    if (!accountId || !username) {
      console.warn(`[Matchmaking] Socket ${socket.id} missing account info`);
      socket.emit('matchmaking:error', { error: 'Not authenticated' });
      return;
    }

    if (!userInfo) {
      try {
        await storeSocketUser(socket.id, accountId, username);
        console.log(`[Matchmaking] Backfilled Redis user ${username} (${accountId})`);
      } catch (error) {
        console.error('[Matchmaking] Failed to backfill socket user in Redis:', error);
      }
    }

    const remainingPenalty = this.getRemainingPenalty(accountId);
    if (remainingPenalty > 0) {
      socket.emit('matchmaking:penalty', { duration: remainingPenalty });
      return;
    }

    this.removeFromQueue(socket.id);

    const player: Player = {
      socketId: socket.id,
      accountId,
      username,
      mode,
      rating: mode === 'ranked' ? 1500 : undefined,
      searchStartTime: Date.now(),
    };

    if (mode === 'casual') {
      this.casualQueue.push(player);
      console.log(
        `[Matchmaking] ${username} (${accountId}) joined casual queue | size=${this.casualQueue.length}`,
      );
    } else {
      this.rankedQueue.push(player);
      console.log(
        `[Matchmaking] ${username} (${accountId}) joined ranked queue (rating ${player.rating ?? 'n/a'}) | size=${this.rankedQueue.length}`,
      );
    }

    this.processMatchmaking();
  }

  public handleCancelQueue(socket: Socket): void {
    const removed = this.removeFromQueue(socket.id);
    const active = this.findActiveMatchBySocket(socket.id);

    if (active) {
      console.log(`[Matchmaking] ${socket.id} cancelled while matched -> decline`);
      this.handleConfirmDecline(socket, active.matchId);
      return;
    }

    if (removed) {
      console.log(`[Matchmaking] ${socket.id} cancelled search`);
    }
  }

  public async handleConfirmAccept(socket: Socket, matchId: string): Promise<void> {
    const match = this.activeMatches.get(matchId);
    if (!match) {
      socket.emit('matchmaking:error', { error: 'Match not found' });
      return;
    }

    match.confirmedPlayers.add(socket.id);
    const playerName =
      match.player1.socketId === socket.id ? match.player1.username : match.player2.username;

    console.log(`[Matchmaking] ${playerName} accepted match ${matchId} (${match.confirmedPlayers.size}/2)`);

    if (match.confirmedPlayers.size === 1) {
      socket.emit('matchmaking:waiting', { message: 'Waiting for opponent confirmation...' });
      return;
    }

    if (match.confirmedPlayers.size >= 2) {
      await this.startMatch(match);
    }
  }

  public handleConfirmDecline(socket: Socket, matchId: string): void {
    const match = this.activeMatches.get(matchId);
    if (!match) return;

    const isPlayer1 = match.player1.socketId === socket.id;
    const decliningPlayer = isPlayer1 ? match.player1 : match.player2;
    const otherPlayer = isPlayer1 ? match.player2 : match.player1;

    const penaltyDuration = this.applyPenalty(decliningPlayer.accountId);
    this.io.to(decliningPlayer.socketId).emit('matchmaking:penalty', { duration: penaltyDuration });

    this.io.to(otherPlayer.socketId).emit('matchmaking:opponent-declined');
    this.requeuePlayer(otherPlayer);

    this.clearActiveMatch(matchId);
    console.log(`[Matchmaking] ${decliningPlayer.username} declined match ${matchId}`);
  }

  public handleDisconnect(socket: Socket): void {
    this.removeFromQueue(socket.id);

    const active = this.findActiveMatchBySocket(socket.id);
    if (!active) return;

    const { matchId, match } = active;
    const isPlayer1 = match.player1.socketId === socket.id;
    const disconnectingPlayer = isPlayer1 ? match.player1 : match.player2;
    const otherPlayer = isPlayer1 ? match.player2 : match.player1;

    const penaltyDuration = this.applyPenalty(disconnectingPlayer.accountId);
    console.log(
      `[Matchmaking] ${disconnectingPlayer.username} disconnected during confirm, penalty ${penaltyDuration}s`,
    );

    this.io.to(otherPlayer.socketId).emit('matchmaking:opponent-declined');
    this.requeuePlayer(otherPlayer);
    this.clearActiveMatch(matchId);
  }

  private processMatchmaking() {
    if (this.casualQueue.length >= 2) {
      console.log(
        `[Matchmaking] Processing casual queue | size=${this.casualQueue.length}`,
      );
      this.matchPlayers(this.casualQueue, 'casual');
    }

    if (this.rankedQueue.length >= 2) {
      console.log(
        `[Matchmaking] Processing ranked queue | size=${this.rankedQueue.length}`,
      );
      this.matchPlayersRanked(this.rankedQueue);
    }
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

    queue.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
    const matched: Player[] = [];

    for (let i = 0; i < queue.length - 1; i++) {
      if (matched.includes(queue[i])) continue;
      const player1 = queue[i];
      const player2 = queue[i + 1];
      const searchDuration = Date.now() - player1.searchStartTime;
      const maxRatingDiff = 100 + Math.floor(searchDuration / 10000) * 50;

      if (Math.abs((player1.rating ?? 0) - (player2.rating ?? 0)) <= maxRatingDiff) {
        this.createMatch(player1, player2, 'ranked');
        matched.push(player1, player2);
      }
    }

    this.rankedQueue = queue.filter((p) => !matched.includes(p));
  }

  private createMatch(player1: Player, player2: Player, mode: 'casual' | 'ranked') {
    const matchId = this.generateMatchId();
    const bestOf = DEFAULT_SERIES_BEST_OF;
    const winsRequired = DEFAULT_SERIES_WINS_REQUIRED;

    const match: Match = {
      matchId,
      player1,
      player2,
      mode,
      bestOf,
      winsRequired,
      confirmedPlayers: new Set(),
      createdAt: Date.now(),
    };

    match.confirmTimeout = setTimeout(() => this.handleConfirmTimeout(matchId), this.MATCH_CONFIRM_TIMEOUT);

    this.activeMatches.set(matchId, match);
    this.emitMatchFound(match);

    console.log(
      `[Matchmaking] Match ${matchId} created (${mode}) ${player1.username} vs ${player2.username}`,
    );
  }

  private emitMatchFound(match: Match) {
    const timeoutSeconds = Math.floor(this.MATCH_CONFIRM_TIMEOUT / 1000);
    const basePayload = {
      matchId: match.matchId,
      mode: match.mode,
      timeout: timeoutSeconds,
      series: {
        bestOf: match.bestOf,
        winsRequired: match.winsRequired,
      },
    };

    this.io.to(match.player1.socketId).emit('matchmaking:found', {
      ...basePayload,
      playerRole: 'player1',
      player: { accountId: match.player1.accountId, username: match.player1.username },
      opponent: { accountId: match.player2.accountId, username: match.player2.username },
    });

    this.io.to(match.player2.socketId).emit('matchmaking:found', {
      ...basePayload,
      playerRole: 'player2',
      player: { accountId: match.player2.accountId, username: match.player2.username },
      opponent: { accountId: match.player1.accountId, username: match.player1.username },
    });
  }

  private async startMatch(match: Match) {
    if (match.confirmTimeout) {
      clearTimeout(match.confirmTimeout);
    }

    this.activeMatches.delete(match.matchId);

    const roomId = `match_${match.matchId}`;
    const seriesScore = { player1Wins: 0, player2Wins: 0 };

    try {
      await this.ensurePlayersJoinRoom([match.player1.socketId, match.player2.socketId], roomId);

      const redisMode = match.mode === 'ranked' ? 'ranked' : 'custom';
      await matchManager.createMatch({
        matchId: roomId,
        roomId,
        mode: redisMode,
        hostPlayerId: match.player1.socketId,
        hostSocketId: match.player1.socketId,
        hostAccountId: String(match.player1.accountId),
        maxPlayers: 2,
      });

      await matchManager.addPlayer(roomId, {
        playerId: match.player2.socketId,
        socketId: match.player2.socketId,
        accountId: String(match.player2.accountId),
      });



      const bo3Match = this.bo3MatchManager.createMatch(
        match.matchId,
        roomId,
        {
          socketId: match.player1.socketId,
          accountId: match.player1.accountId,
          username: match.player1.username,
        },
        {
          socketId: match.player2.socketId,
          accountId: match.player2.accountId,
          username: match.player2.username,
        },
        match.mode,
        match.bestOf,
      );

      const seriesPayload = {
        bestOf: bo3Match.bestOf,
        winsRequired: bo3Match.winsRequired,
        currentGame: bo3Match.currentGame,
        score: seriesScore,
      };

      const baseStartPayload = {
        matchId: match.matchId,
        roomId,
        mode: match.mode,
        series: seriesPayload,
      };

      this.io.to(match.player1.socketId).emit('matchmaking:start', {
        ...baseStartPayload,
        playerRole: 'player1',
        player: { accountId: match.player1.accountId, username: match.player1.username },
        opponent: { accountId: match.player2.accountId, username: match.player2.username },
      });

      this.io.to(match.player2.socketId).emit('matchmaking:start', {
        ...baseStartPayload,
        playerRole: 'player2',
        player: { accountId: match.player2.accountId, username: match.player2.username },
        opponent: { accountId: match.player1.accountId, username: match.player1.username },
      });

      console.log(`[Matchmaking] Match ${match.matchId} started successfully (room ${roomId})`);
    } catch (error) {
      console.error('[Matchmaking] Failed to start match:', error);

      await matchManager.deleteMatch(roomId).catch(() => undefined);

      await Promise.all(
        [match.player1.socketId, match.player2.socketId].map(async (socketId) => {
          const clientSocket = this.io.sockets.sockets.get(socketId);
          if (clientSocket) {
            await clientSocket.leave(roomId);
          }
        }),
      );

      this.io.to(match.player1.socketId).emit('matchmaking:error', {
        error: 'Failed to start match',
      });
      this.io.to(match.player2.socketId).emit('matchmaking:error', {
        error: 'Failed to start match',
      });

      this.requeuePlayer(match.player1);
      this.requeuePlayer(match.player2);
    }
  }

  private handleConfirmTimeout(matchId: string) {
    const match = this.activeMatches.get(matchId);
    if (!match) return;

    if (match.confirmTimeout) {
      clearTimeout(match.confirmTimeout);
    }

    const timeoutAt = new Date(match.createdAt + this.MATCH_CONFIRM_TIMEOUT);
    console.warn(`[Matchmaking] Match ${matchId} confirmation timeout at ${timeoutAt.toISOString()}`);

    for (const player of [match.player1, match.player2]) {
      if (match.confirmedPlayers.has(player.socketId)) {
        this.io.to(player.socketId).emit('matchmaking:opponent-declined');
        this.requeuePlayer(player);
      } else {
        const penaltyDuration = this.applyPenalty(player.accountId);
        this.io.to(player.socketId).emit('matchmaking:penalty', { duration: penaltyDuration });
      }
    }

    this.activeMatches.delete(matchId);
  }

  private async ensurePlayersJoinRoom(socketIds: string[], roomId: string) {
    await Promise.all(
      socketIds.map(async (socketId) => {
        const clientSocket = this.io.sockets.sockets.get(socketId);
        if (clientSocket) {
          await clientSocket.join(roomId);
        }
      }),
    );
  }

  private requeuePlayer(player: Player) {
    const clientSocket = this.io.sockets.sockets.get(player.socketId);
    if (!clientSocket || clientSocket.disconnected) return;

    const queuedPlayer: Player = {
      ...player,
      searchStartTime: Date.now(),
    };

    this.removeFromQueue(player.socketId);

    if (player.mode === 'casual') {
      this.casualQueue.push(queuedPlayer);
    } else {
      this.rankedQueue.push(queuedPlayer);
    }
  }

  private removeFromQueue(socketId: string): boolean {
    const initialCasual = this.casualQueue.length;
    const initialRanked = this.rankedQueue.length;

    this.casualQueue = this.casualQueue.filter((p) => p.socketId !== socketId);
    this.rankedQueue = this.rankedQueue.filter((p) => p.socketId !== socketId);

    return this.casualQueue.length !== initialCasual || this.rankedQueue.length !== initialRanked;
  }

  private clearActiveMatch(matchId: string) {
    const match = this.activeMatches.get(matchId);
    if (!match) return;

    if (match.confirmTimeout) {
      clearTimeout(match.confirmTimeout);
    }

    this.activeMatches.delete(matchId);
  }

  private findActiveMatchBySocket(socketId: string): { matchId: string; match: Match } | null {
    for (const [matchId, match] of this.activeMatches.entries()) {
      if (match.player1.socketId === socketId || match.player2.socketId === socketId) {
        return { matchId, match };
      }
    }
    return null;
  }

  private applyPenalty(accountId: number): number {
    const now = Date.now();
    const existing = this.penalties.get(accountId);
    let declineCount = 1;

    if (existing && now - existing.lastDeclineTime < this.PENALTY_RESET_TIME) {
      declineCount = existing.declineCount + 1;
    }

    const durationSeconds =
      this.PENALTY_BASE_DURATION * Math.pow(this.PENALTY_MULTIPLIER, declineCount - 1);

    const penalty: PenaltyRecord = {
      accountId,
      declineCount,
      lastDeclineTime: now,
      penaltyUntil: now + durationSeconds * 1000,
    };

    this.penalties.set(accountId, penalty);
    return durationSeconds;
  }

  private getRemainingPenalty(accountId: number): number {
    const record = this.penalties.get(accountId);
    if (!record) return 0;

    const now = Date.now();
    if (now >= record.penaltyUntil) {
      this.penalties.delete(accountId);
      return 0;
    }

    return Math.ceil((record.penaltyUntil - now) / 1000);
  }

  private generateMatchId(): string {
    return `mm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export default MatchmakingSystem;






