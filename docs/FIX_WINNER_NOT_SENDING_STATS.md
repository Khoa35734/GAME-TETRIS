# 🔧 FIX: Player2 (Winner) Not Sending Stats

## ❌ VẤN ĐỀ:
Từ log server, ta thấy:
```
[BO3] 🔍 tempPlayer1Stats exists: true   ✅ (người thua đã gửi)
[BO3] 🔍 tempPlayer2Stats exists: false  ❌ (người thắng KHÔNG gửi)
```

**Nguyên nhân:**
- Chỉ có **người thua** (topout) mới gọi `sendTopout()` → gửi stats
- **Người thắng** KHÔNG topout → KHÔNG gửi stats → stats = 0

---

## ✅ GIẢI PHÁP:

### Thay đổi trong `useSocketEvents.ts`:

Khi nhận event `bo3:game-result`, **người thắng** cũng gọi `sendTopout()` để gửi stats:

```typescript
// Trong onBo3GameResult():
if (didIWin && !coreRef.current.gameOver) {
  console.log('[DEBUG] 📊 Winner sending stats via sendTopout');
  sendTopout('opponent_topout');
}
```

**Logic:**
1. **Người thua:** Topout → gọi `sendTopout()` → gửi stats
2. **Người thắng:** Nhận `bo3:game-result` → check `didIWin` → gọi `sendTopout()` → gửi stats
3. **Server:** Nhận stats từ CẢ HAI players → lưu vào database

---

## 📋 FLOW HOÀN CHỈNH:

### 1. Game Over (Player1 topout):
```
[Client Player1] 📊 Sending my stats to server: {pieces: 8, ...}
[Server] 📊 Received stats from Player1
[Server] ✅ Saved Player1 stats
[Server] 🏆 Resolving topout → Player2 wins
```

### 2. Server Broadcast `bo3:game-result`:
```
[Server] → emit('bo3:game-result', {winner: 'player2', ...})
```

### 3. Client Player2 nhận event:
```
[Client Player2] 🕹️ bo3:game-result: winner=player2
[Client Player2] 📊 Winner sending stats via sendTopout
[Client Player2] 📊 Sending my stats to server: {pieces: 42, ...}
[Server] 📊 Received stats from Player2
[Server] ✅ Saved Player2 stats
```

### 4. Server lưu vào DB:
```
[Server] 💾 Saving match history to database...
[Server] 🔍 tempPlayer1Stats exists: true  ✅
[Server] 🔍 tempPlayer2Stats exists: true  ✅
[Server] 📊 Using stats - Player1: {pieces: 8, ...}
[Server] 📊 Using stats - Player2: {pieces: 42, ...}
[Server] 🎉 Transaction committed successfully!
```

---

## ✅ ĐÃ SỬA:

1. ✅ `client/src/components/multiplayer/hooks/useSocketEvents.ts`
   - Thêm logic gửi stats cho người thắng trong `onBo3GameResult()`

---

## 🧪 TEST LẠI:

```powershell
# Terminal 1: Server
cd E:\PBL4\GAME-TETRIS\server
npm run dev

# Terminal 2: Client
cd E:\PBL4\GAME-TETRIS\client
npm run dev
```

**Chơi 1 trận BO3 và kiểm tra log:**
- ✅ `[DEBUG] 📊 Winner sending stats via sendTopout`
- ✅ `[BO3] 📊 Received stats from Player1`
- ✅ `[BO3] 📊 Received stats from Player2`
- ✅ `[BO3] 🔍 tempPlayer1Stats exists: true`
- ✅ `[BO3] 🔍 tempPlayer2Stats exists: true`
- ✅ `[MatchHistoryService] 🎉 Transaction committed successfully!`

**Kiểm tra database:**
```sql
SELECT * FROM matches ORDER BY match_timestamp DESC LIMIT 1;
SELECT * FROM game_stats WHERE match_id = (SELECT MAX(match_id) FROM matches);
```

**Kết quả mong đợi:**
- Bảng `matches`: 1 row mới
- Bảng `game_stats`: 4-6 rows với **stats KHÔNG phải 0**

---

## 📝 LƯU Ý:

- Fix này chỉ áp dụng cho chế độ **BO3** (Ranked/Casual BO3)
- Chế độ BO1 (nếu có) vẫn dùng logic cũ qua `game:over`
- Stats được gửi **2 lần**: 1 lần khi topout, 1 lần khi nhận game-result
  - **Nhưng server chỉ lưu lần cuối** (clear temp stats sau khi dùng)
