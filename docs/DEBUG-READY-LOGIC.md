# Debug: Ready Logic Issue

## Vấn đề
Khi tất cả non-host players đã sẵn sàng, host bấm "Bắt đầu trận đấu" vẫn báo "Chưa đủ người sẵn sàng".

## Luồng hoạt động dự kiến

### 1. Tạo room (Host)
```
Client → Server: room:create(roomId, {name: "HostName"})
Server: 
  - matchManager.createMatch({ hostPlayerId: socket.id, hostSocketId: socket.id })
  - rooms.set(roomId, { host: socket.id, players: Map(...) })
  - emit room:update
```

### 2. Join room (Player 2)
```
Client → Server: room:join(roomId, {name: "Player2"})
Server:
  - matchManager.addPlayer(roomId, { playerId: socket.id, socketId: socket.id })
  - rooms.players.set(socket.id, { id: socket.id, ready: false })
  - emit room:update
```

### 3. Ready up (Player 2)
```
Client → Server: room:ready(roomId, true)
Server:
  - findPlayerInMatch(match, socket.id) → returns player
  - matchManager.setPlayerReady(roomId, player.playerId, true)
  - player.ready = true
  - emit room:update
```

### 4. Start game (Host)
```
Client → Server: room:startGame(roomId)
Server check:
  1. match exists? ✅
  2. Is host? (player.playerId === match.hostPlayerId) ✅
  3. Players >= 2? ✅
  4. Non-host players ready?
     - nonHostPlayers = match.players.filter(p => p.playerId !== match.hostPlayerId)
     - allNonHostReady = nonHostPlayers.every(p => p.ready)
     - If false → return error "Chưa đủ người sẵn sàng" ❌
```

## Điểm cần debug

### A. Kiểm tra playerId vs socketId
```typescript
// Khi tạo match
hostPlayerId: socket.id  // ✅ Đúng
hostSocketId: socket.id  // ✅ Đúng

// Khi join
playerId: socket.id      // ✅ Đúng
socketId: socket.id      // ✅ Đúng
```

### B. Kiểm tra ready được set đúng
```typescript
// room:ready handler
const player = findPlayerInMatch(match, socket.id);  // Tìm bằng socketId
if (player) {
  await matchManager.setPlayerReady(roomId, player.playerId, ready);  // Set bằng playerId
}
```

### C. Kiểm tra filter non-host
```typescript
// room:startGame handler
const nonHostPlayers = match.players.filter(p => p.playerId !== match.hostPlayerId);
// ⚠️ Có thể host có playerId khác socket.id không?
```

## Debug logs đã thêm

### 1. room:ready
```typescript
console.log(`[room:ready] ✅ Player ${socket.id.slice(0, 8)} (playerId: ${player.playerId.slice(0, 8)}) ready=${ready} in match ${roomId.slice(0, 8)}`);
```

### 2. room:startGame
```typescript
console.log(`[room:startGame] 🔍 Ready check:`, {
  matchId: roomId.slice(0, 8),
  hostPlayerId: match.hostPlayerId.slice(0, 8),
  totalPlayers: match.players.length,
  nonHostPlayersCount: nonHostPlayers.length,
  allNonHostReady,
  players: match.players.map(p => ({ 
    playerId: p.playerId.slice(0, 8),
    socketId: p.socketId?.slice(0, 8) || 'N/A',
    isHost: p.playerId === match.hostPlayerId, 
    ready: p.ready 
  }))
});
```

## Testing steps

1. **Khởi động server**:
   ```bash
   cd server
   npm run dev
   ```

2. **Tạo room** (Player 1 - Host):
   - Vào /online → "Tạo phòng"
   - Nhập tên phòng
   - Kiểm tra console server:
     ```
     [room:create] ✅ xxx created match yyy (max 2 players)
     ```

3. **Join room** (Player 2):
   - Vào /online → Nhập room ID → Join
   - Kiểm tra console server:
     ```
     [room:join] ✅ xxx joined match yyy
     ```

4. **Ready up** (Player 2):
   - Click nút "Sẵn sàng"
   - Kiểm tra console server:
     ```
     [room:ready] ✅ Player xxx (playerId: yyy) ready=true in match zzz
     ```
   - Kiểm tra UI: Button chuyển sang "✓ Đã sẵn sàng" màu xanh

5. **Start game** (Host):
   - Click "Bắt đầu trận đấu"
   - Kiểm tra console server:
     ```
     [room:startGame] 🔍 Ready check: {
       matchId: "xxx",
       hostPlayerId: "yyy",
       totalPlayers: 2,
       nonHostPlayersCount: 1,
       allNonHostReady: true/false,  ← QUAN TRỌNG
       players: [
         { playerId: "yyy", socketId: "yyy", isHost: true, ready: false },
         { playerId: "zzz", socketId: "zzz", isHost: false, ready: true/false }  ← KIỂM TRA GIÁ TRỊ NÀY
       ]
     }
     ```

## Possible issues

### Issue 1: Player ready không được lưu vào Redis
**Triệu chứng**: `ready: false` trong log dù đã click "Sẵn sàng"

**Nguyên nhân**: 
- `findPlayerInMatch` không tìm thấy player
- `matchManager.setPlayerReady` failed

**Fix**: Kiểm tra `findPlayerInMatch` logic và Redis connection

### Issue 2: Host cũng cần ready
**Triệu chứng**: `allNonHostReady: false` vì host có `ready: false`

**Nguyên nhân**: 
- Filter không loại bỏ host đúng cách
- `p.playerId !== match.hostPlayerId` không match

**Fix**: ✅ Đã sửa - filter bằng `playerId`

### Issue 3: socketId vs playerId mismatch
**Triệu chứng**: `player.playerId` khác `socket.id`

**Nguyên nhân**:
- Khi tạo/join, có thể dùng accountId thay vì socket.id

**Fix**: Đảm bảo `playerId: socket.id` khi create/join

## Expected console output (Success)

```
[room:create] ✅ abc123xx created match room-xxx (max 2 players)
[room:join] ✅ def456yy joined match room-xxx
[room:ready] ✅ Player def456yy (playerId: def456yy) ready=true in match room-xxx
[room:startGame] 🔍 Ready check: {
  matchId: "room-xxx",
  hostPlayerId: "abc123xx",
  totalPlayers: 2,
  nonHostPlayersCount: 1,
  allNonHostReady: true,  ✅
  players: [
    { playerId: "abc123xx", socketId: "abc123xx", isHost: true, ready: false },
    { playerId: "def456yy", socketId: "def456yy", isHost: false, ready: true }  ✅
  ]
}
[room:startGame] ✅ Match room-xxx started by abc123xx
[Room room-xxx] Game is starting. Waiting for clients to be ready...
```

## Next steps
1. ✅ Added debug logs
2. ⏳ Test with 2 players
3. ⏳ Check console output
4. ⏳ Identify exact failure point
5. ⏳ Apply fix based on findings

## Status
🟡 **DEBUGGING** - Logs added, waiting for test results.
