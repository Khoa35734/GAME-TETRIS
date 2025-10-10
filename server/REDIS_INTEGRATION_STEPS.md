# 🚀 Redis Integration - Step by Step Implementation Guide

## 📋 Overview
This guide provides **exact code changes** to migrate from `Map<string, Room>` to Redis-backed `MatchManager`.

**Estimated time**: 30-45 minutes  
**Risk level**: Medium (test thoroughly before production)

---

## ✅ Pre-Migration Checklist

- [ ] Redis server is running (`redis-server` or Docker)
- [ ] Environment variables set in `.env`:
  ```env
  REDIS_HOST=localhost
  REDIS_PORT=6379
  ```
- [ ] Dependencies installed: `npm install ioredis`
- [ ] Backup current `index.ts` file
- [ ] Test environment ready

---

## 📦 Step 1: Import MatchManager

**File**: `server/src/index.ts`  
**Location**: Top of file, after existing imports

### Current Code:
```typescript
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { initRedis, saveRoom, deleteRoom, addToRankedQueue, removeFromRankedQueue, popBestMatch } from './redisStore';
import { initPostgres } from './postgres';
import authRouter from './routes/auth';
```

### Add This:
```typescript
import { matchManager, MatchData, PlayerMatchState } from './matchManager';
```

---

## 🗑️ Step 2: Remove Legacy Room Types & Maps

**File**: `server/src/index.ts`  
**Lines**: ~103-125

### Delete These Lines:
```typescript
type PlayerState = {
  id: string;
  ready: boolean;
  alive: boolean;
  combo: number;
  b2b: number;
  name?: string;
  pendingGarbage: number;
  lastAttackTime: number;
};

type Room = {
  id: string;
  host: string;
  gen: Generator<TType, any, any>;
  players: Map<string, PlayerState>;
  started: boolean;
  seed: number;
  maxPlayers: number;
};

const rooms = new Map<string, Room>();
```

### Keep These:
```typescript
type RoomAck = {
  ok: boolean;
  error?: 'exists' | 'not-found' | 'started' | 'full' | 'unknown';
  roomId?: string;
};

// Keep for backward compatibility with client events
const accountToSocket = new Map<string, string>();
const ipToSockets = new Map<string, Set<string>>();
const playersReadyForGame = new Map<string, Set<string>>();
```

---

## 🔄 Step 3: Add Helper Functions

**File**: `server/src/index.ts`  
**Location**: After `bagGenerator()` function

### Add These Helpers:
```typescript
/**
 * Convert MatchData to legacy room snapshot format
 * Used for room:update events to maintain client compatibility
 */
function matchToRoomSnapshot(match: MatchData) {
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
      combo: p.combo || 0,
      b2b: p.b2b || 0,
      pendingGarbage: p.pendingGarbage || 0,
    })),
  };
}

/**
 * Find player in match by socket ID
 */
function findPlayerInMatch(match: MatchData | null, socketId: string): PlayerMatchState | undefined {
  if (!match) return undefined;
  return match.players.find(p => p.socketId === socketId);
}
```

---

## 🏠 Step 4: Update `room:create` Handler

**File**: `server/src/index.ts`  
**Current Line**: ~185

### Replace Entire Handler:
```typescript
socket.on('room:create', async (roomId: string, optsOrCb?: any, cbMaybe?: any) => {
  let options: { maxPlayers?: number; name?: string } | undefined;
  let cb: ((result: RoomAck) => void) | undefined;

  if (typeof optsOrCb === 'function') {
    cb = optsOrCb as (result: RoomAck) => void;
  } else {
    options = optsOrCb;
    if (typeof cbMaybe === 'function') cb = cbMaybe;
  }

  try {
    // Check if match already exists
    const existing = await matchManager.getMatch(roomId);
    if (existing) {
      cb?.({ ok: false, error: 'exists' });
      return;
    }

    const maxPlayers = Math.max(2, Math.min(Number(options?.maxPlayers) || 2, 6));

    // Create match in Redis
    const match = await matchManager.createMatch({
      matchId: roomId,
      hostPlayerId: socket.id,
      hostSocketId: socket.id,
      mode: 'custom',
      maxPlayers: maxPlayers,
      roomId: roomId,
    });

    // Join socket.io room for broadcasting
    await socket.join(roomId);

    console.log(`[room:create] ✅ ${socket.id} created match ${roomId} (max ${maxPlayers} players)`);

    // Save to Redis (legacy function, optional - remove if not needed)
    saveRoom(roomId, { host: socket.id, players: [socket.id] }).catch(err => 
      console.error('[room:create] Redis saveRoom error:', err)
    );

    // Send success response
    cb?.({ ok: true, roomId });

    // Broadcast to room
    const snapshot = matchToRoomSnapshot(match);
    io.to(roomId).emit('room:update', snapshot);

  } catch (err) {
    console.error('[room:create] Error:', err);
    cb?.({ ok: false, error: 'unknown' });
  }
});
```

---

## 🚪 Step 5: Update `room:join` Handler

**File**: `server/src/index.ts`  
**Current Line**: ~221

### Replace Entire Handler:
```typescript
socket.on('room:join', async (roomId: string, optsOrCb?: any, cbMaybe?: any) => {
  let options: { name?: string } | undefined;
  let cb: ((result: RoomAck) => void) | undefined;

  if (typeof optsOrCb === 'function') {
    cb = optsOrCb as (result: RoomAck) => void;
  } else {
    options = optsOrCb;
    if (typeof cbMaybe === 'function') cb = cbMaybe;
  }

  try {
    // Get match from Redis
    const match = await matchManager.getMatch(roomId);
    if (!match) {
      cb?.({ ok: false, error: 'not-found' });
      return;
    }

    if (match.status === 'in_progress') {
      cb?.({ ok: false, error: 'started' });
      return;
    }

    if (match.players.length >= match.maxPlayers) {
      cb?.({ ok: false, error: 'full' });
      return;
    }

    // Add player to match
    await matchManager.addPlayer(roomId, {
      playerId: socket.id,
      socketId: socket.id,
      accountId: options?.name,
    });

    // Join socket.io room
    await socket.join(roomId);

    console.log(`[room:join] ✅ ${socket.id} joined match ${roomId}`);

    // Send success response
    cb?.({ ok: true, roomId });

    // Broadcast updated room state
    const updatedMatch = await matchManager.getMatch(roomId);
    if (updatedMatch) {
      const snapshot = matchToRoomSnapshot(updatedMatch);
      io.to(roomId).emit('room:update', snapshot);
    }

  } catch (err) {
    console.error('[room:join] Error:', err);
    cb?.({ ok: false, error: 'unknown' });
  }
});
```

---

## 🎯 Step 6: Update `room:ready` Handler

**File**: `server/src/index.ts`  
**Current Line**: ~311

### Replace Entire Handler:
```typescript
socket.on('room:ready', async (roomId: string, ready: boolean) => {
  try {
    const match = await matchManager.getMatch(roomId);
    if (!match) {
      console.error('[room:ready] Match not found:', roomId);
      return;
    }

    const player = findPlayerInMatch(match, socket.id);
    if (!player) {
      console.error('[room:ready] Player not in match:', socket.id);
      return;
    }

    // Update ready state
    await matchManager.setPlayerReady(roomId, player.playerId, ready);

    console.log(`[room:ready] Player ${socket.id} ready=${ready} in match ${roomId}`);

    // Broadcast updated room state
    const updatedMatch = await matchManager.getMatch(roomId);
    if (updatedMatch) {
      const snapshot = matchToRoomSnapshot(updatedMatch);
      io.to(roomId).emit('room:update', snapshot);
    }

  } catch (err) {
    console.error('[room:ready] Error:', err);
  }
});
```

---

## 🎮 Step 7: Update `room:startGame` Handler

**File**: `server/src/index.ts`  
**Current Line**: ~322

### Replace Entire Handler:
```typescript
socket.on('room:startGame', async (roomId: string, cb?: (result: any) => void) => {
  try {
    const match = await matchManager.getMatch(roomId);
    if (!match) {
      cb?.({ ok: false, error: 'not-found' });
      return;
    }

    const player = findPlayerInMatch(match, socket.id);
    if (!player || player.playerId !== match.hostPlayerId) {
      console.error('[room:startGame] Only host can start game');
      cb?.({ ok: false, error: 'not-host' });
      return;
    }

    // Check if all players are ready
    const allReady = match.players.every(p => p.ready);
    if (!allReady) {
      console.error('[room:startGame] Not all players ready');
      cb?.({ ok: false, error: 'not-ready' });
      return;
    }

    // Start match
    await matchManager.startMatch(roomId);

    console.log(`[room:startGame] ✅ Match ${roomId} started by ${socket.id}`);

    // Notify players to prepare (wait for game:im_ready)
    io.to(roomId).emit('game:startCountdown');

    cb?.({ ok: true, seed: match.seed });

  } catch (err) {
    console.error('[room:startGame] Error:', err);
    cb?.({ ok: false, error: 'unknown' });
  }
});
```

---

## ⚔️ Step 8: Update `game:attack` Handler (CRITICAL FOR GARBAGE)

**File**: `server/src/index.ts`  
**Current Line**: Search for `game:attack`

### Replace Entire Handler:
```typescript
socket.on('game:attack', async (roomId: string, data: { targetId: string; lines: number; isClear?: boolean }) => {
  const { targetId, lines, isClear = false } = data;

  if (lines <= 0) return;

  try {
    const match = await matchManager.getMatch(roomId);
    if (!match || match.status !== 'in_progress') {
      console.error('[game:attack] Match not found or not in progress:', roomId);
      return;
    }

    const attacker = findPlayerInMatch(match, socket.id);
    if (!attacker || !attacker.alive) {
      console.error('[game:attack] Attacker not found or dead:', socket.id);
      return;
    }

    const target = match.players.find(p => p.playerId === targetId);
    if (!target || !target.alive) {
      console.error('[game:attack] Target not found or dead:', targetId);
      return;
    }

    console.log(`[game:attack] ${socket.id} → ${targetId}: ${lines} lines (isClear=${isClear})`);

    // Update attacker stats
    await matchManager.updatePlayerStats(roomId, attacker.playerId, {
      totalGarbageSent: (attacker.totalGarbageSent || 0) + lines,
      lastActionTime: Date.now(),
    });

    let actualGarbage = 0;

    if (isClear) {
      // Target just cleared lines → CANCEL mechanic
      const result = await matchManager.cancelGarbage(roomId, targetId, lines);
      actualGarbage = result.remaining;

      console.log(
        `[game:attack] 🔄 Cancel mechanic: ${result.cancelled} cancelled, ${result.remaining} remaining`
      );

      // Notify attacker that their attack was partially/fully cancelled
      if (result.cancelled > 0) {
        io.to(attacker.socketId).emit('game:garbageCancelled', {
          targetId: target.playerId,
          cancelled: result.cancelled,
        });
      }
    } else {
      // Normal attack → QUEUE garbage
      actualGarbage = await matchManager.queueGarbage(roomId, targetId, lines);
    }

    // Notify target about incoming garbage
    if (actualGarbage > 0) {
      io.to(target.socketId).emit('game:receiveAttack', {
        from: attacker.playerId,
        lines: actualGarbage,
      });

      // Update target stats
      await matchManager.updatePlayerStats(roomId, target.playerId, {
        pendingGarbage: actualGarbage,
        totalGarbageReceived: (target.totalGarbageReceived || 0) + actualGarbage,
      });
    }

    // Broadcast match state update
    const updatedMatch = await matchManager.getMatch(roomId);
    if (updatedMatch) {
      io.to(roomId).emit('match:statsUpdate', {
        players: updatedMatch.players.map(p => ({
          id: p.playerId,
          pendingGarbage: p.pendingGarbage,
          combo: p.combo,
          b2b: p.b2b,
        })),
      });
    }

  } catch (err) {
    console.error('[game:attack] Error:', err);
  }
});
```

---

## 💀 Step 9: Update `game:over` Handler

**File**: `server/src/index.ts`  
**Current Line**: Search for `game:over`

### Replace Entire Handler:
```typescript
socket.on('game:over', async (roomId: string, playerId: string) => {
  try {
    const match = await matchManager.getMatch(roomId);
    if (!match) {
      console.error('[game:over] Match not found:', roomId);
      return;
    }

    const player = match.players.find(p => p.playerId === playerId);
    if (!player) {
      console.error('[game:over] Player not found:', playerId);
      return;
    }

    // Mark player as dead
    await matchManager.updatePlayerStats(roomId, playerId, {
      alive: false,
      lastActionTime: Date.now(),
    });

    console.log(`[game:over] 💀 Player ${playerId} died in match ${roomId}`);

    // Broadcast to room
    io.to(roomId).emit('game:playerDied', { playerId });

    // Check if match is over (only 1 player alive)
    const updatedMatch = await matchManager.getMatch(roomId);
    if (!updatedMatch) return;

    const alivePlayers = updatedMatch.players.filter(p => p.alive);

    if (alivePlayers.length === 1) {
      const winner = alivePlayers[0];
      console.log(`[game:over] 🏆 Winner: ${winner.playerId} in match ${roomId}`);

      // End match
      await matchManager.endMatch(roomId, winner.playerId);

      // Broadcast winner
      io.to(roomId).emit('game:winner', {
        winnerId: winner.playerId,
        winnerName: winner.accountId || winner.playerId,
        stats: {
          garbageSent: winner.totalGarbageSent,
          garbageReceived: winner.totalGarbageReceived,
        },
      });

      // Save stats to Redis (optional)
      await matchManager.saveMatchStats(roomId);

    } else if (alivePlayers.length === 0) {
      console.log(`[game:over] ⚔️ All players dead in match ${roomId} (draw)`);
      await matchManager.endMatch(roomId);
      io.to(roomId).emit('game:draw');
    }

  } catch (err) {
    console.error('[game:over] Error:', err);
  }
});
```

---

## 🔌 Step 10: Update `disconnect` Handler

**File**: `server/src/index.ts`  
**Current Line**: Search for `socket.on('disconnect'`

### Replace Entire Handler:
```typescript
socket.on('disconnect', async () => {
  console.log(`[disconnect] ${socket.id} disconnected`);

  try {
    // Find match this player was in
    const matchInfo = await matchManager.getMatchByPlayer(socket.id);
    if (!matchInfo) {
      console.log(`[disconnect] Player ${socket.id} was not in any match`);
      return;
    }

    const { matchId } = matchInfo;
    const match = await matchManager.getMatch(matchId);
    if (!match) return;

    // Mark as disconnected
    await matchManager.markDisconnected(matchId, socket.id);

    console.log(`[disconnect] Player ${socket.id} marked disconnected in match ${matchId}`);

    // If match was in progress, mark player as dead
    if (match.status === 'in_progress') {
      await matchManager.updatePlayerStats(matchId, socket.id, {
        alive: false,
      });

      io.to(matchId).emit('game:playerDied', { playerId: socket.id });

      // Check if match should end
      const updatedMatch = await matchManager.getMatch(matchId);
      if (updatedMatch) {
        const alivePlayers = updatedMatch.players.filter(p => p.alive);
        
        if (alivePlayers.length === 1) {
          await matchManager.endMatch(matchId, alivePlayers[0].playerId);
          io.to(matchId).emit('game:winner', {
            winnerId: alivePlayers[0].playerId,
          });
        } else if (alivePlayers.length === 0) {
          await matchManager.endMatch(matchId);
          io.to(matchId).emit('game:draw');
        }
      }
    } else {
      // Match not started yet → remove player
      const wasHost = match.hostPlayerId === socket.id;
      
      if (wasHost) {
        // Host left → delete match
        await matchManager.deleteMatch(matchId);
        deleteRoom(matchId).catch(err => console.error('[disconnect] deleteRoom error:', err));
        io.to(matchId).emit('room:closed', { reason: 'host-left' });
        console.log(`[disconnect] Host left, match ${matchId} deleted`);
      } else {
        // Regular player left → just update
        const updatedMatch = await matchManager.getMatch(matchId);
        if (updatedMatch) {
          const snapshot = matchToRoomSnapshot(updatedMatch);
          io.to(matchId).emit('room:update', snapshot);
        }
      }
    }

    // Cleanup legacy maps
    if (ip) {
      const set = ipToSockets.get(ip);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) ipToSockets.delete(ip);
      }
    }

    // Remove from accountToSocket if applicable
    for (const [acc, sid] of accountToSocket.entries()) {
      if (sid === socket.id) {
        accountToSocket.delete(acc);
        break;
      }
    }

  } catch (err) {
    console.error('[disconnect] Error:', err);
  }
});
```

---

## 🧹 Step 11: Add Periodic Cleanup Task

**File**: `server/src/index.ts`  
**Location**: After `io.on('connection', ...)` block, before `server.listen()`

### Add This:
```typescript
// ========================================
// 🧹 PERIODIC CLEANUP FOR STALE MATCHES
// ========================================
setInterval(async () => {
  try {
    const cleaned = await matchManager.cleanupStaleMatches();
    if (cleaned > 0) {
      console.log(`[Cleanup] 🧹 Removed ${cleaned} stale matches`);
    }
  } catch (err) {
    console.error('[Cleanup] Error:', err);
  }
}, 5 * 60 * 1000); // Every 5 minutes

console.log('[Cleanup] ✅ Periodic cleanup task started (5 min interval)');
```

---

## 🧪 Step 12: Testing Checklist

### Basic Functionality Tests:
- [ ] **Create room**: Client can create a room successfully
- [ ] **Join room**: Another client can join the room
- [ ] **Ready up**: Players can toggle ready status
- [ ] **Start game**: Host can start when all ready
- [ ] **Send garbage**: Attacking player queues garbage correctly
- [ ] **Cancel garbage**: Clearing lines cancels pending garbage
- [ ] **Player dies**: Game detects death and broadcasts
- [ ] **Winner declared**: Last alive player wins
- [ ] **Disconnect**: Player disconnect handled gracefully

### Concurrent Match Tests:
- [ ] Create 10+ matches simultaneously
- [ ] All matches run independently
- [ ] No cross-match interference
- [ ] Redis memory usage acceptable

### Redis Verification Commands:
```bash
# Check active matches
redis-cli SMEMBERS matches:active

# View specific match
redis-cli GET match:<matchId>

# Check player mapping
redis-cli GET player:match:<playerId>

# Check garbage queue
redis-cli GET match:<matchId>:garbage:<playerId>

# Monitor real-time Redis operations
redis-cli MONITOR
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: `matchManager is not defined`
**Solution**: Make sure you imported at the top:
```typescript
import { matchManager, MatchData, PlayerMatchState } from './matchManager';
```

### Issue 2: TypeScript errors about `rooms.get()` or `rooms.has()`
**Solution**: You forgot to remove the `const rooms = new Map<string, Room>();` declaration. Delete it.

### Issue 3: Garbage not cancelling correctly
**Solution**: Check that `isClear` flag is sent correctly from client in `game:attack` event:
```typescript
socket.emit('game:attack', { targetId, lines, isClear: true });
```

### Issue 4: Redis connection refused
**Solution**: 
1. Check Redis is running: `redis-cli ping` → should return `PONG`
2. Check `.env` file has correct `REDIS_HOST` and `REDIS_PORT`
3. Check `redisStore.ts` is properly initialized

### Issue 5: Match not found after creation
**Solution**: 
- Add `await` before all `matchManager` calls
- Check Redis TTL isn't too short (should be 2 hours for matches)
- Verify match creation succeeded (check return value)

---

## 📊 Performance Monitoring

### Add These Debug Logs (Optional):
```typescript
// At start of server
console.log('[Redis] MatchManager initialized');
console.log('[Redis] Match TTL: 2 hours');
console.log('[Redis] Garbage TTL: 5 minutes');
console.log('[Redis] Stats TTL: 7 days');

// In each handler (optional, remove in production)
const start = Date.now();
// ... your code ...
console.log(`[Performance] ${eventName} took ${Date.now() - start}ms`);
```

### Redis Memory Usage:
```bash
redis-cli INFO memory
```

---

## ✅ Migration Complete Checklist

- [ ] All socket handlers updated to use `matchManager`
- [ ] Legacy `rooms` Map removed
- [ ] Helper functions added (`matchToRoomSnapshot`, `findPlayerInMatch`)
- [ ] Cleanup task added (5 min interval)
- [ ] All tests passing
- [ ] Redis memory usage monitored
- [ ] Production deployment planned

---

## 🎉 Success Indicators

You'll know the migration is successful when:

1. ✅ No TypeScript compilation errors
2. ✅ `npm run dev` starts without errors
3. ✅ Redis logs show `matches:active` SET operations
4. ✅ Multiple concurrent matches work
5. ✅ Garbage queue/cancel mechanics work correctly
6. ✅ Disconnects don't crash server
7. ✅ Periodic cleanup runs every 5 minutes

---

## 📞 Need Help?

If you encounter issues:
1. Check server console logs
2. Use `redis-cli MONITOR` to see Redis operations
3. Use `matchManager.debugMatch(matchId)` helper function
4. Review `REDIS_MATCH_MANAGER_GUIDE.md` for architecture details

---

**Good luck with your migration! 🚀**
