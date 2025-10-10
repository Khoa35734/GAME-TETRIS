# Custom Room Redis Migration Progress

## 🎯 Objective
Migrate custom room system from legacy Map-based storage to Redis MatchManager to achieve feature parity with ranked matches. This fixes the reported issues:
- ❌ Không hiển thị trạng thái board đối phương (Opponent board not displayed)
- ❌ Không có logic xử lý kết quả (No game end logic)
- ❌ Không có garbage queue, disconnect handling, AFK timeout

## ✅ Completed Handlers (Redis-only)

### 1. **room:create** ✅
- **Status**: Fully migrated
- **Changes**: Removed legacy Map creation, now uses ONLY `matchManager.createMatch()`
- **Result**: Custom rooms now stored in Redis with proper match structure
- **Line**: ~250-290

### 2. **room:join** ✅
- **Status**: Fully migrated
- **Changes**: Removed `rooms.get()` fallback, uses only `matchManager.getMatch()` and `matchManager.addPlayer()`
- **Added**: Reconnect notification via `player:reconnect` emit for existing players
- **Result**: Players properly added to Redis matches
- **Line**: ~300-360

### 3. **room:ready** ✅
- **Status**: Fully migrated
- **Changes**: Removed legacy room ready state update, uses only `matchManager.setPlayerReady()`
- **Result**: Ready state properly tracked in Redis
- **Line**: ~398-420

### 4. **room:startGame** ✅
- **Status**: Fully migrated
- **Changes**: 
  - Removed legacy room checks and state updates
  - Uses only Redis `matchManager.startMatch()`
  - Validates host permission via Redis match
  - Checks player readiness from Redis match state
- **Result**: Game start properly tracked in Redis, triggers `game:starting` event
- **Line**: ~430-495

### 5. **game:im_ready** ✅
- **Status**: Fully migrated
- **Changes**:
  - Removed legacy room generator usage
  - Uses only Redis match seed for piece generation
  - Stores generator in `matchGenerators` Map keyed by roomId
- **Result**: Piece queue generated from Redis match seed, all players receive consistent pieces
- **Line**: ~497-545

### 6. **room:leave** ✅
- **Status**: Fully migrated
- **Changes**:
  - Uses `matchManager.removePlayer()` instead of `r.players.delete()`
  - Auto host transfer handled by MatchManager
  - Empty match deletion via `matchManager.deleteMatch()`
- **Result**: Player removal and cleanup properly handled in Redis
- **Line**: ~376-410

### 7. **room:sync** ✅
- **Status**: Fully migrated
- **Changes**: Uses `matchToRoomSnapshot(match)` instead of legacy `roomSnapshot(roomId)`
- **Result**: Clients receive proper Redis match state
- **Line**: ~362-382

---

## 🔄 Partially Complete / Needs Redis Migration

### 8. **game:start** (Legacy Handler)
- **Status**: ⚠️ DEPRECATED - Should be removed
- **Current**: Still checks legacy `rooms.get()` 
- **Issue**: Redundant with `game:im_ready` handshake
- **Action**: Can be removed entirely as all start logic handled by `game:im_ready`
- **Line**: ~573-595

### 9. **game:requestNext**
- **Status**: ⚠️ DUAL MODE
- **Current**: Checks both `matchManager.getMatch()` AND `rooms.get()`
- **Issue**: Uses dual path for piece generation
- **Action**: Remove legacy generator usage, use only `matchGenerators.get(roomId)`
- **Line**: ~597-630

### 10. **game:state** (UDP + TCP)
- **Status**: ⚠️ DUAL MODE
- **Current**: Checks both `await matchManager.getMatch()` AND `rooms.get()`
- **Issue**: Broadcasts state to both Redis and legacy rooms
- **Action**: Remove legacy path, use only Redis match
- **Line**: ~633-675

### 11. **game:attack** / **game:garbage** (TCP)
- **Status**: ⚠️ DUAL MODE
- **Current**: Has both Redis `matchManager.queueGarbage()` AND legacy `r.players` updates
- **Issue**: Dual mode garbage handling
- **Action**: Remove legacy garbage logic, use only Redis MatchManager
- **Line**: ~678-750

### 12. **game:topout**
- **Status**: ⚠️ DUAL MODE
- **Current**: Updates both Redis `player.alive = false` AND legacy `r.players`
- **Issue**: Dual mode topout handling
- **Action**: Remove legacy topout logic, use only `matchManager.setPlayerAlive()`
- **Line**: ~816-890

### 13. **game:combo** / **game:b2b**
- **Status**: ⚠️ DUAL MODE
- **Current**: Updates both Redis and legacy room stats
- **Action**: Remove legacy updates, use only Redis MatchManager
- **Line**: ~843-920

### 14. **disconnect** handler
- **Status**: ⚠️ COMPLEX DUAL MODE
- **Current**: Has parallel logic for Redis matches and legacy rooms
- **Issue**: Maintains both reconnection paths
- **Action**: Remove legacy room disconnect logic, use only Redis match reconnection
- **Line**: ~1050-1220

---

## 🗑️ Code Cleanup Needed

### Remove Legacy Infrastructure
```typescript
// Line ~160 - REMOVE THIS
const rooms = new Map<string, Room>();

// Line ~1256 - REMOVE THIS FUNCTION
function roomSnapshot(roomId: string) { ... }

// Remove all references to:
- saveRoom(r)
- deleteRoom(roomId) // Old Redis function, not MatchManager
- rooms.get()
- rooms.set()
- rooms.delete()
```

### Legacy Types to Remove
```typescript
interface Room {
  id: string;
  host: string;
  players: Map<string, { ... }>;
  started: boolean;
  seed: number;
  gen: Generator<TType, any, any>;
  maxPlayers: number;
}
```

---

## 📊 Migration Statistics

| Handler | Status | Redis-only | Legacy Code Removed |
|---------|--------|------------|---------------------|
| room:create | ✅ Complete | Yes | 40+ lines |
| room:join | ✅ Complete | Yes | 50+ lines |
| room:ready | ✅ Complete | Yes | 20 lines |
| room:startGame | ✅ Complete | Yes | 35 lines |
| game:im_ready | ✅ Complete | Yes | 25 lines |
| room:leave | ✅ Complete | Yes | 15 lines |
| room:sync | ✅ Complete | Yes | 5 lines |
| game:start | ⚠️ Pending | No | Should be removed |
| game:requestNext | ⚠️ Pending | No | 20 lines to remove |
| game:state | ⚠️ Pending | No | 30 lines to remove |
| game:attack | ⚠️ Pending | No | 40 lines to remove |
| game:topout | ⚠️ Pending | No | 50 lines to remove |
| disconnect | ⚠️ Pending | No | 100+ lines to remove |

**Progress**: 7/13 handlers complete (53%)

---

## 🚀 Next Steps (Priority Order)

1. **Remove legacy game:start handler** (line ~573)
   - Already redundant with `game:im_ready`
   - Simple deletion

2. **Migrate game:requestNext** (line ~597)
   - Remove `rooms.get()` fallback
   - Use only `matchGenerators.get(roomId)`

3. **Migrate game:state** (line ~633)
   - Remove legacy room broadcast
   - Use only Redis match for opponent state

4. **Migrate game:attack/garbage** (line ~678)
   - Remove legacy player updates
   - Use only `matchManager.queueGarbage()`

5. **Migrate game:topout** (line ~816)
   - Remove legacy alive state updates
   - Use only Redis `setPlayerAlive()`
   - Ensure proper match ending via `matchManager.endMatch()`

6. **Migrate game:combo/b2b** (line ~843)
   - Remove legacy stat updates
   - Use only Redis player state

7. **Migrate disconnect handler** (line ~1050)
   - Most complex - has ranked queue removal, room cleanup
   - Remove legacy room reconnection logic
   - Keep only Redis match disconnect handling

8. **Final Cleanup**
   - Remove `const rooms = new Map()`
   - Remove `roomSnapshot()` function
   - Remove legacy `saveRoom()`, `deleteRoom()` imports
   - Remove `Room` interface and related types

---

## 🧪 Testing Checklist

After migration is complete, test custom rooms:

- [ ] Room creation and joining works
- [ ] Ready state synchronization
- [ ] Game start with proper piece sequence
- [ ] Opponent board state visible
- [ ] Garbage queue and application
- [ ] Topout detection and winner announcement
- [ ] Disconnect/reconnect handling
- [ ] AFK timeout
- [ ] Host transfer when host leaves
- [ ] Empty room cleanup

---

## 📝 Key Benefits After Migration

1. **Feature Parity**: Custom rooms will have all features of ranked matches
2. **Opponent Board Sync**: Redis stores full player state including board
3. **Proper Game End Logic**: `matchManager.endMatch()` handles winners, stats
4. **Garbage Queue System**: Redis manages pending garbage per player
5. **Disconnect Handling**: Automatic player state preservation and reconnection
6. **AFK Detection**: Built into MatchManager
7. **Code Simplification**: Single code path instead of dual mode
8. **Scalability**: Redis persistence allows server restarts without losing matches

---

## 🐛 Known Issues (Will Be Fixed by Migration)

1. ❌ **Opponent board not visible** - Legacy rooms don't broadcast full player state
2. ❌ **No game end logic** - Legacy rooms have no winner detection
3. ❌ **Garbage not queued** - Legacy uses instant apply instead of Redis queue
4. ❌ **Disconnect breaks game** - Legacy has no reconnect state preservation
5. ❌ **No AFK timeout** - Legacy rooms have no activity tracking

All these issues will be resolved once the migration to Redis-only is complete.

---

## 💡 Architecture Notes

### Current (Problematic) Architecture
```
Client Request
    ↓
Socket Handler (DUAL MODE)
    ├─→ Redis MatchManager (ranked only)
    └─→ Legacy Map (custom only)
```

### Target (After Migration) Architecture
```
Client Request
    ↓
Socket Handler (UNIFIED)
    ↓
Redis MatchManager (both ranked and custom)
    ↓
Redis Storage (persistent, scalable)
```

### Why Redis MatchManager is Better

| Feature | Legacy Map | Redis MatchManager |
|---------|-----------|-------------------|
| Persistence | ❌ Lost on restart | ✅ Survives restarts |
| Garbage Queue | ❌ Manual tracking | ✅ Built-in per-player queue |
| Disconnect Handling | ❌ Basic reconnect | ✅ State preservation, timeout |
| Game End Logic | ❌ None | ✅ Winner detection, stats |
| AFK Timeout | ❌ None | ✅ Automatic tracking |
| Board State Sync | ❌ Limited | ✅ Full player state |
| Scalability | ❌ Single server | ✅ Multi-server ready |

---

**Generated**: After completing room lifecycle handlers (create, join, ready, startGame, im_ready, leave, sync)
**Last Updated**: During custom room Redis migration effort
