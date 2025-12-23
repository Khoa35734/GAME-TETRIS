# 🚀 QUICK START - Ranked BO3 System

## ⚡ Bước 1: Chạy Migrations (Bắt buộc)

### Windows (PowerShell):
```powershell
cd "e:\Kì I năm 3\PBL4\Tetris\GAME-TETRIS\server\sql"

# Sửa credentials trong file run-migrations.ps1 trước
# Sau đó chạy:
.\run-migrations.ps1
```

### Hoặc chạy thủ công:
```powershell
# Kết nối database của bạn trong pgAdmin hoặc psql
# Chạy lần lượt 2 files:
# 1. 00-add-elo-rating.sql
# 2. 01-create-game-sessions.sql
```

---

## ⚡ Bước 2: Restart Server

```powershell
cd "e:\Kì I năm 3\PBL4\Tetris\GAME-TETRIS\server"
npm run dev
```

---

## ⚡ Bước 3: Test Leaderboard

Mở browser:
- http://localhost:5173 - Trang chính (client)
- Click "Bảng xếp hạng" để xem dữ liệu thật
- Hoặc truy cập: http://localhost:5173/leaderboard

---

## ⚡ Bước 4: Test API (Optional)

```powershell
# Test leaderboard API
curl http://localhost:4000/api/leaderboard

# Test stats API
curl http://localhost:4000/api/leaderboard/stats
```

---

## 📋 Những gì đã thay đổi:

### ✅ Leaderboard bây giờ:
- Lấy dữ liệu THẬT từ database (không còn mock data)
- Hiển thị: **ELO Rating**, **Win Rate**, **Games Won**
- Sắp xếp: Theo ELO hoặc Số trận thắng

### ✅ Ranked matches bây giờ:
- Thắng: **+100 ELO**
- Thua: **-100 ELO**
- Tự động lưu vào database
- Cập nhật: `games_played`, `games_won`, `games_lost`

---

## 🎮 Sử dụng trong code (Khi làm ranked match):

```typescript
import { saveGameSession } from '../services/leaderboardService';
import { v4 as uuidv4 } from 'uuid';

// Sau khi match kết thúc
await saveGameSession({
  sessionUuid: uuidv4(),
  gameMode: 'ranked',
  matchType: 'BO3',
  player1Id: player1.accountId,
  player2Id: player2.accountId,
  winnerId: winner.accountId,
  player1Score: 2, // Số game thắng
  player2Score: 1,
  totalGames: 3,
  durationSeconds: 600
});
```

---

## 🐛 Nếu gặp lỗi:

### Lỗi: "column elo_rating does not exist"
→ Chưa chạy migration. Chạy lại `00-add-elo-rating.sql`

### Lỗi: "table game_sessions does not exist"  
→ Chưa chạy migration. Chạy lại `01-create-game-sessions.sql`

### Leaderboard không hiển thị
→ Check API: http://localhost:4000/api/leaderboard
→ Cần có ít nhất 1 user trong database với `is_active = TRUE`

---

## 📚 Chi tiết đầy đủ:

Xem file: **RANKED-BO3-IMPLEMENTATION.md** và **SUMMARY-RANKED-BO3.md**

---

**🎉 Done! Bây giờ có thể test leaderboard với dữ liệu thật!**
