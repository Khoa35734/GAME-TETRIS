# 🎮 Hướng dẫn cập nhật hệ thống Ranked BO3

## ✅ Những gì đã được thêm/sửa:

### 1. **Database Schema** (server/sql/01-create-game-sessions.sql)
- Tạo bảng `game_sessions`: Lưu trữ tất cả trận đấu
- Tạo bảng `game_details`: Chi tiết từng game trong match BO3
- Hỗ trợ lưu ELO changes (+100/-100)

### 2. **Backend API** (server/src/routes/gameSessions.ts)
- `POST /api/game-sessions`: Lưu kết quả trận đấu ranked
  - Tự động cập nhật ELO rating (+100 thắng, -100 thua)
  - Cập nhật games_played, games_won, games_lost
  - Hỗ trợ BO3 với chi tiết từng game
- `GET /api/game-sessions/history/:userId`: Lấy lịch sử trận đấu
- `GET /api/game-sessions/:sessionId`: Xem chi tiết một trận

### 3. **Frontend Service** (client/src/services/leaderboardService.ts)
- `fetchLeaderboard()`: Lấy dữ liệu leaderboard thật từ API
- `fetchLeaderboardStats()`: Lấy thống kê tổng quan
- `saveGameSession()`: Lưu kết quả trận đấu
- `fetchMatchHistory()`: Xem lịch sử trận đấu

### 4. **UI Updates** (client/src/components/menu/HomeMenu.tsx)
- ✅ Bỏ mock data, sử dụng API thật
- ✅ Hiển thị ELO Rating thay vì Level/Stars
- ✅ Sắp xếp theo ELO hoặc Số trận thắng
- ✅ Loading state khi fetch data

---

## 📋 Các bước cài đặt:

### Bước 1: Chạy Migration SQL
```bash
# Connect to your PostgreSQL database and run:
psql -U your_username -d your_database_name -f server/sql/01-create-game-sessions.sql
```

Hoặc nếu dùng pgAdmin/DBeaver, copy nội dung file và Execute.

### Bước 2: Khởi động lại Server
```bash
cd server
npm run dev
```

### Bước 3: Test API
Mở browser và test:
- http://localhost:4000/api/leaderboard
- http://localhost:4000/api/leaderboard/stats

### Bước 4: Khởi động Client
```bash
cd client
npm run dev
```

---

## 🎯 Cách sử dụng trong code game:

### Lưu kết quả trận Ranked BO3:

```typescript
import { saveGameSession } from '../services/leaderboardService';

// Sau khi match kết thúc
const matchResult = await saveGameSession({
  sessionUuid: 'unique-uuid-here',
  gameMode: 'ranked',
  matchType: 'BO3',
  player1Id: 123,
  player2Id: 456,
  winnerId: 123, // ID người thắng
  player1Score: 2, // Số game thắng (BO3)
  player2Score: 1,
  totalGames: 3,
  durationSeconds: 600,
  gameDetails: [
    { gameNumber: 1, winnerId: 123, durationSeconds: 180 },
    { gameNumber: 2, winnerId: 456, durationSeconds: 200 },
    { gameNumber: 3, winnerId: 123, durationSeconds: 220 }
  ]
});

console.log('ELO Changes:', matchResult.data);
// {
//   player1EloChange: 100,
//   player2EloChange: -100,
//   player1EloAfter: 1600,
//   player2EloAfter: 1400
// }
```

---

## 🔧 Tích hợp vào BO3MatchManager:

Bạn cần thêm code này vào file xử lý ranked match (ví dụ: `bo3MatchManager.ts`):

```typescript
import { saveGameSession } from '../services/leaderboardService';
import { v4 as uuidv4 } from 'uuid'; // npm install uuid

// Khi match kết thúc
async function handleMatchEnd(matchData: MatchData) {
  if (matchData.gameMode === 'ranked') {
    try {
      await saveGameSession({
        sessionUuid: uuidv4(),
        gameMode: 'ranked',
        matchType: 'BO3',
        player1Id: matchData.player1.accountId,
        player2Id: matchData.player2.accountId,
        winnerId: matchData.winnerId,
        player1Score: matchData.player1Score,
        player2Score: matchData.player2Score,
        totalGames: matchData.gamesPlayed,
        durationSeconds: Math.floor((Date.now() - matchData.startTime) / 1000),
        gameDetails: matchData.gameHistory // Array of game details
      });
      
      console.log('✅ Ranked match saved to database');
    } catch (error) {
      console.error('❌ Failed to save match:', error);
    }
  }
}
```

---

## 📊 Database Schema:

### `game_sessions` table:
- session_id (PK)
- session_uuid
- game_mode ('single', 'casual', 'ranked')
- match_type ('BO1', 'BO3')
- player1_id, player2_id
- winner_id
- player1_score, player2_score (số game thắng trong BO3)
- **player1_elo_before, player1_elo_after, player1_elo_change**
- **player2_elo_before, player2_elo_after, player2_elo_change**
- started_at, ended_at
- status ('completed', 'abandoned', 'disconnected')

### `game_details` table:
- detail_id (PK)
- session_id (FK)
- game_number (1, 2, 3 for BO3)
- winner_id
- player1_lines_cleared, player1_score, player1_pieces_placed
- player2_lines_cleared, player2_score, player2_pieces_placed
- duration_seconds

---

## 🎮 ELO Rating System:

- **Thắng**: +100 ELO
- **Thua**: -100 ELO
- **Minimum ELO**: 0 (không âm)
- **Default ELO**: 1000 (khi đăng ký tài khoản)

### ELO Tiers (có thể custom):
- 🔴 Master: 2000+
- 🟠 Diamond: 1800+
- 🟣 Platinum: 1600+
- 🔵 Gold: 1400+
- 🟢 Silver: 1200+
- ⚪ Bronze: < 1200

---

## 🐛 Troubleshooting:

### 1. Lỗi "table does not exist"
→ Bạn chưa chạy migration SQL. Chạy file `01-create-game-sessions.sql`

### 2. Lỗi 500 khi POST /api/game-sessions
→ Check console log server, có thể thiếu column trong database

### 3. Leaderboard không hiển thị dữ liệu
→ Check API response: http://localhost:4000/api/leaderboard
→ Đảm bảo có user trong database với `is_active = TRUE`

### 4. ELO không cập nhật
→ Check column `elo_rating` có tồn tại trong bảng `users`
→ Run: `ALTER TABLE users ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1000;`

---

## ✨ Tính năng bổ sung (có thể làm sau):

1. **Match Replay**: Lưu từng bước di chuyển để replay
2. **Achievements**: Huy chương khi đạt milestone (10 wins, 100 wins, etc.)
3. **Season Rankings**: Reset ELO theo mùa
4. **Tournament Mode**: Tổ chức giải đấu
5. **Statistics Dashboard**: Biểu đồ thống kê chi tiết

---

## 📝 Checklist:

- [ ] Chạy migration SQL
- [ ] Restart server
- [ ] Test API /api/leaderboard
- [ ] Test API /api/game-sessions
- [ ] Tích hợp vào ranked match flow
- [ ] Test match hoàn chỉnh end-to-end
- [ ] Verify ELO cập nhật đúng

---

Nếu gặp vấn đề, check:
1. Server logs: `npm run dev` output
2. Browser console: F12 → Console tab
3. Network tab: Check API responses
4. Database: Query `SELECT * FROM game_sessions LIMIT 10;`
