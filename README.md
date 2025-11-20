# 🎮 GAME TETRIS - Multiplayer Online Battle Arena

> Modern Tetris game với multiplayer realtime, ranked matchmaking, friends system, và leaderboard.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-61dafb)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black)](https://socket.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-5.0+-red)](https://redis.io/)

---

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Kiến trúc](#-kiến-trúc)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt](#-cài-đặt)
- [Cấu hình](#-cấu-hình)
- [Chạy ứng dụng](#-chạy-ứng-dụng)
- [Cơ chế game](#-cơ-chế-game)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)
- [Đóng góp](#-đóng-góp)
- [License](#-license)

---

## ✨ Tính năng

### 🎯 Core Gameplay
- **Classic Tetris**: Cơ chế chơi Tetris truyền thống với 7-bag random system
- **Modern Controls**: Hỗ trợ DAS (Delayed Auto Shift), ARR (Auto Repeat Rate)
- **T-Spin Detection**: Hỗ trợ T-Spin Mini và T-Spin (Single/Double/Triple)
- **Combo System**: Tính điểm combo liên tục khi xóa dòng
- **B2B (Back-to-Back)**: Bonus điểm cho difficult clears liên tiếp
- **Hold Piece**: Giữ piece để dùng sau
- **Ghost Piece**: Hiển thị vị trí sẽ rơi

### ⚔️ Multiplayer Modes

#### 1. **Ranked Matchmaking** (1v1)
- Tự động ghép cặp theo ELO rating (±150 điểm)
- Realtime gameplay với độ trễ < 50ms
- Garbage attack system:
  - Single: 0 garbage
  - Double: 1 garbage
  - Triple: 2 garbage
  - Tetris: 4 garbage
  - T-Spin Mini: 0 garbage
  - T-Spin Single: 2 garbage
  - T-Spin Double: 4 garbage
  - T-Spin Triple: 6 garbage
  - Combo bonus: +1-5 garbage
  - B2B bonus: +1 garbage
- Game over detection và match result tracking
- AFK detection (5 phút không hoạt động)

#### 2. **Custom Rooms**
- Tạo phòng private với room code
- Mời bạn bè qua friends system
- Host có quyền start/kick players
- Hỗ trợ tối đa 2-4 người chơi

#### 3. **Single Player**
- Marathon mode: Chơi không giới hạn
- Sprint mode: 40 lines challenge
- Ultra mode: 2 phút tối đa

### 👥 Social Features

#### Friends System
- Tìm bạn bè bằng User ID
- Gửi/nhận/từ chối lời mời kết bạn
- Real-time online status tracking:
  - 🟢 Online
  - ⚪ Offline
  - 🟡 In-game
- Xóa bạn bè
- Mời bạn bè vào custom room

#### Leaderboard
- Top 100 players theo:
  - ELO Rating (Ranked mode)
  - Win Rate (tỷ lệ thắng)
- Real-time ranking updates
- Lọc theo admin/player roles
- Hiển thị: username, ELO, games played, games won, win rate, win streak

### 🔐 Authentication & Authorization
- JWT-based authentication (7 days expiry)
- Bcrypt password hashing (10 rounds)
- Token refresh mechanism
- Guest mode (limited features):
  - ❌ Không thể ranked/multiplayer
  - ✅ Chỉ chơi single player
- Admin panel với role-based access control

### 📊 Stats & Progress
- ELO rating system (Ranked mode)
- Win streak tracking
- Match history:
  - Game duration
  - Winner/loser
  - Final score
  - Lines cleared
  - PPS (Pieces Per Second)
  - APM (Attacks Per Minute)
- Player profile với stats tổng hợp

---

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                       │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  HomeMenu  │  │   Versus     │  │  Friends Manager │   │
│  │            │  │  (Gameplay)  │  │                  │   │
│  │  - Login   │  │  - Board     │  │  - Friend List   │   │
│  │  - Modes   │  │  - Controls  │  │  - Requests      │   │
│  │  - Profile │  │  - State     │  │  - Search        │   │
│  └────────────┘  └──────────────┘  └──────────────────┘   │
│         │                 │                    │            │
│         └─────────────────┴────────────────────┘            │
│                           │                                 │
│                    Socket.IO Client                         │
└───────────────────────────┼─────────────────────────────────┘
                            │
                    WebSocket (ws://)
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                    Socket.IO Server                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Socket Handlers (socketHandlers.ts)        │  │
│  │  - connection / disconnect                           │  │
│  │  - matchmaking:join / cancel                         │  │
│  │  - player:ready                                      │  │
│  │  - game:state / game:attack / game:topout           │  │
│  │  - presence:update                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────┐  ┌────────────────┐  ┌──────────────────┐   │
│  │Matchmaking│  │  Match Manager │  │   BO3 Manager    │   │
│  │  System   │  │  (Redis-based) │  │ (Best of 3)      │   │
│  └──────────┘  └────────────────┘  └──────────────────┘   │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
          ▼                                   ▼
    ┌──────────┐                        ┌──────────┐
    │  Redis   │                        │PostgreSQL│
    │          │                        │          │
    │ - Queue  │                        │ - Users  │
    │ - Rooms  │                        │ - Matches│
    │ - Cache  │                        │ - Friends│
    └──────────┘                        │ - Stats  │
                                        └──────────┘
```

### Tech Stack

**Frontend:**
- React 19.1 (TSX)
- Vite 7.1
- Socket.IO Client 4.8
- React Router 7.9
- Styled Components 6.1
- Axios 1.12

**Backend:**
- Node.js 22.x
- Express 5.1
- Socket.IO 4.8
- TypeScript 5.9
- ts-node 10.9

**Database & Cache:**
- PostgreSQL 15+ (User data, matches, friends)
- Redis 5.0+ (Queue, rooms, realtime state)
- Sequelize 6.37 (ORM)
- ioredis 5.8 (Redis client)

**Security:**
- JWT (jsonwebtoken 9.0)
- bcrypt 6.0 (password hashing)
- CORS middleware
- Rate limiting (planned)

---

## 💻 Yêu cầu hệ thống

### Development
- **Node.js**: >= 22.0.0
- **npm**: >= 10.0.0
- **PostgreSQL**: >= 15.0
- **Redis**: >= 5.0
- **OS**: Windows 10/11, macOS 12+, Ubuntu 20.04+
- **RAM**: >= 4GB
- **Disk**: >= 500MB free space

### Production (recommended)
- **CPU**: 2+ cores
- **RAM**: 8GB+
- **Network**: >= 10 Mbps upload/download
- **PostgreSQL**: Dedicated instance (AWS RDS, Azure Database)
- **Redis**: Dedicated instance (AWS ElastiCache, Redis Labs)

---

## 🚀 Cài đặt

### 1. Clone repository
```bash
git clone https://github.com/Khoa35734/GAME-TETRIS.git
cd GAME-TETRIS
```

### 2. Cài đặt PostgreSQL

**Windows (scoop):**
```powershell
scoop install postgresql
```

**macOS (homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 3. Cài đặt Redis

**Windows (scoop):**
```powershell
scoop install redis
redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu:**
```bash
sudo apt install redis-server
sudo systemctl start redis-server
```

### 4. Tạo database

```bash
# Truy cập PostgreSQL
psql -U postgres

# Trong psql shell:
CREATE DATABASE tetris;
CREATE USER devuser WITH PASSWORD '123456';
GRANT ALL PRIVILEGES ON DATABASE tetris TO devuser;
\q

# Import schema
psql -U postgres -d tetris -f DB.sql
```

### 5. Cài đặt dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install
```

---

## ⚙️ Cấu hình

### Server Environment (.env)

Tạo file `server/.env`:
```env
# Server
NODE_ENV=development
PORT=4000

# Database (PostgreSQL)
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=tetris
PG_USER=devuser
PG_PASSWORD=123456

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_key_here_change_in_production

# CORS
CLIENT_URL=http://localhost:5173
```

### Client Environment (.env)

Tạo file `client/.env`:
```env
# API URL (auto-detect nếu không set)
VITE_API_URL=http://localhost:4000/api
```

**Auto-detect logic:**
- Localhost: `http://localhost:4000/api`
- LAN: `http://{current_ip}:4000/api`
- Custom: Lưu trong `localStorage.tetris:apiUrl`

---

## 🎮 Chạy ứng dụng

### Development (Local)

**Terminal 1 - Server:**
```bash
cd server
npm run dev
```
*(Tự động start Redis + ts-node)*

**Terminal 2 - Client:**
```bash
cd client
npm run dev
```
*(Mở browser tại http://localhost:5173)*

### Development (LAN - Mobile testing)

**Server:**
```bash
cd server
npm run dev
```

**Client:**
```bash
cd client
npm run dev -- --host
```
*(Truy cập từ mobile: `http://{your_local_ip}:5173`)*

### Production Build

**Server:**
```bash
cd server
npm run build
npm start
```

**Client:**
```bash
cd client
npm run build
npm run preview
```

---

## 🎲 Cơ chế game

### 7-Bag System
- 7 pieces (I, O, T, S, Z, J, L) được shuffle random
- Mỗi bag đảm bảo đủ 7 pieces
- Seed đồng bộ giữa client và server

### Scoring (Garbage Lines)

| Action | Garbage Lines |
|--------|--------------|
| Single (1 line) | 0 |
| Double (2 lines) | 1 |
| Triple (3 lines) | 2 |
| Tetris (4 lines) | 4 |
| T-Spin Mini | 0 |
| T-Spin Single | 2 |
| T-Spin Double | 4 |
| T-Spin Triple | 6 |
| **Combo Bonus** |  |
| Combo 2-4 | +1 |
| Combo 5-6 | +2 |
| Combo 7-8 | +3 |
| Combo 9-10 | +4 |
| Combo 11+ | +5 |
| **B2B Bonus** | +1 |

### ELO Rating
- Bắt đầu: 1000 ELO
- Win: +25 ELO
- Lose: -15 ELO
- Matchmaking range: ±150 ELO

### Game Over Conditions
1. **Top Out**: Piece spawn bị blocked
2. **Lock Out**: Piece lock ở trên buffer zone (hàng 20+)
3. **AFK**: 5 phút không có input
4. **Forfeit**: Player chủ động thoát

---

## 📡 API Documentation

### Authentication

#### POST `/api/auth/register`
```json
{
  "username": "player123",
  "email": "player@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 604800,
  "user": {
    "accountId": 10000001,
    "username": "player123",
    "email": "player@example.com",
    "role": "player"
  }
}
```

#### POST `/api/auth/login`
```json
{
  "email": "player@example.com",
  "password": "password123"
}
```

#### GET `/api/auth/verify`
Headers: `Authorization: Bearer {token}`

### Friends

#### GET `/api/friends`
Headers: `Authorization: Bearer {token}`
**Response:**
```json
{
  "success": true,
  "friends": [
    {
      "userId": 10000002,
      "username": "friend1",
      "email": "friend@example.com",
      "isOnline": true,
      "presenceStatus": "in_game",
      "gameMode": "multi"
    }
  ]
}
```

#### GET `/api/friends/requests`
Headers: `Authorization: Bearer {token}`

#### POST `/api/friends/search`
```json
{
  "userId": 10000003
}
```

#### POST `/api/friends/request`
```json
{
  "friendId": 10000003
}
```

#### POST `/api/friends/accept`
```json
{
  "friendId": 10000002
}
```

#### DELETE `/api/friends/:friendId`
Headers: `Authorization: Bearer {token}`

### Leaderboard

#### GET `/api/leaderboard?sort=rating&limit=100`
**Query params:**
- `sort`: `rating` | `winrate`
- `limit`: 1-200 (default: 100)
- `offset`: pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "account_id": 10000001,
      "username": "ProPlayer",
      "elo_rating": 1250,
      "games_played": 50,
      "games_won": 35,
      "games_lost": 15,
      "win_rate": 70.0,
      "win_streak": 5,
      "rank": 1
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

### Match History

#### GET `/api/match-history/:accountId`
**Response:**
```json
{
  "success": true,
  "matches": [
    {
      "match_id": 123,
      "mode": "ranked",
      "winner_id": 10000001,
      "loser_id": 10000002,
      "duration_seconds": 180,
      "created_at": "2025-11-12T10:30:00Z"
    }
  ],
  "stats": {
    "eloRating": 1050,
    "winStreak": 3,
    "totalGames": 25,
    "wins": 15,
    "losses": 10
  }
}
```

### Socket.IO Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `user:authenticate` | `accountId: number` | Xác thực user sau login |
| `matchmaking:join` | `{ mode: 'ranked' \| 'casual' }` | Tham gia queue |
| `matchmaking:cancel` | - | Hủy matchmaking |
| `player:ready` | `roomId: string` | Báo sẵn sàng chơi |
| `game:state` | `roomId, { board, piece, ... }` | Gửi state tới opponent |
| `game:attack` | `roomId, { lines: number }` | Gửi garbage attack |
| `game:topout` | `roomId, reason: string` | Báo game over |
| `match:forfeit` | `{ roomId: string }` | Đầu hàng |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `user:authenticated` | `{ accountId, username, socketId }` | Xác nhận auth |
| `matchmaking:found` | `{ roomId, opponent }` | Tìm thấy trận |
| `game:start` | `{ countdown, seed, next, player1, player2, matchId, mode }` | Bắt đầu game |
| `game:state` | `{ board, piece, from }` | Nhận state từ opponent |
| `game:applyGarbage` | `{ lines, from }` | Nhận garbage lines |
| `game:over` | `{ winner, loser, reason }` | Kết thúc trận |
| `presence:update` | `{ userId, status, mode, since }` | Cập nhật online status |

---

## 🔧 Troubleshooting

### 1. Server không start được

**Lỗi: `Cannot connect to Redis`**
```bash
# Kiểm tra Redis đang chạy
redis-cli ping
# Nếu không có "PONG", start Redis:
redis-server
```

**Lỗi: `Cannot connect to PostgreSQL`**
```bash
# Kiểm tra PostgreSQL
psql -U postgres -c "SELECT version();"
# Nếu lỗi, start service:
# Windows: net start postgresql-x64-15
# macOS: brew services start postgresql@15
# Linux: sudo systemctl start postgresql
```

### 2. Client không kết nối được Server

**Lỗi: `ERR_CONNECTION_REFUSED`**
- Kiểm tra server đang chạy: `http://localhost:4000/api/health`
- Kiểm tra CORS settings trong `server/src/app.ts`
- Kiểm tra firewall/antivirus

**Lỗi: `Socket disconnected`**
- Kiểm tra network stability
- Xem server logs để debug
- Kiểm tra token hợp lệ trong localStorage

### 3. Token không hợp lệ (403 Forbidden)

**Triệu chứng:**
- Friends list không load
- API calls trả về 403

**Giải pháp:**
1. Xóa localStorage và login lại:
```javascript
// Browser console (F12)
localStorage.clear();
location.reload();
```

2. Kiểm tra JWT_SECRET trong `.env` server
3. Kiểm tra token expiry (7 days default)

### 4. Matchmaking không tìm thấy trận

**Triệu chứng:**
- "Đang tìm trận..." không bao giờ kết thúc

**Giải pháp:**
1. Kiểm tra Redis queue:
```bash
redis-cli
ZRANGE ranked:queue 0 -1 WITHSCORES
```

2. Xóa queue cũ:
```bash
redis-cli
DEL ranked:queue
```

3. Restart server và thử lại

### 5. Garbage không đến opponent

**Triệu chứng:**
- Xóa dòng nhưng opponent không nhận garbage

**Debug:**
1. Mở F12 Console ở cả 2 clients
2. Kiểm tra logs:
```
💣 Sending X garbage lines
📥 Received garbage: X lines
```

3. Kiểm tra `game:attack` và `game:applyGarbage` events trong server logs

### 6. Performance issues (Lag/FPS drop)

**Giải pháp:**
- Giảm `ARR` (Auto Repeat Rate) trong settings
- Tắt particle effects
- Kiểm tra network latency: `ping {server_ip}`
- Upgrade RAM/CPU nếu cần

---

## 🤝 Đóng góp

Contributions are welcome! Please follow these steps:

1. **Fork** repository
2. **Create branch**: `git checkout -b feature/your-feature-name`
3. **Commit**: `git commit -am 'Add some feature'`
4. **Push**: `git push origin feature/your-feature-name`
5. **Create Pull Request**

### Coding Standards
- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with recommended rules
- **Formatting**: Prettier (2 spaces, single quotes)
- **Commits**: Conventional Commits format
  - `feat:` new feature
  - `fix:` bug fix
  - `docs:` documentation
  - `refactor:` code refactoring
  - `test:` add tests
  - `chore:` maintenance

### Testing (Planned)
- Unit tests: Jest
- Integration tests: Supertest
- E2E tests: Playwright

---

## 📄 License

MIT License

Copyright (c) 2025 Khoa35734

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 📞 Support & Contact

- **GitHub Issues**: [Report bugs](https://github.com/Khoa35734/GAME-TETRIS/issues)
- **Email**: khoaphamby@gmail.com (replace with your email)
- **Discord**: [Join our server](#) (if applicable)

---

## 🎉 Acknowledgments

- [Tetris Guidelines](https://tetris.wiki/Tetris_Guideline) - Game mechanics reference
- [TETR.IO](https://tetr.io/) - Inspiration for multiplayer features
- [Jstris](https://jstris.jezevec10.com/) - UI/UX inspiration
- Socket.IO team for amazing realtime framework
- React team for modern frontend tools

---

**Built with ❤️ by Khoa35734**

*Last updated: November 12, 2025*
