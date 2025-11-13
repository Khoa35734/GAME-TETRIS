# Ping Tracking & Ready Logic Fix

## Vấn đề đã sửa

### 1. ❌ Lỗi logic sẵn sàng: Chủ phòng không thể bắt đầu game
**Triệu chứng**: Khi tất cả người chơi non-host đã sẵn sàng, chủ phòng bấm "Bắt đầu trận đấu" vẫn báo "Chưa đủ người sẵn sàng"

**Nguyên nhân**: 
- Server kiểm tra `match.players.every(p => p.ready)` → yêu cầu TẤT CẢ players (bao gồm host) phải ready
- Nhưng logic thiết kế: Host không cần ready, chỉ non-host players cần ready

**Giải pháp**:
```typescript
// BEFORE ❌
const allReady = match.players.every(p => p.ready);
if (!allReady) {
  cb?.({ ok: false, error: 'Chưa đủ người sẵn sàng' });
  return;
}

// AFTER ✅
const nonHostPlayers = match.players.filter(p => p.playerId !== match.hostPlayerId);
const allNonHostReady = nonHostPlayers.every(p => p.ready);
if (!allNonHostReady) {
  console.log(`[room:startGame] Not all non-host players ready:`, 
    match.players.map(p => ({ 
      id: p.playerId.slice(0, 8), 
      isHost: p.playerId === match.hostPlayerId, 
      ready: p.ready 
    }))
  );
  cb?.({ ok: false, error: 'Chưa đủ người sẵn sàng' });
  return;
}
```

### 2. ✅ Thêm hệ thống ping tracking

**Mục đích**: Hiển thị độ trễ mạng cho mỗi người chơi để theo dõi chất lượng kết nối

## Cài đặt Ping Tracking

### Server (server/src/index.ts)

#### 1. Thêm Map lưu ping
```typescript
// Key: socketId, Value: { ping: number, lastUpdate: number }
const playerPings = new Map<string, { ping: number; lastUpdate: number }>();
```

#### 2. Handlers cho ping
```typescript
// Ping/Pong for connectivity and latency tracking
socket.on('ping', (timestamp?: number) => {
  socket.emit('pong', timestamp);
});

// Client reports their measured ping
socket.on('client:ping', (ping: number) => {
  playerPings.set(socket.id, { ping, lastUpdate: Date.now() });
});
```

#### 3. Thêm ping vào room snapshots
```typescript
// roomSnapshot function
players: [...r.players.values()].map(p => {
  const pingData = playerPings.get(p.id);
  return {
    id: p.id,
    ready: p.ready,
    alive: p.alive,
    name: p.name ?? null,
    ping: pingData?.ping ?? null  // ✅ Added
  };
})

// matchToRoomSnapshot function
players: match.players.map(p => {
  const pingData = playerPings.get(p.socketId || p.playerId);
  return {
    id: p.playerId,
    ready: p.ready,
    alive: p.alive,
    name: p.accountId || null,
    combo: p.combo || 0,
    b2b: p.b2b || 0,
    pendingGarbage: p.pendingGarbage || 0,
    ping: pingData?.ping ?? null  // ✅ Added
  };
})
```

#### 4. Cleanup ping khi disconnect
```typescript
socket.on('disconnect', async () => {
  // ... other cleanup
  playerPings.delete(socket.id);
});
```

### Client - RoomLobby (client/src/components/RoomLobby.tsx)

#### 1. Thêm type cho ping
```typescript
type Player = {
  id: string;
  name: string | null;
  ready: boolean;
  alive: boolean;
  ping?: number | null;  // ✅ Added
};
```

#### 2. Thêm state & tracking
```typescript
const [myPing, setMyPing] = useState<number | null>(null);
const pingIntervalRef = useRef<number | null>(null);

// Ping tracking useEffect
useEffect(() => {
  // Measure ping every 2 seconds
  pingIntervalRef.current = window.setInterval(() => {
    const timestamp = Date.now();
    socket.emit('ping', timestamp);
  }, 2000);

  const onPong = (timestamp?: number) => {
    if (timestamp) {
      const ping = Date.now() - timestamp;
      setMyPing(ping);
      // Send ping to server so it can broadcast to others
      socket.emit('client:ping', ping);
    }
  };
  socket.on('pong', onPong);

  return () => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    socket.off('pong', onPong);
  };
}, []);
```

#### 3. Hiển thị ping trong UI
```tsx
{/* Hiển thị ping từ server cho người chơi khác */}
{typeof p.ping === 'number' && (
  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
    📶 Ping: {p.ping}ms
  </div>
)}

{/* Hiển thị ping của bản thân */}
{isMe && typeof myPing === 'number' && (
  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
    📶 Ping: {myPing}ms
  </div>
)}
```

### Client - Versus (client/src/components/Versus.tsx)

#### 1. Thêm state
```typescript
const [myPing, setMyPing] = useState<number | null>(null);
const [oppPing, setOppPing] = useState<number | null>(null);
const pingIntervalRef = useRef<number | null>(null);
```

#### 2. Ping tracking useEffect
```typescript
// Measure own ping
useEffect(() => {
  pingIntervalRef.current = window.setInterval(() => {
    const timestamp = Date.now();
    socket.emit('ping', timestamp);
  }, 2000);

  const onPong = (timestamp?: number) => {
    if (timestamp) {
      const ping = Date.now() - timestamp;
      setMyPing(ping);
      socket.emit('client:ping', ping);
    }
  };
  socket.on('pong', onPong);

  return () => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    socket.off('pong', onPong);
  };
}, []);

// Update opponent ping from room updates
useEffect(() => {
  const onRoomUpdate = (snapshot: any) => {
    if (snapshot && snapshot.players) {
      const opp = snapshot.players.find((p: any) => p.id !== meId && p.id !== socket.id);
      if (opp && typeof opp.ping === 'number') {
        setOppPing(opp.ping);
      }
    }
  };
  socket.on('room:update', onRoomUpdate);

  return () => {
    socket.off('room:update', onRoomUpdate);
  };
}, [meId]);
```

#### 3. Hiển thị ping trong game
```tsx
{/* MY STATUS */}
<div style={{ fontWeight: 700, marginBottom: 6 }}>STATUS</div>
<div>Rows: {rows}</div>
<div>Level: {level}</div>
<div>Time: {(elapsedMs/1000).toFixed(2)}s</div>
<div>Combo: {combo}</div>
<div>B2B: {b2b}</div>
{typeof myPing === 'number' && (
  <div style={{ color: myPing < 50 ? '#4ecdc4' : myPing < 100 ? '#ffb800' : '#ff6b6b' }}>
    📶 Ping: {myPing}ms
  </div>
)}

{/* OPPONENT STATUS */}
<div style={{ fontWeight: 700, marginBottom: 6 }}>OPP STATUS</div>
<div>GameOver: {oppGameOver ? 'YES' : 'NO'}</div>
<div>Hold: {oppHold ? oppHold.shape || 'None' : 'None'}</div>
{typeof oppPing === 'number' && (
  <div style={{ color: oppPing < 50 ? '#4ecdc4' : oppPing < 100 ? '#ffb800' : '#ff6b6b' }}>
    📶 Ping: {oppPing}ms
  </div>
)}
```

## Ping Color Coding

- 🟢 **< 50ms**: Màu xanh (`#4ecdc4`) - Kết nối xuất sắc
- 🟡 **50-100ms**: Màu vàng (`#ffb800`) - Kết nối tốt
- 🔴 **> 100ms**: Màu đỏ (`#ff6b6b`) - Kết nối chậm

## Luồng hoạt động

### Ping Measurement
```
Client → Server: ping(timestamp)
Server → Client: pong(timestamp)
Client: Calculate ping = Date.now() - timestamp
Client → Server: client:ping(ping)
Server: Store in playerPings Map
Server → All clients: room:update (includes ping data)
```

### Game Start Flow (Fixed)
```
1. Players join room
2. Non-host players click "Sẵn sàng" → emit room:ready(true)
3. Server updates player.ready = true
4. Host sees "Bắt đầu trận đấu" button enabled (canStart = true)
5. Host clicks "Bắt đầu" → emit room:startGame
6. Server checks:
   - playersCount >= 2 ✅
   - nonHostPlayers.every(p => p.ready) ✅  (Host không cần ready)
7. Server: matchManager.startMatch() → emit game:starting
8. Clients navigate to /versus
```

## Testing Checklist

### Ping Display
- [ ] Ping hiển thị trong RoomLobby cho mỗi người chơi
- [ ] Ping cập nhật mỗi 2 giây
- [ ] Ping có màu sắc phù hợp (xanh/vàng/đỏ)
- [ ] Ping hiển thị trong Versus cho cả 2 người chơi
- [ ] Ping của opponent cập nhật qua room:update events

### Ready Logic
- [ ] Non-host player click "Sẵn sàng" → button chuyển sang "✓ Đã sẵn sàng"
- [ ] Host không có button "Sẵn sàng" (host không cần ready)
- [ ] Khi tất cả non-host ready → Host button "Bắt đầu" sáng lên
- [ ] Host click "Bắt đầu" → Game start thành công
- [ ] Không còn báo lỗi "Chưa đủ người sẵn sàng"

### Memory Management
- [ ] Ping data được cleanup khi player disconnect
- [ ] Ping interval được clearInterval khi component unmount
- [ ] Không có memory leak

## Files Modified

1. **server/src/index.ts**
   - Added `playerPings` Map
   - Updated ping handlers
   - Updated roomSnapshot() to include ping
   - Updated matchToRoomSnapshot() to include ping
   - Fixed ready check logic in room:startGame
   - Added ping cleanup in disconnect handler

2. **client/src/components/RoomLobby.tsx**
   - Added ping to Player type
   - Added myPing state & pingIntervalRef
   - Added ping tracking useEffect
   - Added ping display in player list

3. **client/src/components/Versus.tsx**
   - Added myPing & oppPing states
   - Added ping tracking useEffect (own + opponent)
   - Added ping display in STATUS panels
   - Added cleanup for ping interval

## Next Steps

- ✅ Ping tracking hoạt động
- ✅ Ready logic fixed
- ⏳ Test với 2 người chơi thực tế
- ⏳ Monitor ping stability
- ⏳ Consider adding ping warning khi > 200ms

## Status
🟢 **COMPLETED** - All fixes implemented, ready for testing.
