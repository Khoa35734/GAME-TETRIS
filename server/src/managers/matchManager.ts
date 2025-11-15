/**
 * Match Manager - Redis-based concurrent match handling
 * Manages multiple matches simultaneously with atomic operations
 */

import { match } from 'assert/strict';
import { redis } from '../stores/redisStore';

// ========================================
// ≡ƒÄ» REDIS KEYS STRUCTURE
// ========================================
const KEYS = {
  // Active matches hash: match:{matchId} ΓåÆ JSON
  match: (matchId: string) => `match:${matchId}`,
  
  // Player to match mapping: player:{playerId} ΓåÆ matchId
  playerMatch: (playerId: string) => `player:match:${playerId}`,
  
  // Active matches set (for cleanup/monitoring)
  activeMatches: 'matches:active',
  
  // Match stats (for analytics)
  matchStats: (matchId: string) => `match:stats:${matchId}`,
  
  // Lock for atomic operations
  matchLock: (matchId: string) => `match:lock:${matchId}`,
  
  // Garbage queue per player in match
  playerGarbage: (matchId: string, playerId: string) => `match:${matchId}:garbage:${playerId}`,
};

// ========================================
// ≡ƒôè TYPE DEFINITIONS
// ========================================
export type MatchStatus = 'waiting' | 'starting' | 'in_progress' | 'paused' | 'finished';

export interface PlayerMatchState {
  playerId: string;
  socketId: string;
  accountId?: string;
  name?: string;
  ready: boolean;
  alive: boolean;
  score: number;
  combo: number;
  b2b: number;
  pendingGarbage: number;
  totalGarbageSent: number;
  totalGarbageReceived: number;
  lastActionTime: number;
  disconnectedAt?: number;
}

export interface MatchData {
  matchId: string;
  roomId?: string; // Optional for custom rooms
  status: MatchStatus;
  mode: 'ranked' | 'custom' | 'practice';
  hostPlayerId: string;
  players: PlayerMatchState[];
  seed: number;
  startTime?: number;
  endTime?: number;
  winnerId?: string;
  maxPlayers: number;
  createdAt: number;
  updatedAt: number;
}

export interface MatchStats {
  matchId: string;
  duration: number;
  totalGarbageExchanged: number;
  maxCombo: number;
  maxB2b: number;
  averageAPM: number; // Actions per minute
}

// ========================================
// ≡ƒöº MATCH MANAGER CLASS
// ========================================
export class MatchManager {
  private readonly MATCH_TTL = 7200; // 2 hours
  private readonly LOCK_TTL = 5; // 5 seconds for locks
  private readonly PLAYER_TIMEOUT = 30000; // 30 seconds disconnect timeout
  private async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async withMatchLock<T>(matchId: string, task: () => Promise<T>): Promise<T> {
    const lockKey = KEYS.matchLock(matchId);
    const maxAttempts = 6;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const acquired = await redis.set(lockKey, '1', { NX: true, EX: this.LOCK_TTL });
      if (acquired) {
        try {
          return await task();
        } finally {
          await redis.del(lockKey).catch(() => undefined);
        }
      }
      await this.wait(50 * (attempt + 1));
    }
    throw new Error(`[MatchManager] Failed to acquire lock for match ${matchId}`);
  }

  
  /**
   * Create a new match
   */
  async createMatch(data: {
    matchId: string;
    hostPlayerId: string;
    hostSocketId: string;
    hostAccountId?: string;
    hostName?: string;
    mode: 'ranked' | 'custom' | 'practice';
    maxPlayers?: number;
    roomId?: string;
  }): Promise<MatchData> {
    const now = Date.now();
    const seed = now ^ data.matchId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const hostName = data.hostName || (data.hostAccountId ? `User_${data.hostAccountId}` : `User_${data.hostPlayerId.slice(0,4)}`);
    const match: MatchData = {
      matchId: data.matchId,
      roomId: data.roomId,
      status: 'waiting',
      mode: data.mode,
      hostPlayerId: data.hostPlayerId,
      players: [
        {
          playerId: data.hostPlayerId,
          socketId: data.hostSocketId,
          accountId: data.hostAccountId,
          name: hostName,
          ready: false,
          alive: true,
          score: 0,
          combo: 0,
          b2b: 0,
          pendingGarbage: 0,
          totalGarbageSent: 0,
          totalGarbageReceived: 0,
          lastActionTime: now,
        },
      ],
      seed,
      maxPlayers: data.maxPlayers || 2,
      createdAt: now,
      updatedAt: now,
    };
    
    // Store match data
    await this.saveMatch(match);
    
    // Add to active matches set
    await redis.sAdd(KEYS.activeMatches, data.matchId);
    
    // Map player to match
    await redis.set(KEYS.playerMatch(data.hostPlayerId), data.matchId, { EX: this.MATCH_TTL });
    
    console.log(`[MatchManager] Γ£à Created match ${data.matchId} (${data.mode})`);
    return match;
  }
  
  /**
   * Add player to existing match
   */
  async addPlayer(

    matchId: string, data: {
    playerId: string;
    socketId: string;
    accountId?: string;
    name?: string;
  }): Promise<MatchData | null> {
    console.log("[DEBUG addPlayer:start]", { matchId, data });

    const match = await this.getMatch(matchId);
    
    if (!match) return null;
    console.log('[DEBUG matchManager.addPlayer]', {
  matchId,
  playerId: data.playerId,
  socketId: data.socketId,
  playersBefore: match.players.length
});

    if (match.status !== 'waiting') {
      console.warn(`[MatchManager] ΓÜá∩╕Å Cannot add player to match ${matchId} - status: ${match.status}`);
      return null;
    }
    
    if (match.players.length >= match.maxPlayers) {
      console.warn(`[MatchManager] ΓÜá∩╕Å Match ${matchId} is full`);
      return null;
    }
    
    // Check if player already in match
    const existing = match.players.find(p => p.playerId === data.playerId);
    if (existing) {
      // Update socket ID (reconnection)
      existing.socketId = data.socketId;
      existing.alive = true;
      existing.disconnectedAt = undefined;
      if (data.name) existing.name = data.name;
    } else {
      // Add new player
      const now = Date.now();
      const playerName = data.name || `User_${data.playerId.slice(0,4)}`; // Lß║Ñy t├¬n hoß║╖c tß║ío fallback
      match.players.push({
        playerId: data.playerId,
        socketId: data.socketId,
        accountId: data.accountId,
        name: playerName,
        ready: false,
        alive: true,
        score: 0,
        combo: 0,
        b2b: 0,
        pendingGarbage: 0,
        totalGarbageSent: 0,
        totalGarbageReceived: 0,
        lastActionTime: now,
      });
    }
    console.log('[DEBUG matchManager.addPlayer] playersAfter', match.players.map(p => p.playerId));

    match.updatedAt = Date.now();
    console.log("[DEBUG addPlayer:after]", { playersAfter: match.players.length, allPlayers: match.players });

    await this.saveMatch(match);
    
    // Map player to match
    await redis.set(KEYS.playerMatch(data.playerId), matchId, { EX: this.MATCH_TTL });
    
    console.log(`[MatchManager] ≡ƒæñ Player ${data.playerId} joined match ${matchId}`);
    return match;
  }
  
  /**
   * Remove player from match
   */
  async removePlayer(matchId: string, playerId: string): Promise<MatchData | null> {
    const match = await this.getMatch(matchId);
    if (!match) return null;
    
    match.players = match.players.filter(p => p.playerId !== playerId);
    match.updatedAt = Date.now();
    
    // Remove player mapping
    await redis.del(KEYS.playerMatch(playerId));
    
    // If no players left, delete match
    if (match.players.length === 0) {
      await this.deleteMatch(matchId);
      console.log(`[MatchManager] ≡ƒùæ∩╕Å Deleted empty match ${matchId}`);
      return null;
    }
    
    // Transfer host if needed
    if (match.hostPlayerId === playerId && match.players.length > 0) {
      match.hostPlayerId = match.players[0].playerId;
      console.log(`[MatchManager] ≡ƒææ New host for ${matchId}: ${match.hostPlayerId}`);
    }
    
    await this.saveMatch(match);
    console.log(`[MatchManager] ≡ƒæï Player ${playerId} left match ${matchId}`);
    return match;
  }
  
  /**
   * Mark player as ready/unready
   */
  // ==================================================
  // START TH├èM Mß╗ÜI
  // Th├¬m to├án bß╗Ö h├ám n├áy
  // ==================================================
  /**
   * Update socket ID for a reconnecting player
   */
  async updatePlayerSocket(matchId: string, playerId: string /* accountId */, newSocketId: string): Promise<MatchData | null> {
    const match = await this.getMatch(matchId);
    if (!match) return null;

    const player = match.players.find(p => p.playerId === playerId); // T├¼m bß║▒ng accountId
    if (player) {
      player.socketId = newSocketId; // Cß║¡p nhß║¡t socketId mß╗¢i
      player.alive = true; // ─É├ính dß║Ñu l├á ─æ├ú kß║┐t nß╗æi lß║íi
      player.disconnectedAt = undefined;
      match.updatedAt = Date.now();
      await this.saveMatch(match);
      console.log(`[MatchManager] ≡ƒöä Player ${playerId} (${player.name}) reconnected with new socket ${newSocketId} in match ${matchId}`);
    } else {
        console.warn(`[MatchManager] ΓÜá∩╕Å updatePlayerSocket: Player ${playerId} not found in match ${matchId}`);
    }
    return match;
  }
  // ==================================================
  // Kß║╛T TH├ÜC H├ÇM Mß╗ÜI
  // ==================================================
  async setPlayerReady(
    matchId: string,
    playerId: string,
    ready: boolean
  ): Promise<{ match: MatchData; allReady: boolean; statusChanged: boolean } | null> {
    return this.withMatchLock(matchId, async () => {
      const match = await this.getMatch(matchId);
      if (!match) return null;

      const player = match.players.find(
        (p) => p.playerId === playerId || p.socketId === playerId
      );
      if (!player) return null;

      player.ready = ready;
      player.alive = true;
      match.updatedAt = Date.now();

      const allReady =
        match.players.length >= match.maxPlayers &&
        match.players.every((p) => p.ready);

      let statusChanged = false;
      if (allReady && match.status === 'waiting') {
        match.status = 'in_progress';
        match.startTime = Date.now();
        statusChanged = true;
        for (const participant of match.players) {
          participant.ready = true;
          participant.alive = true;
        }
      }

      await this.saveMatch(match);

      console.log('[MatchManager] Ready update', {
        matchId,
        playerId,
        ready,
        allReady,
        status: match.status,
      });

      return { match, allReady, statusChanged };
    });
  }

  
  /**
   * Start match (all players ready)
   */
  async startMatch(matchId: string): Promise<MatchData | null> {
    return this.withMatchLock(matchId, async () => {
      const match = await this.getMatch(matchId);
      if (!match) return null;

      if (match.status !== 'waiting') {
        console.warn('[MatchManager] Cannot start match - invalid status', { matchId, status: match.status });
        return null;
      }

      if (match.players.length < match.maxPlayers) {
        console.warn('[MatchManager] Cannot start match - missing players', {
          matchId,
          current: match.players.length,
          required: match.maxPlayers,
        });
        return null;
      }

      if (!match.players.every((p) => p.ready)) {
        console.warn('[MatchManager] Cannot start match - player not ready', { matchId });
        return null;
      }

      match.status = 'in_progress';
      match.startTime = Date.now();
      match.updatedAt = match.startTime;
      for (const participant of match.players) {
        participant.alive = true;
        participant.ready = true;
      }

      await this.saveMatch(match);

      console.log('[MatchManager] Match started', {
        matchId,
        players: match.players.map((p) => p.playerId),
      });

      return match;
    });
  }

  
  /**
   * End match
   */
  async endMatch(matchId: string, winnerId?: string): Promise<MatchData | null> {
    return this.withMatchLock(matchId, async () => {
      const match = await this.getMatch(matchId);
      if (!match) return null;

      match.status = 'finished';
      match.endTime = Date.now();
      match.winnerId = winnerId;
      match.updatedAt = Date.now();

      await this.saveMatch(match);
      await this.saveMatchStats(match);
      await redis.sRem(KEYS.activeMatches, matchId);

      for (const player of match.players) {
        await redis.del(KEYS.playerMatch(player.playerId));
        await redis.del(KEYS.playerGarbage(matchId, player.playerId));
      }

      console.log('[MatchManager] Match ended', { matchId, winnerId });

      return match;
    });
  }

  async resolveTopout(
    matchId: string,
    loserId: string
  ): Promise<{ match: MatchData; winnerId?: string; loserId: string } | null> {
    return this.withMatchLock(matchId, async () => {
      const match = await this.getMatch(matchId);
      if (!match) return null;

      const loser = match.players.find(
        (p) => p.playerId === loserId || p.socketId === loserId
      );
      if (!loser) return null;

      loser.alive = false;
      match.updatedAt = Date.now();

      const remaining = match.players.filter((p) => p.alive);
      const winner = remaining.length === 1 ? remaining[0] : undefined;
      const winnerIdFinal = winner ? winner.playerId : undefined;

      if (winnerIdFinal) {
        match.status = 'finished';
        match.winnerId = winnerIdFinal;
        match.endTime = Date.now();
      }

      await this.saveMatch(match);

      if (winnerIdFinal) {
        await this.saveMatchStats(match);
        await redis.sRem(KEYS.activeMatches, matchId);
      }

      console.log('[MatchManager] Topout resolved', {
        matchId,
        loser: loser.playerId,
        winner: winnerIdFinal ?? null,
      });

      return { match, winnerId: winnerIdFinal, loserId: loser.playerId };
    });
  }

  /**
   * Reset per-round state so leftover garbage/combos do not leak into the next game.
   */
  async resetRoundState(matchId: string): Promise<MatchData | null> {
    return this.withMatchLock(matchId, async () => {
      const match = await this.getMatch(matchId);
      if (!match) {
        return null;
      }

      const now = Date.now();
      const playerIds: string[] = [];

      for (const player of match.players) {
        player.alive = true;
        player.pendingGarbage = 0;
        player.combo = 0;
        player.b2b = 0;
        playerIds.push(player.playerId);
      }

      match.updatedAt = now;
      await this.saveMatch(match);

      // Clear queued garbage in Redis so the next round starts clean.
      await Promise.all(
        playerIds.map((playerId) =>
          redis.del(KEYS.playerGarbage(matchId, playerId)).catch(() => undefined),
        ),
      );

      return match;
    });
  }

  
  /**
   * Queue garbage for player (atomic operation)
   */
  async queueGarbage(matchId: string, targetPlayerId: string, lines: number): Promise<number> {
    const key = KEYS.playerGarbage(matchId, targetPlayerId);
    const newTotal = await redis.incrBy(key, lines);
    await redis.expire(key, 300); // 5 minutes
    
    console.log(`[MatchManager] ≡ƒÆú Queued ${lines} garbage for ${targetPlayerId} (total: ${newTotal})`);
    return newTotal;
  }
  
  /**
   * Cancel garbage (counter-attack)
   */
  async cancelGarbage(matchId: string, targetPlayerId: string, lines: number): Promise<{ cancelled: number; remaining: number }> {
    const key = KEYS.playerGarbage(matchId, targetPlayerId);
    const current = await redis.get(key);
    const currentAmount = Number(current) || 0;
    
    const cancelled = Math.min(currentAmount, lines);
    const remaining = Math.max(0, currentAmount - lines);
    
    if (remaining > 0) {
      await redis.set(key, remaining.toString(), { EX: 300 });
    } else {
      await redis.del(key);
    }
    
    console.log(`[MatchManager] ≡ƒ¢í∩╕Å Cancelled ${cancelled} garbage for ${targetPlayerId} (${currentAmount} ΓåÆ ${remaining})`);
    return { cancelled, remaining };
  }
  
  /**
   * Get and clear pending garbage
   */
  async consumeGarbage(matchId: string, playerId: string): Promise<number> {
    const key = KEYS.playerGarbage(matchId, playerId);
    const amount = await redis.get(key);
    await redis.del(key);
    
    const lines = Number(amount) || 0;
    console.log(`[MatchManager] ≡ƒôÑ Consuming ${lines} garbage for ${playerId}`);
    return lines;
  }
  
  /**
   * Update player stats after action
   */
  async updatePlayerStats(matchId: string, playerId: string, updates: {
    combo?: number;
    b2b?: number;
    score?: number;
  }): Promise<void> {
    const match = await this.getMatch(matchId);
    if (!match) return;
    
    const player = match.players.find(p => p.playerId === playerId);
    if (!player) return;
    
    if (updates.combo !== undefined) player.combo = updates.combo;
    if (updates.b2b !== undefined) player.b2b = updates.b2b;
    if (updates.score !== undefined) player.score = updates.score;
    player.lastActionTime = Date.now();
    
    match.updatedAt = Date.now();
    await this.saveMatch(match);
  }
  
  /**
   * Mark player as disconnected
   */
  async markDisconnected(matchId: string, playerId: string): Promise<void> {
    const match = await this.getMatch(matchId);
    if (!match) return;
    
    const player = match.players.find(p => p.playerId === playerId);
    if (!player) return;
    
    player.alive = false;
    player.disconnectedAt = Date.now();
    match.updatedAt = Date.now();
    
    await this.saveMatch(match);
    console.log(`[MatchManager] ≡ƒöî Player ${playerId} disconnected from match ${matchId}`);
  }
  
  /**
   * Check if player can rejoin after disconnect
   */
  canRejoin(player: PlayerMatchState): boolean {
    if (!player.disconnectedAt) return true;
    const elapsed = Date.now() - player.disconnectedAt;
    return elapsed < this.PLAYER_TIMEOUT;
  }
  
  /**
   * Get match by ID
   */
  async getMatch(matchId: string): Promise<MatchData | null> {
    try {
      const data = await redis.get(KEYS.match(matchId));
      if (!data) return null;
      return JSON.parse(data);
    } catch (err) {
      console.error(`[MatchManager] Error loading match ${matchId}:`, err);
      return null;
    }
  }
  
  /**
   * Get match by player ID
   */
  async getMatchByPlayer(playerId: string): Promise<MatchData | null> {
    const matchId = await redis.get(KEYS.playerMatch(playerId));
    if (!matchId) return null;
    return this.getMatch(matchId);
  }
  
  /**
   * Get all active matches
   */
  async getActiveMatches(): Promise<string[]> {
    return redis.sMembers(KEYS.activeMatches);
  }
  
  /**
   * Count active matches
   */
  async countActiveMatches(): Promise<number> {
    return redis.sCard(KEYS.activeMatches);
  }
  
  /**
   * Save match to Redis
   */
  private async saveMatch(match: MatchData): Promise<void> {
    await redis.set(
      KEYS.match(match.matchId),
      JSON.stringify(match),
      { EX: this.MATCH_TTL }
    );
  }
  
  /**
   * Delete match from Redis
   */
  async deleteMatch(matchId: string): Promise<void> {
    await redis.del(KEYS.match(matchId));
    await redis.sRem(KEYS.activeMatches, matchId);
    
    const match = await this.getMatch(matchId);
    if (match) {
      for (const player of match.players) {
        await redis.del(KEYS.playerMatch(player.playerId));
        await redis.del(KEYS.playerGarbage(matchId, player.playerId));
      }
    }
  }
  
  /**
   * Save match statistics
   */
  private async saveMatchStats(match: MatchData): Promise<void> {
    if (!match.startTime || !match.endTime) return;
    
    const stats: MatchStats = {
      matchId: match.matchId,
      duration: match.endTime - match.startTime,
      totalGarbageExchanged: match.players.reduce((sum, p) => sum + p.totalGarbageSent, 0),
      maxCombo: Math.max(...match.players.map(p => p.combo)),
      maxB2b: Math.max(...match.players.map(p => p.b2b)),
      averageAPM: 0, // Calculate if needed
    };
    
    await redis.set(
      KEYS.matchStats(match.matchId),
      JSON.stringify(stats),
      { EX: 86400 * 7 } // Keep stats for 7 days
    );
  }
  
  /**
   * Cleanup stale matches (call periodically)
   */
  async cleanupStaleMatches(): Promise<number> {
    const activeMatchIds = await this.getActiveMatches();
    let cleaned = 0;
    
    for (const matchId of activeMatchIds) {
      const match = await this.getMatch(matchId);
      if (!match) {
        await redis.sRem(KEYS.activeMatches, matchId);
        cleaned++;
        continue;
      }
      
      // Check for stale matches (no updates in 30 minutes)
      const staleThreshold = Date.now() - (30 * 60 * 1000);
      if (match.updatedAt < staleThreshold && match.status !== 'finished') {
        console.log(`[MatchManager] ≡ƒº╣ Cleaning stale match ${matchId}`);
        await this.deleteMatch(matchId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[MatchManager] ≡ƒº╣ Cleaned ${cleaned} stale matches`);
    }
    
    return cleaned;
  }
}

// Singleton instance
export const matchManager = new MatchManager();
