# So sánh Logic Game: Ranked vs Custom Room

## Vấn đề báo cáo
"Đã vào được trận nhưng các logic trong trận đang sai, sửa lại cho giống logic của các trận được tạo ngẫu nhiên"

## Luồng khởi động game

### 1. RANKED MATCH (Ngẫu nhiên)
```
Client A emit: ranked:enter(accountId, elo)
Client A emit: ranked:match(accountId, elo)
  ↓
Server: matchmaking logic finds opponent
  ↓
Server emit: ranked:found({ roomId, opponent, elo })
  ↓
Server creates room with generator
Server emit: game:start({ next: [14 pieces], roomId, opponent })
  ↓
Client receives game:start
  - setQueueSeed(payload.next)  ← 14 pieces
  - setCountdown(3)
  - setWaiting(false)
  ↓
Countdown 3...2...1...
  ↓
startGame() → resetPlayer() → First piece spawns
  ↓
After 7 pieces: emit game:requestNext(roomId, 7)
```

### 2. CUSTOM ROOM (Từ lobby)
```
Client A: Tạo phòng → emit room:create(roomId, {name})
Server: matchManager.createMatch() + rooms.set()
  ↓
Client B: Join phòng → emit room:join(roomId, {name})
Server: matchManager.addPlayer() + r.players.set()
  ↓
Client B: Click "Sẵn sàng" → emit room:ready(roomId, true)
Server: matchManager.setPlayerReady(roomId, playerId, true)
  ↓
Client A (Host): Click "Bắt đầu" → emit room:startGame(roomId)
Server: Check ready → emit game:starting({ roomId })
  ↓
Both clients navigate to /versus/:roomId
  ↓
Both clients emit: game:im_ready(roomId)
  ↓
Server: Wait for ALL players
When all ready → emit game:start({ next: [14 pieces], roomId, opponent, seed })
  ↓
Client receives game:start
  - setQueueSeed(payload.next)  ← 14 pieces
  - setCountdown(3)
  - setWaiting(false)
  ↓
Countdown 3...2...1...
  ↓
startGame() → resetPlayer() → First piece spawns
  ↓
After 7 pieces: emit game:requestNext(roomId, 7)
```

## Điểm khác biệt đã phát hiện

### ✅ GIỐNG NHAU (Đã đúng)
1. ✅ Cả 2 đều nhận `game:start` với `next: [14 pieces]`
2. ✅ Cả 2 đều set `setQueueSeed(payload.next)`
3. ✅ Cả 2 đều có countdown 3 giây
4. ✅ Cả 2 đều emit `game:requestNext` sau mỗi 7 pieces

### ⚠️ KHÁC BIỆT (Cần kiểm tra)

#### A. Initial Pieces
**Ranked**: 
- Server send 14 pieces trong `game:start`
- Client nhận và set vào queue

**Custom Room**:
- Server send 14 pieces trong `game:start` (SAU KHI all players ready)
- Client có thể nhận 2 lần? (cần verify)

#### B. Opponent ID
**Ranked**:
- `opponent` được set trong `ranked:found`
- Confirm lại trong `game:start`

**Custom Room**:
- `opponent` chỉ set trong `game:start`
- Có thể chưa được set khi navigate? (cần verify)

#### C. WebRTC Setup
**Ranked**:
- Cả 2 socket IDs được so sánh: `isHost = socket.id < opponent`

**Custom Room**:
- Giống ranked (dùng opponent từ game:start)

## Vấn đề tiềm ẩn cần check

### 1. Double piece send?
**Nghi ngờ**: Client có nhận pieces 2 lần không?
```typescript
// useEffect emit game:im_ready
useEffect(() => {
  if (urlRoomId) {
    socket.emit('game:im_ready', urlRoomId);
  }
}, [urlRoomId]);

// Server response
io.to(playerId).emit('game:start', { next: first, ... });
```

**Cần verify**: 
- Check console log xem có nhận `game:start` nhiều lần không
- Check xem queue có đúng 14 pieces ban đầu không

### 2. Opponent ID timing
**Nghi ngờ**: OpponentId chưa được set khi WebRTC init?
```typescript
// WebRTC init dựa vào opponent
useEffect(() => {
  const handleGameStartForWebRTC = ({ opponent }: any) => {
    if (!opponent) return;  // ← Có thể undefined?
    const isHost = (socket.id || '') < opponent;
    initWebRTC(isHost);
  };
  socket.on('game:start', handleGameStartForWebRTC);
}, [initWebRTC, cleanupWebRTC]);
```

**Cần verify**:
- Check console log `[WebRTC] Game started, I am HOST/PEER`
- Check UDP connection status

### 3. Generator storage
**Ranked**: Không cần lưu generator (server không có ranked generator persistence)
**Custom Room**: Generator được lưu trong `matchGenerators` Map

**Cần verify**:
- Check server log: `[Room XXX] 💾 Stored generator for Redis match`
- Check `game:requestNext` có lấy đúng generator không

## Debug checklist

### Client Console (Browser)
```
[Client] Component mounted for room XXX. Emitting game:im_ready.
🎮 Game started, I am HOST/PEER
[WebRTC] Creating new RTCPeerConnection
✅ [WebRTC] UDP channel OPEN (host/peer)
```

### Server Console
```
[room:create] ✅ xxx created match yyy (max 2 players)
[room:join] ✅ xxx joined match yyy
[room:ready] ✅ Player xxx (playerId: yyy) ready=true in match zzz
[room:startGame] 🔍 Ready check: { ... allNonHostReady: true }
[room:startGame] ✅ Match xxx started by yyy
[Room xxx] Game is starting. Waiting for clients to be ready...
[Room xxx] Player yyy is ready. (1/2)
[Room xxx] Player zzz is ready. (2/2)
[Room xxx] ✅ All players are ready. Sending full game data.
[Room xxx] 💾 Stored generator for Redis match
[Room xxx] 🎮 Game started! Piece queue sent to all players.
[game:requestNext] ✅ Generated 7 pieces for Redis match xxx
```

## Các lỗi có thể gặp

### Lỗi 1: Pieces không spawn
**Triệu chứng**: Countdown xong nhưng không có mảnh rơi

**Nguyên nhân**:
- Queue trống (không nhận được pieces)
- `resetPlayer()` không gọi
- `setQueueSeed()` không hoạt động

**Debug**:
```javascript
console.log('[game:start] Received pieces:', payload?.next?.length);
console.log('[startGame] Queue after seed:', nextFour.length);
```

### Lỗi 2: Không thấy board đối thủ
**Triệu chứng**: Opponent board trống hoặc không update

**Nguyên nhân**:
- `game:state` không broadcast (đã fix)
- UDP không connect
- OpponentId sai

**Debug**:
```javascript
console.log('[game:state] Received from:', data?.from);
console.log('[UDP] Snapshot received');
```

### Lỗi 3: Pieces không giống nhau
**Triệu chứng**: 2 player thấy pieces khác nhau

**Nguyên nhân**:
- Seed khác nhau
- Generator không đồng bộ
- `game:requestNext` trả pieces khác

**Debug**:
```javascript
// Server
console.log(`[game:im_ready] Seed: ${match.seed}`);
console.log(`[game:requestNext] Generated pieces:`, pieces);

// Client
console.log('[game:start] Seed:', payload?.seed);
console.log('[game:next] Received pieces:', arr);
```

### Lỗi 4: Garbage không hoạt động
**Triệu chứng**: Gửi garbage nhưng đối thủ không nhận

**Nguyên nhân**:
- Redis atomic operations failed
- `game:incomingGarbage` không emit
- `game:applyGarbage` không nhận

**Debug**:
```javascript
// Client send
console.log('📤 Sending garbage:', garbageLines, 'lines');

// Server process
console.log('[game:attack] Processing attack...');

// Client receive
console.log('🔵 YOUR garbage bar updated:', data.lines);
console.log('💥 Applying garbage:', data.lines);
```

## Action items

1. ✅ **Đã fix**: Ready logic (host không cần ready)
2. ✅ **Đã fix**: Ping tracking
3. ✅ **Đã fix**: game:state Redis support
4. ⏳ **Cần test**: Custom room game flow
5. ⏳ **Cần verify**: Pieces generation consistency
6. ⏳ **Cần verify**: WebRTC UDP connection

## Testing protocol

### Test 1: Basic game flow
1. Player A tạo room
2. Player B join
3. Player B ready
4. Player A start
5. **Verify**: Cả 2 thấy countdown 3...2...1
6. **Verify**: Pieces spawn đúng lúc
7. **Verify**: Pieces giống nhau (cùng sequence)

### Test 2: Real-time sync
1. Trong game, Player A di chuyển pieces
2. **Verify**: Player B thấy board A update
3. Player B di chuyển pieces
4. **Verify**: Player A thấy board B update

### Test 3: Garbage system
1. Player A xóa 4 dòng (Tetris)
2. **Verify**: Player B thấy garbage bar tăng
3. **Verify**: Player B nhận garbage rows (sau 500ms)
4. Player B xóa dòng counter-attack
5. **Verify**: Garbage cancelled

### Test 4: Game end
1. Player A topout (chết)
2. **Verify**: Player B thấy "Bạn thắng!"
3. **Verify**: Player A thấy "Bạn thua!"

## Status
🟡 **NEEDS TESTING** - Logic looks correct in code, needs real 2-player test to verify.

Bạn hãy test và cho tôi biết:
1. Console logs từ server
2. Console logs từ client (F12)
3. Lỗi cụ thể gặp phải (pieces không spawn? board không sync? etc.)
