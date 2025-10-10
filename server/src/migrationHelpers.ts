/**
 * Migration Script: Convert from in-memory rooms to Redis MatchManager
 * 
 * This script provides helper functions to gradually migrate your codebase
 * from the legacy Map-based room system to Redis-backed MatchManager.
 * 
 * Usage:
 * 1. Import this alongside your current index.ts
 * 2. Use wrapper functions during transition
 * 3. Replace all calls with direct matchManager calls
 * 4. Remove this file when migration complete
 */

import { matchManager, MatchData, PlayerMatchState } from './matchManager';

// ========================================
// 📦 LEGACY TYPE DEFINITIONS
// ========================================
type TType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

type LegacyPlayerState = {
  id: string;
  ready: boolean;
  alive: boolean;
  combo: number;
  b2b: number;
  name?: string;
  pendingGarbage: number;
  lastAttackTime: number;
};

type LegacyRoom = {
  id: string;
  host: string;
  gen: Generator<TType, any, any>;
  players: Map<string, LegacyPlayerState>;
  started: boolean;
  seed: number;
  maxPlayers: number;
};

// ========================================
// 🔄 CONVERSION FUNCTIONS
// ========================================

/**
 * Convert legacy room to MatchData
 */
export function legacyRoomToMatch(room: LegacyRoom): MatchData {
  const players: PlayerMatchState[] = Array.from(room.players.values()).map(p => ({
    playerId: p.id,
    socketId: p.id, // Legacy used socket.id as player ID
    ready: p.ready,
    alive: p.alive,
    score: 0,
    combo: p.combo,
    b2b: p.b2b,
    pendingGarbage: p.pendingGarbage,
    totalGarbageSent: 0,
    totalGarbageReceived: 0,
    lastActionTime: p.lastAttackTime || Date.now(),
  }));

  return {
    matchId: room.id,
    roomId: room.id,
    status: room.started ? 'in_progress' : 'waiting',
    mode: 'custom',
    hostPlayerId: room.host,
    players,
    seed: room.seed,
    maxPlayers: room.maxPlayers,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Convert MatchData to legacy room snapshot format
 */
export function matchToLegacySnapshot(match: MatchData) {
  return {
    id: match.matchId,
    host: match.hostPlayerId,
    started: match.status === 'in_progress',
    maxPlayers: match.maxPlayers,
    players: match.players.map(p => ({
      id: p.playerId,
      ready: p.ready,
      alive: p.alive,
      name: p.accountId || null,
    })),
  };
}

// ========================================
// 🛠️ MIGRATION HELPER FUNCTIONS
// ========================================

/**
 * Migrate existing in-memory rooms to Redis
 * Call this once at server startup if you have active rooms
 */
export async function migrateExistingRooms(
  legacyRooms: Map<string, LegacyRoom>
): Promise<{ migrated: number; failed: number }> {
  console.log(`[Migration] Starting migration of ${legacyRooms.size} rooms...`);
  
  let migrated = 0;
  let failed = 0;

  for (const [roomId, room] of legacyRooms) {
    try {
      const match = legacyRoomToMatch(room);
      
      // Create match in Redis
      await matchManager.createMatch({
        matchId: match.matchId,
        hostPlayerId: match.hostPlayerId,
        hostSocketId: match.hostPlayerId,
        mode: match.mode,
        maxPlayers: match.maxPlayers,
        roomId: match.roomId,
      });
      
      // Add other players
      for (const player of match.players.slice(1)) {
        await matchManager.addPlayer(match.matchId, {
          playerId: player.playerId,
          socketId: player.socketId,
        });
        
        if (player.ready) {
          await matchManager.setPlayerReady(match.matchId, player.playerId, true);
        }
      }
      
      // Start if already started
      if (match.status === 'in_progress') {
        await matchManager.startMatch(match.matchId);
      }
      
      migrated++;
      console.log(`[Migration] ✅ Migrated room ${roomId}`);
    } catch (err) {
      failed++;
      console.error(`[Migration] ❌ Failed to migrate room ${roomId}:`, err);
    }
  }

  console.log(`[Migration] Complete: ${migrated} migrated, ${failed} failed`);
  return { migrated, failed };
}

/**
 * Dual-mode wrapper: writes to both legacy Map and Redis
 * Use during transition period for safety
 */
export class DualModeRoomManager {
  constructor(
    private legacyRooms: Map<string, LegacyRoom>
  ) {}

  async createRoom(
    roomId: string,
    hostSocketId: string,
    options: { maxPlayers?: number; name?: string }
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      // Create in MatchManager (Redis)
      const match = await matchManager.createMatch({
        matchId: roomId,
        hostPlayerId: hostSocketId,
        hostSocketId: hostSocketId,
        mode: 'custom',
        maxPlayers: options.maxPlayers || 2,
        roomId: roomId,
      });

      // Also create in legacy Map for backward compatibility
      // (Remove this after full migration)
      const seed = Date.now() ^ roomId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const legacyRoom: LegacyRoom = {
        id: roomId,
        host: hostSocketId,
        gen: this.createBagGenerator(seed),
        players: new Map([
          [hostSocketId, {
            id: hostSocketId,
            ready: false,
            alive: true,
            combo: 0,
            b2b: 0,
            name: options.name,
            pendingGarbage: 0,
            lastAttackTime: 0,
          }],
        ]),
        started: false,
        seed,
        maxPlayers: options.maxPlayers || 2,
      };
      this.legacyRooms.set(roomId, legacyRoom);

      console.log(`[DualMode] ✅ Created room ${roomId} in both systems`);
      return { ok: true };
    } catch (err) {
      console.error(`[DualMode] ❌ Failed to create room:`, err);
      return { ok: false, error: 'failed' };
    }
  }

  async getRoom(roomId: string): Promise<MatchData | null> {
    // Try Redis first
    const match = await matchManager.getMatch(roomId);
    if (match) return match;

    // Fallback to legacy (during migration)
    const legacyRoom = this.legacyRooms.get(roomId);
    if (legacyRoom) {
      return legacyRoomToMatch(legacyRoom);
    }

    return null;
  }

  private createBagGenerator(seed: number): Generator<TType, any, any> {
    const BAG: TType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    function* gen() {
      let s = seed >>> 0;
      const rand = () => (s = (1664525 * s + 1013904223) >>> 0) / 2 ** 32;
      while (true) {
        const bag = [...BAG];
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        for (const t of bag) yield t;
      }
    }
    return gen();
  }
}

// ========================================
// 🧪 TESTING HELPERS
// ========================================

/**
 * Compare legacy room state with Redis match state
 * Useful for validation during migration
 */
export async function compareRoomStates(
  roomId: string,
  legacyRoom: LegacyRoom
): Promise<{ match: boolean; differences: string[] }> {
  const match = await matchManager.getMatch(roomId);
  if (!match) {
    return { match: false, differences: ['Match not found in Redis'] };
  }

  const differences: string[] = [];

  // Compare basic fields
  if (match.hostPlayerId !== legacyRoom.host) {
    differences.push(`Host mismatch: ${match.hostPlayerId} vs ${legacyRoom.host}`);
  }

  if (match.maxPlayers !== legacyRoom.maxPlayers) {
    differences.push(`MaxPlayers mismatch: ${match.maxPlayers} vs ${legacyRoom.maxPlayers}`);
  }

  const legacyStarted = legacyRoom.started;
  const matchStarted = match.status === 'in_progress';
  if (matchStarted !== legacyStarted) {
    differences.push(`Started state mismatch: ${matchStarted} vs ${legacyStarted}`);
  }

  // Compare players
  if (match.players.length !== legacyRoom.players.size) {
    differences.push(
      `Player count mismatch: ${match.players.length} vs ${legacyRoom.players.size}`
    );
  }

  for (const player of match.players) {
    const legacyPlayer = legacyRoom.players.get(player.playerId);
    if (!legacyPlayer) {
      differences.push(`Player ${player.playerId} in Redis but not in legacy`);
      continue;
    }

    if (player.ready !== legacyPlayer.ready) {
      differences.push(
        `Player ${player.playerId} ready mismatch: ${player.ready} vs ${legacyPlayer.ready}`
      );
    }

    if (player.alive !== legacyPlayer.alive) {
      differences.push(
        `Player ${player.playerId} alive mismatch: ${player.alive} vs ${legacyPlayer.alive}`
      );
    }
  }

  return {
    match: differences.length === 0,
    differences,
  };
}

/**
 * Verify Redis data integrity
 */
export async function verifyRedisIntegrity(): Promise<{
  ok: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Get all active matches
    const matchIds = await matchManager.getActiveMatches();
    console.log(`[Verify] Checking ${matchIds.length} active matches...`);

    for (const matchId of matchIds) {
      const match = await matchManager.getMatch(matchId);
      if (!match) {
        issues.push(`Match ${matchId} in active set but data not found`);
        continue;
      }

      // Verify players
      for (const player of match.players) {
        const playerMatchId = await matchManager.getMatchByPlayer(player.playerId);
        if (!playerMatchId) {
          issues.push(
            `Player ${player.playerId} in match ${matchId} but no player mapping`
          );
        } else if (playerMatchId.matchId !== matchId) {
          issues.push(
            `Player ${player.playerId} mapping mismatch: ${playerMatchId.matchId} vs ${matchId}`
          );
        }
      }
    }

    console.log(`[Verify] Complete. Found ${issues.length} issues.`);
  } catch (err) {
    issues.push(`Verification error: ${err}`);
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

// ========================================
// 📊 MIGRATION METRICS
// ========================================

export interface MigrationMetrics {
  totalRooms: number;
  migratedRooms: number;
  failedRooms: number;
  activeMatches: number;
  totalPlayers: number;
  avgPlayersPerMatch: number;
  redisMemoryUsed: string;
}

export async function getMigrationMetrics(): Promise<MigrationMetrics> {
  const activeMatchIds = await matchManager.getActiveMatches();
  let totalPlayers = 0;

  for (const matchId of activeMatchIds) {
    const match = await matchManager.getMatch(matchId);
    if (match) {
      totalPlayers += match.players.length;
    }
  }

  return {
    totalRooms: 0, // Set from legacy rooms count
    migratedRooms: activeMatchIds.length,
    failedRooms: 0,
    activeMatches: activeMatchIds.length,
    totalPlayers,
    avgPlayersPerMatch: activeMatchIds.length > 0 ? totalPlayers / activeMatchIds.length : 0,
    redisMemoryUsed: 'N/A', // Get from Redis INFO command if needed
  };
}

// ========================================
// 🚀 EXAMPLE MIGRATION WORKFLOW
// ========================================

/**
 * Example: Full migration workflow
 * 
 * async function performMigration() {
 *   console.log('Starting migration...');
 *   
 *   // 1. Backup current state
 *   const snapshot = new Map(rooms);
 *   
 *   // 2. Migrate to Redis
 *   const result = await migrateExistingRooms(rooms);
 *   console.log('Migration result:', result);
 *   
 *   // 3. Verify integrity
 *   const verification = await verifyRedisIntegrity();
 *   if (!verification.ok) {
 *     console.error('Verification failed:', verification.issues);
 *     // Rollback if needed
 *     return;
 *   }
 *   
 *   // 4. Get metrics
 *   const metrics = await getMigrationMetrics();
 *   console.log('Migration metrics:', metrics);
 *   
 *   // 5. Clear old rooms Map (after testing period)
 *   // rooms.clear();
 *   
 *   console.log('Migration complete!');
 * }
 */
