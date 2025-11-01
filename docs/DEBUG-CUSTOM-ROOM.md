# 🔍 DEBUG GUIDE - Custom Room Issues

## 📋 **Tổng Quan**

Guide này giúp debug 2 vấn đề chính:
1. ❌ **Board đối phương không hiển thị**
2. ❌ **Game không kết thúc** (topout không work)

---

## 🛠️ **Setup Debug Environment**

### 1. **Khởi động Redis + Server**

```powershell
# Terminal 1: Redis
redis-server

# Terminal 2: Server
cd server
npm run dev
```

### 2. **Khởi động Client**

```powershell
# Terminal 3: Client
cd client
npm run dev
```

### 3. **Mở 2 Browsers với Console**

- Browser 1: `http://localhost:5173` → F12 (Console tab)
- Browser 2: `http://localhost:5173` → F12 (Console tab)

---

## 🔍 **Debug Issue #1: Board Không Hiển Thị**

### **Checklist Debug Steps:**

#### ✅ **Step 1: Kiểm tra Room Connection**

**Browser 1 & 2 Console:**
```javascript
// Sau khi join room, bạn phải thấy:
[Versus] Joined from lobby, roomId: XXXXXXXX
```

✅ **PASS:** Cả 2 browsers thấy cùng roomId  
❌ **FAIL:** RoomId khác nhau hoặc không có → Bug ở RoomLobby.tsx

---

#### ✅ **Step 2: Kiểm tra Game Start**

**Browser 1 & 2 Console:**
```javascript
// Sau khi host click Start Game:
🎮 Starting game with 14 pieces

// Sau countdown 3-2-1:
[game:start] Event received: { ... }
```

✅ **PASS:** Cả 2 browsers nhận được `game:start`  
❌ **FAIL:** Một browser không nhận → Bug ở server `game:im_ready` handler

---

#### ✅ **Step 3: Kiểm tra Board Sync (UDP)**

**Browser 1 Console (khi di chuyển miếng):**
```javascript
// Nếu WebRTC hoạt động:
⚡ Skipping TCP sync - UDP active

// Nếu WebRTC chưa ready:
📤 [game:state] Sending board via TCP: { roomId: 'XXX', hasMatrix: true }
```

**Browser 2 Console (nhận board):**
```javascript
// Nếu UDP hoạt động:
⚡ [UDP] Snapshot received: { hasMatrix: true, hasHold: true, ... }
⚡ [UDP] Updated opponent board from snapshot

// Nếu TCP:
🔵 [game:state] Event received: { hasMatrix: true, from: '...', waiting: false }
📥 Received opponent board - Garbage rows: 0
```

**Phân tích:**

1. **✅ UDP Working (Best case):**
   - Browser 1: `⚡ Skipping TCP sync - UDP active`
   - Browser 2: `⚡ [UDP] Snapshot received`
   - **Board sync mỗi 500ms qua DataChannel**

2. **⚠️ TCP Fallback (OK case):**
   - Browser 1: `📤 [game:state] Sending board via TCP`
   - Browser 2: `🔵 [game:state] Event received`
   - **Board sync qua Socket.IO**

3. **❌ No Sync (Bug!):**
   - Browser 1: Không có log `📤` hoặc `⚡`
   - Browser 2: Không nhận được gì
   - **→ Cả UDP và TCP đều fail**

---

#### ✅ **Step 4: Kiểm tra Server Relay**

**Server Terminal:**
```javascript
// Phải thấy server relay board state:
[game:state] Broadcasted state from <socket1> to room XXXXXXXX
```

✅ **PASS:** Server log xuất hiện mỗi khi client gửi board  
❌ **FAIL:** Không có log → Bug ở server `game:state` handler

---

### **Troubleshooting Board Sync:**

| Triệu chứng | Nguyên nhân | Giải pháp |
|------------|-------------|-----------|
| Browser 1 không gửi board | `roomId = null` hoặc `waiting = true` | Check `game:start` event |
| Browser 2 không nhận board | Server không relay | Check server logs |
| UDP không hoạt động | WebRTC connection failed | Check `[WebRTC]` logs |
| TCP không hoạt động | `game:state` handler bug | Check server code |

---

## 🔍 **Debug Issue #2: Game Không Kết Thúc**

### **Checklist Debug Steps:**

#### ✅ **Step 1: Kiểm tra Topout Detection**

**Khi board tràn:**

**Browser Console (player thua):**
```javascript
💀 Board overflow detected! Sending topout...
📤 Sending game:topout (board overflow) to room: XXXXXXXX
```

✅ **PASS:** Thấy logs  
❌ **FAIL:** Không thấy logs → Bug ở `isGameOverFromBuffer()` function

---

#### ✅ **Step 2: Kiểm tra Server Nhận Topout**

**Server Terminal:**
```javascript
[game:topout] Player <playerId> topped out in match XXXXXXXX. Reason: topout
[game:topout] Match XXXXXXXX ended. Alive players: 1
[MatchManager] 🏁 Match XXXXXXXX ended. Winner: <playerId>
[game:topout] ✅ Match XXXXXXXX reset for rematch
```

✅ **PASS:** Server xử lý topout  
❌ **FAIL:** Không thấy logs → **BUG Ở ĐÂY!** (Server không nhận event)

---

#### ✅ **Step 3: Kiểm tra Game Over Event**

**Browser Console (cả 2 players):**

**Winner:**
```javascript
🏁 GAME OVER EVENT: { winner: '<socketId>', reason: undefined }
✅ YOU WIN! Reason: undefined
```

**Loser:**
```javascript
🏁 GAME OVER EVENT: { winner: '<socketId>', reason: undefined }
❌ YOU LOSE! Reason: undefined
```

✅ **PASS:** Cả 2 browsers nhận được `game:over`  
❌ **FAIL:** Không nhận event → Server không emit `game:over`

---

### **Troubleshooting Topout:**

| Triệu chứng | Nguyên nhân | Giải pháp |
|------------|-------------|-----------|
| Client không gửi topout | `roomId = null` | Check game initialization |
| Server không nhận topout | Redis match không tồn tại | Check `matchManager.getMatch()` |
| Server không emit game:over | Logic bug trong handler | Check `game:topout` code |
| Client không hiển thị game over | Event listener chưa đăng ký | Check `socket.on('game:over')` |

---

## 🧪 **Test Scenarios**

### **Test Case 1: Normal Topout**

1. Tạo custom room với 2 players
2. Player 1: Để miếng xếp lên đến tràn board (line 20+)
3. **Expected:**
   - Player 1 console: `💀 Board overflow detected!`
   - Server: `[game:topout] Player X topped out`
   - Player 2 console: `✅ YOU WIN!`
   - Player 1 console: `❌ YOU LOSE!`

---

### **Test Case 2: Manual Exit**

1. Trong trận, player 1 click nút "← Thoát"
2. **Expected:**
   - Player 1 console: `🚪 Exit button clicked: { roomId: 'XXX', matchResult: null }`
   - Player 1 console: `📤 Sending game:topout (manual exit)`
   - Server: `[game:topout] Player X topped out`
   - Player 2: Thấy disconnect countdown hoặc win

---

### **Test Case 3: AFK Timeout**

1. Không chạm keyboard trong 60 giây
2. **Expected:**
   - Console: `⏰ AFK timeout - sending topout`
   - Server: `[game:topout] Player X topped out. Reason: afk`
   - Opponent: `🏁 GAME OVER EVENT: { reason: 'Đối thủ đã AFK' }`

---

## 🐛 **Known Issues & Fixes**

### **Issue #1: Server Handler Chỉ Hỗ Trợ Legacy**

**Triệu chứng:**
- Ranked matches kết thúc bình thường
- Custom rooms KHÔNG BAO GIỜ kết thúc

**Nguyên nhân:**
```typescript
// OLD CODE (BUG)
socket.on('game:topout', (roomId: string, reason?: string) => {
  const r = rooms.get(roomId);  // ❌ Chỉ check legacy Map
  if (!r) return;  // ❌ Redis matches bị bỏ qua
  // ...
});
```

**Đã sửa:**
```typescript
// NEW CODE (FIXED)
socket.on('game:topout', async (roomId: string, reason?: string) => {
  const match = await matchManager.getMatch(roomId);  // ✅ Check Redis
  const r = rooms.get(roomId);  // ✅ Check legacy
  
  if (!match && !r) return;
  
  if (match) {
    // ✅ Redis logic
    player.alive = false;
    await matchManager.endMatch(roomId, winnerId);
    // ...
  }
  
  if (r) {
    // ✅ Legacy logic
    // ...
  }
});
```

---

### **Issue #2: Board State Không Sync**

**Có thể nguyên nhân:**

1. **WebRTC không connected:**
   - Check console: `[WebRTC] RTCDataChannel opened`
   - Nếu không thấy → ICE negotiation failed
   - Solution: Check STUN servers, firewall

2. **TCP fallback không work:**
   - Check: `isRtcReady` state
   - Nếu `true` nhưng UDP không work → DataChannel bug
   - Nếu `false` mà TCP cũng không work → Server relay bug

3. **Event listener chưa setup:**
   - Check: `socket.on('game:state', onGameState)` được gọi chưa
   - Check: `waiting` state = false chưa

---

## 📊 **Debug Checklist Summary**

### **Board Sync:**
- [ ] Cả 2 players có cùng roomId?
- [ ] Cả 2 players nhận được `game:start`?
- [ ] Browser 1 gửi board? (`📤` logs)
- [ ] Server relay board? (server logs)
- [ ] Browser 2 nhận board? (`🔵` or `⚡` logs)
- [ ] `oppStage` state được update?

### **Topout:**
- [ ] Client detect board overflow? (`💀` log)
- [ ] Client emit `game:topout`? (`📤` log)
- [ ] Server nhận topout? (server log)
- [ ] Server xử lý Redis match?
- [ ] Server emit `game:over`?
- [ ] Client nhận `game:over`? (`🏁` log)
- [ ] UI hiển thị game over screen?

---

## 🚀 **Quick Test Commands**

### **Check Redis Match Exists:**
```bash
redis-cli KEYS "match:*"
redis-cli GET "match:4UT9BAM5"
```

### **Check Active Matches:**
```bash
redis-cli SMEMBERS "matches:active"
```

### **Check Garbage Queues:**
```bash
redis-cli KEYS "garbage:*"
```

### **Monitor All Redis Operations:**
```bash
redis-cli MONITOR
```

---

## 📝 **Reporting Bugs**

Khi báo bug, cung cấp:

1. **Client Console Logs** (cả 2 browsers)
   - Copy toàn bộ output từ khi join room
   - Highlight các logs liên quan (🔵, ⚡, 💀, 🏁)

2. **Server Terminal Logs**
   - Copy logs từ khi room được tạo
   - Highlight logs: `[game:topout]`, `[game:state]`, `[MatchManager]`

3. **Redis Data**
   ```bash
   redis-cli GET "match:XXXXXXXX"
   redis-cli KEYS "garbage:*"
   ```

4. **Steps to Reproduce**
   - Mô tả chi tiết từng bước
   - Screenshot/video nếu có thể

---

## ✅ **Files Changed (Latest Fix)**

### **Server:**
- ✅ `server/src/index.ts` - Added Redis support to `game:topout`
- ✅ Import `redis` from `./redisStore`

### **Client:**
- ✅ `client/src/components/Versus.tsx` - Added debug logging:
  - `onGameState` - Log received board updates
  - `sendSnapshot` (UDP) - Log UDP snapshots
  - `game:state` (TCP) - Log TCP fallback
  - `game:topout` - Log all topout events
  - Exit button - Log manual exit

---

## 🎯 **Expected Working Flow**

### **Normal Custom Room Match:**

1. **Join Room:**
   ```
   [Versus] Joined from lobby, roomId: 4UT9BAM5
   ```

2. **Game Start:**
   ```
   [game:start] Event received
   ```

3. **Board Sync (realtime):**
   ```
   ⚡ [UDP] Snapshot received  (every 500ms)
   OR
   🔵 [game:state] Event received  (TCP fallback)
   ```

4. **Topout:**
   ```
   💀 Board overflow detected!
   📤 Sending game:topout (board overflow)
   [Server] [game:topout] Player X topped out
   [Server] [game:topout] Match ended. Alive players: 1
   🏁 GAME OVER EVENT
   ```

5. **Rematch:**
   ```
   [Server] [game:topout] ✅ Match reset for rematch
   ```

---

**Happy Debugging! 🐛🔧**
