# Redis Match Board State Fix

## Problem
After Redis integration, opponent board state was not visible during matches. Players couldn't see each other's board updates in real-time.

## Root Cause Analysis

### Issue 1: game:state Handler Only Checked Legacy Rooms
```typescript
// BEFORE - Only checked Map
socket.on('game:state', (roomId, payload) => {
  if (!rooms.has(roomId)) return; // ❌ Redis matches fail here
  socket.to(roomId).emit('game:state', {...payload, from: socket.id});
});
```

**Problem**: When a match was created in Redis via `matchManager.createMatch()`, the `game:state` handler would return early because `rooms.has(roomId)` was false, preventing board state from broadcasting.

### Issue 2: Missing Piece Generator for Redis Matches
```typescript
// game:requestNext only used legacy rooms
const r = rooms.get(roomId);
if (!r || !r.gen) return; // ❌ Redis matches have no r.gen
const pieces = nextPieces(r.gen, n);
```

**Problem**: Piece generators were stored in the legacy `rooms` Map as `r.gen`. Redis matches had no generator stored, so `game:requestNext` couldn't generate additional pieces.

## Solution

### Part 1: Update game:state to Support Redis Matches
```typescript
// AFTER - Check both Redis and Map
socket.on('game:state', async (roomId, payload) => {
  const match = await matchManager.getMatch(roomId);
  const r = rooms.get(roomId);
  
  if (!match && !r) {
    console.log('[game:state] ❌ Match not found:', roomId);
    return;
  }
  
  socket.to(roomId).emit('game:state', {...payload, from: socket.id});
  console.log(`[game:state] ✅ Broadcasted state from ${socket.id} to room ${roomId}`);
});
```

**Benefits**:
- ✅ Redis matches can now broadcast board state
- ✅ Legacy rooms continue to work
- ✅ Error logging for debugging

### Part 2: Implement Generator Storage for Redis Matches

#### Step 1: Create matchGenerators Map
```typescript
// Store piece generators for Redis matches
const matchGenerators = new Map<string, Generator<TType, any, any>>();
```

#### Step 2: Store Generator on Match Start
```typescript
socket.on('game:im_ready', async (roomId: string) => {
  const match = await matchManager.getMatch(roomId);
  
  if (match) {
    // Create generator with match seed
    const gen = bagGenerator(match.seed);
    
    // Store generator for later use
    matchGenerators.set(roomId, gen);
    console.log(`[Room ${roomId}] 💾 Stored generator for Redis match`);
    
    // Send initial 14 pieces
    const pieces = nextPieces(gen, 14);
    socket.emit('game:initialPieces', pieces);
  }
  // ... legacy room logic
});
```

#### Step 3: Retrieve Generator on Piece Request
```typescript
socket.on('game:requestNext', async (roomId: string, n: number = 7) => {
  let pieces: TType[] = [];
  
  const match = await matchManager.getMatch(roomId);
  
  if (match) {
    // Retrieve stored generator
    const gen = matchGenerators.get(roomId);
    
    if (gen) {
      pieces = nextPieces(gen, n);
      console.log(`[game:requestNext] ✅ Generated ${n} pieces for Redis match ${roomId}`);
    } else {
      console.warn(`[game:requestNext] ⚠️ No generator found for Redis match ${roomId}`);
      return;
    }
  } else {
    // Legacy room logic
    const r = rooms.get(roomId);
    if (r && r.gen) {
      pieces = nextPieces(r.gen, n);
    }
  }
  
  socket.emit('game:nextPieces', pieces);
});
```

#### Step 4: Cleanup Generator on Match End
```typescript
socket.on('disconnect', async () => {
  // ... match ending logic
  
  if (alivePlayers.length === 1) {
    await matchManager.endMatch(matchId, alivePlayers[0].playerId);
    
    // Cleanup generator to prevent memory leaks
    matchGenerators.delete(matchId);
    console.log(`[disconnect] 🧹 Cleaned up generator for match ${matchId}`);
  } else if (alivePlayers.length === 0) {
    await matchManager.endMatch(matchId);
    
    // Cleanup generator
    matchGenerators.delete(matchId);
    console.log(`[disconnect] 🧹 Cleaned up generator for match ${matchId}`);
  }
});
```

## Architecture

### Data Flow for Redis Matches

```
Match Start:
1. RoomLobby: Host clicks "Bắt đầu" → emit room:startGame
2. Server: Creates match with seed → emit game:starting
3. Client: Navigates to /versus
4. Client: emit game:im_ready
5. Server: Creates bagGenerator(seed) → Store in matchGenerators Map → Send 14 pieces

During Gameplay:
6. Client: Needs more pieces → emit game:requestNext
7. Server: Retrieve generator from matchGenerators → Generate 7 pieces → Send to client
8. Client: Board updates → emit game:state
9. Server: Check both Redis + Map → Broadcast to opponent

Match End:
10. Server: Player disconnects → endMatch → matchGenerators.delete(matchId)
```

### Memory Management

**Before Fix**:
- ❌ Generators stored only in legacy `rooms` Map
- ❌ Redis matches had no generator persistence
- ❌ No cleanup mechanism

**After Fix**:
- ✅ Generators stored in dedicated `matchGenerators` Map
- ✅ Key: matchId, Value: Generator instance
- ✅ Automatic cleanup on match end (disconnect handler)
- ✅ Prevents memory leaks

## Files Modified

### server/src/index.ts
1. **Line ~165**: Added `matchGenerators` Map declaration
2. **Line ~595**: Updated `game:im_ready` to store generator for Redis matches
3. **Line ~670**: Updated `game:requestNext` to retrieve stored generator
4. **Line ~698**: Updated `game:state` to check both Redis and Map
5. **Line ~1098, ~1112**: Added generator cleanup in disconnect handler

## Testing Checklist

### Functionality Tests
- [ ] Create 2-player match via Redis
- [ ] Both players receive identical piece sequences
- [ ] Opponent board updates in real-time
- [ ] Pieces continue generating throughout match (game:requestNext works)
- [ ] Match ends cleanly when player disconnects

### Performance Tests
- [ ] No memory leaks (generators cleaned up)
- [ ] Board state broadcasting has low latency
- [ ] Multiple concurrent matches work independently

### Edge Cases
- [ ] Player disconnects during piece generation
- [ ] Match ends before generator cleanup
- [ ] Re-join match after disconnect (if supported)

## Console Logs Reference

### Success Logs
```
[Room abc123] 💾 Stored generator for Redis match
[game:requestNext] ✅ Generated 7 pieces for Redis match abc123
[game:state] ✅ Broadcasted state from xyz789 to room abc123
[disconnect] 🧹 Cleaned up generator for match abc123
```

### Error Logs
```
[game:state] ❌ Match not found: abc123
[game:requestNext] ⚠️ No generator found for Redis match abc123
```

## Related Documents
- `MIGRATION_COMPLETED.md` - Full Redis migration overview
- `FIX-ROOM-ENTRY.md` - Event name mismatch fix (game:starting vs game:start)
- `server/src/matchManager.ts` - Redis MatchManager implementation

## Next Steps
1. ✅ Fix game:state handler (completed)
2. ✅ Implement matchGenerators storage (completed)
3. ✅ Update game:requestNext (completed)
4. ✅ Add cleanup on match end (completed)
5. ⏳ Test opponent board visibility (pending user verification)
6. ⏳ Validate garbage system with Redis (pending)

## Status
🟢 **FIXED** - All code changes implemented, ready for testing.
