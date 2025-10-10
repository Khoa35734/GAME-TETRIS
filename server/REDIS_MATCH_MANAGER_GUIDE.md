# 🎮 Redis Match Manager Integration Guide

## 📋 Tổng quan

Match Manager là hệ thống quản lý match sử dụng Redis để xử lý **nhiều trận đấu đồng thời** một cách hiệu quả, atomic và scalable.

## 🎯 Tính năng chính

### ✅ **Concurrent Match Handling**
- Xử lý hàng trăm/ngàn trận đấu cùng lúc
- Atomic operations với Redis
- Lock-free architecture (mostly)
- TTL tự động cleanup

### ✅ **Player Management**
- Track player state per match
- Reconnection support (30s timeout)
- Automatic host transfer
- Player-to-match mapping

### ✅ **Garbage System**
- Queue garbage atomically
- Cancel mechanic (counter-attack)
- Consume pending garbage
- Per-player garbage tracking

### ✅ **Stats & Analytics**
- Match duration
- Total garbage exchanged
- Max combo/B2B tracking
- Match history (7 days)

## 🏗️ Architecture

### **Redis Keys Structure**

```typescript
// Match data (full state)
match:{matchId} → JSON
  TTL: 2 hours

// Player mapping (fast lookup)
player:match:{playerId} → matchId
  TTL: 2 hours

// Active matches set
matches:active → Set<matchId>

// Garbage queue per player
match:{matchId}:garbage:{playerId} → number
  TTL: 5 minutes

// Match statistics
match:stats:{matchId} → JSON
  TTL: 7 days
```

### **Data Flow**

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ Socket.IO
       ↓
┌─────────────┐
│   Server    │───────┐
│  (index.ts) │       │
└──────┬──────┘       │
       │              │
       ↓              ↓
┌─────────────┐  ┌──────────┐
│   Match     │  │  Redis   │
│   Manager   │←─┤  Store   │
└─────────────┘  └──────────┘
```

## 🔧 Integration Steps

### **Step 1: Import MatchManager**

```typescript
// server/src/index.ts
import { matchManager, MatchData } from './matchManager';
```

### **Step 2: Replace Room Logic với Match**

#### **Before (Legacy):**
```typescript
const rooms = new Map<string, Room>();
```

#### **After (Redis):**
```typescript
// Không cần Map nữa - tất cả trong Redis
// rooms được thay bằng matchManager
```

### **Step 3: Update Room Create**

```typescript
socket.on('room:create', async (roomId: string, options: any, cb?: Function) => {
  try {
    const match = await matchManager.createMatch({
      matchId: roomId,
      hostPlayerId: socket.id,
      hostSocketId: socket.id,
      mode: 'custom',
      maxPlayers: options?.maxPlayers || 2,
      roomId: roomId,
    });
    
    socket.join(roomId);
    cb?.({ ok: true, roomId });
    
    // Broadcast update
    io.to(roomId).emit('room:update', matchToRoomSnapshot(match));
  } catch (err) {
    cb?.({ ok: false, error: 'failed' });
  }
});
```

### **Step 4: Update Room Join**

```typescript
socket.on('room:join', async (roomId: string, options: any, cb?: Function) => {
  try {
    const match = await matchManager.addPlayer(roomId, {
      playerId: socket.id,
      socketId: socket.id,
    });
    
    if (!match) {
      cb?.({ ok: false, error: 'not-found' });
      return;
    }
    
    socket.join(roomId);
    cb?.({ ok: true, roomId });
    
    io.to(roomId).emit('room:update', matchToRoomSnapshot(match));
  } catch (err) {
    cb?.({ ok: false, error: 'failed' });
  }
});
```

### **Step 5: Update Game Start**

```typescript
socket.on('room:startGame', async (roomId: string, cb?: Function) => {
  try {
    const match = await matchManager.startMatch(roomId);
    
    if (!match) {
      cb?.({ ok: false, error: 'cannot-start' });
      return;
    }
    
    // Notify clients to prepare
    io.to(roomId).emit('game:starting', { roomId });
    
    cb?.({ ok: true });
  } catch (err) {
    cb?.({ ok: false, error: 'failed' });
  }
});
```

### **Step 6: Update Garbage System**

```typescript
socket.on('game:attack', async (roomId: string, payload: { lines: number }) => {
  const match = await matchManager.getMatch(roomId);
  if (!match || match.status !== 'in_progress') return;
  
  const lines = Math.max(0, Math.min(10, payload.lines));
  if (lines === 0) return;
  
  // Find opponents
  const opponents = match.players.filter(p => 
    p.playerId !== socket.id && p.alive
  );
  
  for (const opp of opponents) {
    // Try to cancel first
    const { cancelled, remaining } = await matchManager.cancelGarbage(
      roomId, 
      opp.playerId, 
      lines
    );
    
    if (cancelled > 0) {
      io.to(opp.socketId).emit('game:garbageCancelled', { 
        cancelled, 
        remaining 
      });
    }
    
    // Queue remaining
    if (lines > cancelled) {
      const total = await matchManager.queueGarbage(
        roomId,
        opp.playerId,
        lines - cancelled
      );
      
      io.to(opp.socketId).emit('game:incomingGarbage', { 
        lines: total 
      });
    }
    
    // Schedule application
    setTimeout(async () => {
      const garbage = await matchManager.consumeGarbage(roomId, opp.playerId);
      if (garbage > 0) {
        io.to(opp.socketId).emit('game:applyGarbage', { lines: garbage });
      }
    }, 500);
  }
});
```

### **Step 7: Update Disconnect Logic**

```typescript
socket.on('disconnect', async () => {
  const match = await matchManager.getMatchByPlayer(socket.id);
  if (!match) return;
  
  // Mark disconnected
  await matchManager.markDisconnected(match.matchId, socket.id);
  
  // Notify others
  socket.to(match.matchId).emit('player:disconnect', { 
    playerId: socket.id 
  });
  
  // Wait 30s for reconnection
  setTimeout(async () => {
    const currentMatch = await matchManager.getMatch(match.matchId);
    if (!currentMatch) return;
    
    const player = currentMatch.players.find(p => p.playerId === socket.id);
    if (!player || player.alive) return; // Reconnected or already handled
    
    // Timeout - end game
    const alive = currentMatch.players.filter(p => 
      p.alive && p.playerId !== socket.id
    );
    
    if (alive.length === 1) {
      await matchManager.endMatch(currentMatch.matchId, alive[0].playerId);
      
      io.to(socket.id).emit('game:over', { 
        winner: alive[0].playerId,
        reason: 'Bạn đã ngắt kết nối' 
      });
      
      io.to(alive[0].socketId).emit('game:over', { 
        winner: alive[0].playerId,
        reason: 'Đối thủ ngắt kết nối' 
      });
    }
  }, 30000); // 30 seconds
});
```

### **Step 8: Helper Functions**

```typescript
// Convert MatchData to legacy room snapshot format
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
    })),
  };
}
```

### **Step 9: Ranked Match Integration**

```typescript
socket.on('ranked:match', async (playerId: string, elo: number, cb?: Function) => {
  const opponent = await popBestMatch(elo, 150, playerId);
  if (!opponent) {
    await addToRankedQueue(playerId, elo);
    return cb?.({ match: null });
  }
  
  const oppSocketId = accountToSocket.get(String(opponent.playerId));
  if (!oppSocketId) {
    await addToRankedQueue(playerId, elo);
    return cb?.({ match: null });
  }
  
  // Create match using MatchManager
  const matchId = `rk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  
  const match = await matchManager.createMatch({
    matchId,
    hostPlayerId: socket.id,
    hostSocketId: socket.id,
    hostAccountId: playerId,
    mode: 'ranked',
    maxPlayers: 2,
  });
  
  await matchManager.addPlayer(matchId, {
    playerId: oppSocketId,
    socketId: oppSocketId,
    accountId: opponent.playerId,
  });
  
  // Set both ready
  await matchManager.setPlayerReady(matchId, socket.id, true);
  await matchManager.setPlayerReady(matchId, oppSocketId, true);
  
  // Start immediately
  await matchManager.startMatch(matchId);
  
  // Join sockets
  socket.join(matchId);
  io.sockets.sockets.get(oppSocketId)?.join(matchId);
  
  // Notify both
  socket.emit('ranked:found', { roomId: matchId, opponent: opponent.playerId });
  io.to(oppSocketId).emit('ranked:found', { roomId: matchId, opponent: playerId });
  
  cb?.({ match: { roomId: matchId, opponent: opponent.playerId } });
});
```

## 🧹 Cleanup & Maintenance

### **Periodic Cleanup Task**

```typescript
// Run every 5 minutes
setInterval(async () => {
  const cleaned = await matchManager.cleanupStaleMatches();
  console.log(`[Cleanup] Removed ${cleaned} stale matches`);
}, 5 * 60 * 1000);
```

### **Monitor Active Matches**

```typescript
// Health check endpoint
app.get('/health', async (_req, res) => {
  const activeMatches = await matchManager.countActiveMatches();
  res.json({ 
    ok: true, 
    activeMatches,
    timestamp: Date.now(),
  });
});
```

## 📊 Benefits

### **Performance**
- ✅ **Atomic operations**: No race conditions
- ✅ **O(1) lookups**: Redis hash/set operations
- ✅ **Auto-cleanup**: TTL handles memory management
- ✅ **Horizontal scaling**: Multiple server instances can share Redis

### **Reliability**
- ✅ **Persistence**: Redis optional persistence (RDB/AOF)
- ✅ **Recovery**: Matches survive server restart
- ✅ **Consistency**: Single source of truth

### **Scalability**
- ✅ **1000+ concurrent matches**: Easily handled
- ✅ **Load balancing**: Multiple servers → single Redis
- ✅ **Cluster support**: Redis Cluster for massive scale

## 🔐 Security Considerations

### **Input Validation**
```typescript
// Always validate matchId format
function isValidMatchId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}

// Sanitize player IDs
function sanitizePlayerId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}
```

### **Rate Limiting**
```typescript
// Limit garbage attacks per second
const attackLimiter = new Map<string, number>();

socket.on('game:attack', async (roomId: string, payload: { lines: number }) => {
  const key = `${socket.id}:${roomId}`;
  const now = Date.now();
  const lastAttack = attackLimiter.get(key) || 0;
  
  if (now - lastAttack < 100) { // Max 10 attacks/sec
    console.warn(`[RateLimit] Player ${socket.id} attacking too fast`);
    return;
  }
  
  attackLimiter.set(key, now);
  
  // ... rest of attack logic
});
```

## 🐛 Debugging

### **Log Match State**
```typescript
async function debugMatch(matchId: string) {
  const match = await matchManager.getMatch(matchId);
  console.log('[DEBUG] Match:', JSON.stringify(match, null, 2));
  
  for (const player of match?.players || []) {
    const garbage = await redis.get(
      `match:${matchId}:garbage:${player.playerId}`
    );
    console.log(`[DEBUG] ${player.playerId} pending garbage:`, garbage);
  }
}
```

### **Monitor Redis Keys**
```bash
# Connect to Redis CLI
redis-cli

# List all match keys
KEYS match:*

# Get match data
GET match:rk_abc123

# Check active matches
SMEMBERS matches:active

# Monitor real-time commands
MONITOR
```

## 📝 Migration Checklist

- [ ] Import MatchManager in index.ts
- [ ] Replace `rooms` Map with matchManager calls
- [ ] Update room:create handler
- [ ] Update room:join handler
- [ ] Update room:leave handler
- [ ] Update room:startGame handler
- [ ] Update game:attack with garbage queue
- [ ] Update disconnect logic
- [ ] Add periodic cleanup task
- [ ] Test concurrent matches
- [ ] Load test with 100+ matches
- [ ] Monitor Redis memory usage
- [ ] Setup Redis persistence (optional)
- [ ] Document new API endpoints

## 🎯 Next Steps

1. **Implement migration** theo guide trên
2. **Test thoroughly** với nhiều concurrent matches
3. **Monitor performance** với Redis metrics
4. **Consider scaling** nếu cần (Redis Cluster, multiple servers)
5. **Add analytics** từ match stats

## 📚 References

- [Redis Commands](https://redis.io/commands/)
- [Node Redis Client](https://github.com/redis/node-redis)
- [Socket.IO Rooms](https://socket.io/docs/v4/rooms/)
- [TTL Best Practices](https://redis.io/commands/expire/)
