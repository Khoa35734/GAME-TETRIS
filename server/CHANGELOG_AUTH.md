# 🔐 Cập Nhật Hệ Thống Đăng Nhập/Đăng Ký - Tetris Game

## 📋 Tổng Quan Thay Đổi

Đã cập nhật và đồng bộ hoàn toàn hệ thống authentication với database Tetris.

## 🗄️ Database Schema

### Bảng Account (Mới)
```sql
account (
  account_id SERIAL PRIMARY KEY,      -- ID tự động tăng
  username VARCHAR(50) UNIQUE,        -- Tên người dùng (unique)
  email VARCHAR(100) UNIQUE,          -- Email (unique)
  password VARCHAR(255),              -- Password đã hash (bcrypt)
  created_at TIMESTAMP,               -- Ngày tạo tài khoản
  updated_at TIMESTAMP,               -- Ngày cập nhật cuối
  last_login TIMESTAMP,               -- Lần đăng nhập cuối
  is_active BOOLEAN DEFAULT TRUE,     -- Trạng thái hoạt động
  elo_rating INTEGER DEFAULT 1000,    -- Điểm ELO
  games_played INTEGER DEFAULT 0,     -- Số trận đã chơi
  games_won INTEGER DEFAULT 0,        -- Số trận thắng
  games_lost INTEGER DEFAULT 0        -- Số trận thua
)
```

## 📁 Files Đã Tạo/Sửa

### 1. Auth Routes (`server/src/routes/auth.ts`) ✅
**Thay đổi:**
- ✅ Đổi từ bảng `users` sang bảng `account`
- ✅ Đổi trường `user_name` → `username`, `user_id` → `account_id`
- ✅ Thêm validation đầy đủ
- ✅ Hash password với bcrypt (10 rounds)
- ✅ JWT token expires sau 7 ngày
- ✅ Response format chuẩn với `success: boolean`
- ✅ Thêm endpoint `/api/auth/verify` để kiểm tra token

**Endpoints:**
```
POST /api/auth/register  - Đăng ký tài khoản mới
POST /api/auth/login     - Đăng nhập
GET  /api/auth/verify    - Xác thực token
```

### 2. Server Index (`server/src/index.ts`) ✅
**Thay đổi:**
- ✅ Thêm `express.json()` middleware
- ✅ Thêm `express.urlencoded()` middleware
- ✅ Mount auth router tại `/api/auth`

### 3. Migration File (`server/src/migrations/001_create_account_table.sql`) ✨ MỚI
- Tạo bảng `account` với đầy đủ constraints
- Thêm indexes cho performance (email, username, elo)
- Thêm trigger tự động update `updated_at`
- Ready-to-run SQL script

### 4. Database Init Script (`server/src/scripts/init-db.ts`) ✨ MỚI
- Script khởi tạo database tự động
- Chạy migration
- Verify table structure
- Log chi tiết

### 5. Test Script (`server/src/scripts/test-auth.ts`) ✨ MỚI
- Test tất cả endpoints
- Test validation
- Test error cases
- Automated testing

### 6. Documentation (`server/AUTH_README.md`) ✨ MỚI
- Hướng dẫn setup đầy đủ
- API documentation
- Client integration examples
- Security notes
- Troubleshooting guide

### 7. Package.json ✅
**Thêm scripts mới:**
```json
"db:init": "ts-node src/scripts/init-db.ts",
"test:auth": "ts-node src/scripts/test-auth.ts"
```

**Dependencies đã cài:**
- `bcrypt`: Hash passwords
- `jsonwebtoken`: JWT tokens
- `@types/bcrypt`: TypeScript types
- `@types/jsonwebtoken`: TypeScript types

## 🚀 Hướng Dẫn Sử Dụng

### Bước 1: Khởi Tạo Database
```bash
cd server
npm run db:init
```

Output mong đợi:
```
[DB Init] Connecting to database...
[DB Init] Connected successfully
[DB Init] Running account table migration...
[DB Init] ✅ Account table created/verified
[DB Init] ✅ Verified: account table exists
[DB Init] ✅ Database initialization complete
```

### Bước 2: Khởi Động Server
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Bước 3: Test Endpoints (Optional)
Đảm bảo server đang chạy, sau đó:
```bash
npm run test:auth
```

## 📡 API Usage Examples

### 1. Đăng Ký
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "player1@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng ký thành công!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "accountId": 1,
    "username": "player1",
    "email": "player1@example.com"
  }
}
```

### 2. Đăng Nhập
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player1@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:** (Same format as register)

### 3. Verify Token
```bash
curl -X GET http://localhost:4000/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 💻 Client Integration (React/TypeScript)

```typescript
// authService.ts
const API_URL = 'http://localhost:4000/api/auth';

export const authService = {
  async register(username: string, email: string, password: string) {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('tetris:token', data.token);
      localStorage.setItem('tetris:user', JSON.stringify(data.user));
    }
    
    return data;
  },

  async login(email: string, password: string) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('tetris:token', data.token);
      localStorage.setItem('tetris:user', JSON.stringify(data.user));
    }
    
    return data;
  },

  async verifyToken() {
    const token = localStorage.getItem('tetris:token');
    if (!token) return null;
    
    const response = await fetch(`${API_URL}/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return response.json();
  },

  logout() {
    localStorage.removeItem('tetris:token');
    localStorage.removeItem('tetris:user');
  },

  getUser() {
    const userStr = localStorage.getItem('tetris:user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken() {
    return localStorage.getItem('tetris:token');
  }
};
```

## ✅ Validation Rules

### Username
- Required ✅
- Must be unique ✅
- Max 50 characters ✅

### Email
- Required ✅
- Must be unique ✅
- Max 100 characters ✅
- Valid email format (enforced by DB) ✅

### Password
- Required ✅
- Hashed with bcrypt (10 rounds) ✅
- Stored as 255 character hash ✅

## 🔒 Security Features

1. **Password Hashing**: bcrypt với 10 rounds
2. **JWT Authentication**: Tokens expire sau 7 ngày
3. **Unique Constraints**: Email và username không trùng lặp
4. **Input Validation**: Check tất cả required fields
5. **SQL Injection Protection**: Sử dụng parameterized queries (Sequelize)

## ⚠️ Lưu Ý Quan Trọng

### Environment Variables
Tạo file `.env` trong thư mục `server`:
```env
# Database
PG_HOST=localhost
PG_PORT=5432
PG_USER=devuser
PG_PASSWORD=123456
PG_DB=Tetris

# JWT Secret (QUAN TRỌNG: Thay đổi trong production!)
JWT_SECRET=your_super_secret_key_here_change_in_production

# Server
PORT=4000
HOST=0.0.0.0
```

### Production Checklist
- [ ] Thay đổi `JWT_SECRET` thành chuỗi ngẫu nhiên mạnh
- [ ] Enable HTTPS
- [ ] Thêm rate limiting cho login endpoint
- [ ] Implement email verification
- [ ] Thêm password reset functionality
- [ ] Thêm account lockout sau nhiều lần đăng nhập sai
- [ ] Log authentication attempts
- [ ] Setup backup cho database

## 🐛 Troubleshooting

### Lỗi: "Cannot connect to database"
```bash
# Kiểm tra PostgreSQL đang chạy
pg_isready

# Kiểm tra credentials trong .env
cat .env

# Test connection
npm run db:ping
```

### Lỗi: "Table does not exist"
```bash
# Chạy lại migration
npm run db:init
```

### Lỗi: "bcrypt error"
```bash
# Rebuild bcrypt module
npm rebuild bcrypt
```

## 📊 Database Queries Hữu Ích

```sql
-- Xem tất cả users
SELECT account_id, username, email, created_at, elo_rating 
FROM account 
ORDER BY created_at DESC;

-- Xem user theo ID
SELECT * FROM account WHERE account_id = 1;

-- Update ELO rating
UPDATE account 
SET elo_rating = 1200, games_played = games_played + 1, games_won = games_won + 1
WHERE account_id = 1;

-- Xóa user (nếu cần)
DELETE FROM account WHERE email = 'test@example.com';

-- Reset auto-increment counter
ALTER SEQUENCE account_account_id_seq RESTART WITH 1;
```

## 🎯 Next Steps (Tương Lai)

1. **Profile Management**
   - GET /api/profile/:id
   - PUT /api/profile/:id
   - Upload avatar

2. **Stats & Leaderboard**
   - GET /api/leaderboard
   - GET /api/stats/:userId

3. **Friend System**
   - Add/Remove friends
   - Friend requests

4. **Match History**
   - Save match results
   - View history

5. **Admin Panel**
   - User management
   - Ban/unban users

## ✨ Kết Luận

Hệ thống authentication đã được cập nhật hoàn toàn và đồng bộ với database Tetris. Tất cả endpoints đã được test và hoạt động ổn định.

**Các file quan trọng cần review:**
- `server/src/routes/auth.ts` - Main auth logic
- `server/src/index.ts` - Server setup
- `server/AUTH_README.md` - Detailed documentation
- `server/src/migrations/001_create_account_table.sql` - Database schema

**Commands cần nhớ:**
```bash
npm run db:init      # Khởi tạo database
npm run dev          # Chạy server dev mode
npm run test:auth    # Test authentication endpoints
```

---
**Version:** 1.0.0  
**Last Updated:** October 9, 2025  
**Author:** GitHub Copilot  
