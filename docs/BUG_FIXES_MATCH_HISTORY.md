# 🔧 BUG FIXES - Match History & Overlay Issues

## ✅ Đã Sửa

### 1. **Overlay Hiển Thị Sai** ✅
**Vấn đề**: Khi kết thúc ván, cả overlay cập nhật tỉ số VÀ overlay chung cuộc đều hiện ra cùng lúc.

**Nguyên nhân**: `roundResult` không được check với `matchResult`.

**Giải pháp**: Thêm điều kiện `!matchResult` trong Versus.tsx:
```tsx
{roundResult && !matchResult && (
  <ScoreUpdateOverlay ... />
)}
```

---

### 2. **Stats Không Được Lưu Vào Database** ✅
**Vấn đề**: Server không nhận được stats thực tế từ client, chỉ có dummy stats.

**Nguyên nhân**: 
- Client emit `bo3:game-finished` nhưng chỉ gửi stats của 1 player
- Server không có cơ chế thu thập stats từ cả 2 players

**Giải pháp**: 
1. **Client** (`useNetwork.ts`): Emit event mới `bo3:player-stats` để gửi stats của mình
2. **Server** (`bo3MatchManager.ts`): 
   - Listen event `bo3:player-stats` và lưu vào temp storage
   - `handleGameTopout()` sử dụng stats thực tế thay vì dummy stats

---

## 🧪 Cách Test

### **Test 1: Kiểm Tra Overlay**
```
1. Chơi 1 trận BO3
2. Kết thúc ván 1 → CHỈ thấy ScoreUpdateOverlay (tỉ số 1-0 hoặc 0-1)
3. Chờ 4 giây → Overlay tự động đóng
4. Chơi tiếp ván 2
5. Kết thúc trận (2-0 hoặc 2-1) → CHỈ thấy MatchResultOverlay (chung cuộc)
```

**Kết quả mong đợi**:
- ✅ Không bao giờ thấy 2 overlay cùng lúc
- ✅ ScoreUpdateOverlay chỉ hiện khi chưa kết thúc trận
- ✅ MatchResultOverlay chỉ hiện khi trận kết thúc

---

### **Test 2: Kiểm Tra Stats Được Lưu**

#### **Bước 1: Xem Log Server**
```
[BO3] 📊 Received stats from <socket-id>: { pieces: 45, attack_lines: 18, ... }
[BO3] 📊 Received stats from <socket-id>: { pieces: 40, attack_lines: 15, ... }
[BO3] handleGameTopout: player2 thắng game 1 (do <socket-id> top-out)
[BO3] 📊 Using stats - Player1: { pieces: 45, attack_lines: 18, time: 23.5, pps: 1.91, apm: 45.96 }
[BO3] 📊 Using stats - Player2: { pieces: 40, attack_lines: 15, time: 23.5, pps: 1.70, apm: 38.30 }
[BO3] Game 1 finished in match_xxx: player2 wins
[BO3] Score: 0-1

... (sau khi kết thúc trận) ...

[BO3] 💾 Saving match history to database...
[BO3] 🔄 Calling saveMatchData with payload: { ... }
[MatchHistoryService] 🚀 Starting transaction to save match data...
[MatchHistoryService] ✅ Inserted match with ID: 1
[MatchHistoryService] ✅ Inserted game 1 stats for Player 1
[MatchHistoryService] ✅ Inserted game 1 stats for Player 2
[MatchHistoryService] ✅ Inserted game 2 stats for Player 1
[MatchHistoryService] ✅ Inserted game 2 stats for Player 2
[MatchHistoryService] 🎉 Transaction committed successfully! Match ID: 1
[BO3] ✅ Match history saved successfully! DB Match ID: 1
```

#### **Bước 2: Kiểm Tra Database**
```sql
-- 1. Xem match vừa chơi
SELECT * FROM matches ORDER BY match_timestamp DESC LIMIT 1;

-- Expected: 
-- match_id | player1_id | player2_id | player1_wins | player2_wins | winner_id | mode
-- 1        | 101        | 102        | 2            | 1            | 101       | ranked

-- 2. Xem chi tiết game_stats
SELECT 
  gs.game_number,
  u.user_name,
  gs.is_winner,
  gs.pieces,
  gs.attack_lines,
  gs.time_seconds,
  gs.pps,
  gs.apm
FROM game_stats gs
JOIN users u ON gs.player_id = u.user_id
WHERE gs.match_id = 1
ORDER BY gs.game_number, gs.player_id;

-- Expected: 6 rows (3 games × 2 players)
-- game_number | user_name | is_winner | pieces | attack_lines | time_seconds | pps  | apm
-- 1           | Player1   | TRUE      | 45     | 18           | 23.50        | 1.91 | 45.96
-- 1           | Player2   | FALSE     | 40     | 15           | 23.50        | 1.70 | 38.30
-- 2           | Player1   | FALSE     | 38     | 12           | 20.10        | 1.89 | 35.82
-- 2           | Player2   | TRUE      | 42     | 16           | 20.10        | 2.09 | 47.76
-- 3           | Player1   | TRUE      | 50     | 22           | 28.30        | 1.77 | 46.64
-- 3           | Player2   | FALSE     | 45     | 18           | 28.30        | 1.59 | 38.16
```

---

## 🐛 Nếu Vẫn Không Thấy Stats

### **Check 1: Client có gửi stats không?**
```
1. Mở DevTools Console (F12)
2. Chơi đến khi game over
3. Tìm log: "[Network] 📊 Sending my stats to server:"
```

**Nếu KHÔNG thấy log** → Client không gọi `sendTopout()` → Kiểm tra logic game over

**Nếu CÓ log nhưng stats = 0** → Client không track đúng → Kiểm tra `piecesPlaced`, `attacksSent`

---

### **Check 2: Server có nhận stats không?**
```
1. Xem server console
2. Tìm log: "[BO3] 📊 Received stats from <socket-id>:"
```

**Nếu KHÔNG thấy log** → Socket event không được emit → Kiểm tra connection

**Nếu CÓ log nhưng stats = 0** → Client gửi sai → Kiểm tra payload

---

### **Check 3: Server có lưu vào database không?**
```
1. Tìm log: "[BO3] 💾 Saving match history to database..."
2. Tìm log: "[MatchHistoryService] 🚀 Starting transaction..."
3. Tìm log: "[MatchHistoryService] 🎉 Transaction committed successfully!"
```

**Nếu KHÔNG thấy log** → Match chưa kết thúc hoặc `finishMatch()` không được gọi

**Nếu CÓ lỗi** → Kiểm tra error log để biết nguyên nhân

---

## 📝 Files Đã Thay Đổi

1. `client/src/components/multiplayer/Versus.tsx`
   - Thêm điều kiện `!matchResult` cho ScoreUpdateOverlay

2. `client/src/components/multiplayer/hooks/useNetwork.ts`
   - Emit event `bo3:player-stats` thay vì `bo3:game-finished`
   - Gửi stats thực tế thay vì dummy

3. `server/src/managers/bo3MatchManager.ts`
   - Listen event `bo3:player-stats`
   - Lưu stats vào temp storage
   - `handleGameTopout()` sử dụng stats thực tế
   - Thêm nhiều log để debug

---

## ✅ Checklist Test

- [ ] Overlay chỉ hiện 1 cái tại 1 thời điểm
- [ ] ScoreUpdateOverlay không hiện khi trận kết thúc
- [ ] Client log: "📊 Sending my stats to server"
- [ ] Server log: "📊 Received stats from <socket-id>"
- [ ] Server log: "📊 Using stats - Player1/Player2"
- [ ] Server log: "💾 Saving match history to database"
- [ ] Server log: "🎉 Transaction committed successfully"
- [ ] Database: `SELECT * FROM matches` có data mới
- [ ] Database: `SELECT * FROM game_stats` có 2-6 rows
- [ ] Stats trong DB không phải toàn 0

---

**🎯 Nếu tất cả checklist đều ✅ → HOÀN TẤT!**
