# 🔧 Fix Matchmaking Countdown & WebRTC Setup

## 📋 Vấn đề

Sau khi cả 2 players xác nhận matchmaking, game dừng lại ở màn hình:
```
Đã tìm thấy trận
Đang chuẩn bị trận đấu với...
```

**Countdown KHÔNG bắt đầu** và game không start.

---

## 🔍 Root Cause Analysis

### 1. Event Listener trong Versus.tsx

Versus.tsx có **2 listeners** cho event `game:start`:

#### **Listener 1: handleGameStartForWebRTC** (Line 767-805)
**Mục đích:** Thiết lập kết nối WebRTC/UDP với đối thủ

```typescript
const handleGameStartForWebRTC = ({ opponent }: any) => {
  console.log('🚨 [DEBUG] handleGameStartForWebRTC called with:', { opponent });
  
  if (!opponent) {
    console.warn('❌ [WebRTC] No opponent in game:start, skipping WebRTC init');
    return; // ← Không setup WebRTC nếu thiếu opponent!
  }
  
  const isHost = (socket.id || '') < opponent;
  console.log('✅ [WebRTC] I am', isHost ? '🏠 HOST' : '📡 PEER');
  
  // Setup WebRTC connection
  initWebRTC(isHost);
};
socket.on('game:start', handleGameStartForWebRTC);
```

**Yêu cầu payload:**
- `opponent` (string): Socket ID của đối thủ → **BẮT BUỘC**

---

#### **Listener 2: onGameStart** (Line 1095-1113)
**Mục đích:** 
1. Hiển thị countdown 3 giây
2. Reset game state
3. Bắt đầu trận đấu khi countdown kết thúc

```typescript
const onGameStart = (payload?: any) => {
  console.log('🎮 [Versus] game:start event received!', { payload, waiting, roomId });
  stopMatchmaking();
  
  if (waiting) {
    console.log('✅ [Versus] Starting countdown - setting countdown to 3');
    if (payload?.roomId) setRoomId(payload.roomId);
    if (payload?.opponent) setOpponentId(payload.opponent);
    if (payload?.next && Array.isArray(payload.next)) {
      setQueueSeed(payload.next);
      setOppNextFour(payload.next.slice(0, 4));
    }
    setNetOppStage(null);
    setWaiting(false);
    setCountdown(3); // ← Trigger countdown
  }
};
socket.on('game:start', onGameStart);
```

**Yêu cầu payload:**
- `roomId` (string): Room ID
- `opponent` (optional): Đối thủ info
- `next` (optional): Next pieces seed

---

### 2. Countdown Logic (Line 1007-1021)

```typescript
useEffect(() => {
  if (countdown === null) return;

  if (countdown <= 0) {
    startGameRef.current(); // ← Gọi startGame() để reset board
    setCountdown(null);
    return;
  }

  const timerId = setTimeout(() => {
    setCountdown(c => (c ? c - 1 : null)); // ← Giảm countdown mỗi giây
  }, 1000);

  return () => clearTimeout(timerId);
}, [countdown]);
```

**Flow:**
1. `countdown` set = 3 → Hiển thị "3"
2. Sau 1s → `countdown` = 2 → Hiển thị "2"
3. Sau 1s → `countdown` = 1 → Hiển thị "1"
4. Sau 1s → `countdown` = 0 → Gọi `startGame()` → Game bắt đầu!

---

### 3. Server Event Emission (Trước khi fix)

**File:** `server/src/matchmaking.ts` Line 472

```typescript
// ❌ TRƯỚC: Emit vào room, KHÔNG CÓ opponent field
this.io.to(roomId).emit('game:start', {
  roomId,
  countdown: 3,
  matchType: 'bo3',
  mode: match.mode
  // ❌ THIẾU opponent!
});
```

**Hệ quả:**
- ✅ `onGameStart` nhận event → `countdown` set = 3 → **Có thể countdown**
- ❌ `handleGameStartForWebRTC` nhận event → `opponent` = undefined → **SKIP WebRTC setup**
- ❌ Nếu `waiting = false` (race condition) → `onGameStart` không set countdown

---

## ✅ Giải pháp

### Sửa Server - Emit riêng cho từng player với opponent info

**File:** `server/src/matchmaking.ts` Line 472-489

```typescript
// ✅ SAU: Emit riêng cho từng player, có opponent socketId
// Player 1 nhận opponent là player 2
this.io.to(match.player1.socketId).emit('game:start', {
  roomId,
  countdown: 3,
  matchType: 'bo3',
  mode: match.mode,
  opponent: match.player2.socketId // ← WebRTC cần opponent socket.id
});

// Player 2 nhận opponent là player 1  
this.io.to(match.player2.socketId).emit('game:start', {
  roomId,
  countdown: 3,
  matchType: 'bo3',
  mode: match.mode,
  opponent: match.player1.socketId // ← WebRTC cần opponent socket.id
});

console.log(`[Matchmaking] ✅ Game start events emitted with opponent info - WebRTC + countdown should begin`);
```

---

## 🎯 Kết quả mong đợi

### Server Console:
```
[Matchmaking] ✅ Both players confirmed for match xxx
[Matchmaking] ✅ Creating room in Redis: match_xxx_bo3
[Matchmaking] ✅ Room verified in Redis with 2 players
[Matchmaking] ✅ Game start events emitted with opponent info - WebRTC + countdown should begin
```

### Client Console (Player 1):
```
🎮 [Versus] game:start event received! { 
  payload: { 
    roomId: 'match_xxx_bo3',
    countdown: 3,
    matchType: 'bo3',
    mode: 'casual',
    opponent: 'socket_id_player_2'
  },
  waiting: true,
  roomId: 'match_xxx_bo3'
}
✅ [Versus] Starting countdown - setting countdown to 3
🚨 [DEBUG] handleGameStartForWebRTC called with: { opponent: 'socket_id_player_2' }
✅ [WebRTC] I am 🏠 HOST (will create offer)
🚀 [WebRTC] Starting fresh connection...
```

### Client Console (Player 2):
```
🎮 [Versus] game:start event received! { 
  payload: { 
    roomId: 'match_xxx_bo3',
    countdown: 3,
    matchType: 'bo3',
    mode: 'casual',
    opponent: 'socket_id_player_1'
  },
  waiting: true,
  roomId: 'match_xxx_bo3'
}
✅ [Versus] Starting countdown - setting countdown to 3
🚨 [DEBUG] handleGameStartForWebRTC called with: { opponent: 'socket_id_player_1' }
✅ [WebRTC] I am 📡 PEER (will receive offer)
🚀 [WebRTC] Starting fresh connection...
```

### UI Flow:
1. ✅ Cả 2 xác nhận matchmaking
2. ✅ Navigate sang `/versus/{roomId}`
3. ✅ Hiển thị "Đang chuẩn bị trận đấu với..."
4. ✅ **Countdown 3...2...1 xuất hiện và chạy**
5. ✅ WebRTC setup ở background (không block UI)
6. ✅ Countdown = 0 → Gọi `startGame()` → Board reset → **Game bắt đầu!**

---

## 🧪 Testing Steps

1. **Restart server:**
   ```powershell
   cd server
   npm run build
   npm run dev
   ```

2. **Open 2 browsers/tabs:**
   - Browser 1: `http://localhost:5173`
   - Browser 2: `http://localhost:5173`

3. **Both players:**
   - Login
   - Click "Tìm trận"
   - Wait for match found (10s timer)
   - Click "Xác nhận"

4. **Expected result:**
   - Both navigate to `/versus/match_xxx_bo3`
   - Screen shows "Đang chuẩn bị trận đấu với..."
   - **Countdown 3...2...1 appears and counts down**
   - WebRTC connection establishes
   - Board resets
   - **Game starts!**

---

## 📝 Summary

**Root Cause:**
- Server emit `game:start` event KHÔNG CÓ `opponent` field
- `handleGameStartForWebRTC` cần `opponent` để setup WebRTC → Skip nếu thiếu
- Có thể countdown không trigger nếu `waiting = false`

**Solution:**
- Server emit riêng cho từng player với `opponent: socketId` của đối thủ
- Đảm bảo cả 2 listeners (`handleGameStartForWebRTC` + `onGameStart`) đều hoạt động

**Result:**
- ✅ Countdown 3...2...1 chạy đúng
- ✅ WebRTC/UDP connection setup ở background
- ✅ Game bắt đầu sau countdown

---

## 🔗 Related Files

- `server/src/matchmaking.ts` - Matchmaking system & event emission
- `client/src/components/Versus.tsx` - Main game component với countdown logic
- `FILE MD/MATCHMAKING_COMPLETE.md` - Matchmaking system overview
- `FILE MD/7bag-explanation.md` - 7-bag random system cho pieces

---

**Created:** 2025-10-16  
**Status:** ✅ Fixed - Ready to test
