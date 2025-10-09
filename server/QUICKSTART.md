# 🚀 Quick Start - Authentication System

## ⚡ Setup (Chạy 1 lần duy nhất)

```bash
cd server

# 1. Cài dependencies (nếu chưa có)
npm install

# 2. Khởi tạo database
npm run db:init
```

## 🎮 Chạy Server

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

## 📝 Test Nhanh

### Đăng ký user mới:
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test1","email":"test1@mail.com","password":"pass123"}'
```

### Đăng nhập:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@mail.com","password":"pass123"}'
```

### Test tự động:
```bash
npm run test:auth
```

## 🔑 API Endpoints

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/auth/register` | `{username, email, password}` | `{success, token, user}` |
| POST | `/api/auth/login` | `{email, password}` | `{success, token, user}` |
| GET | `/api/auth/verify` | Header: `Authorization: Bearer <token>` | `{success, user}` |

## 💾 Database

**Table:** `account`  
**Fields:** account_id, username, email, password, created_at, elo_rating, etc.

```sql
-- Xem users
SELECT * FROM account;
```

## 🔧 Environment (.env)

```env
PG_HOST=localhost
PG_PORT=5432
PG_USER=devuser
PG_PASSWORD=123456
PG_DB=Tetris
JWT_SECRET=change_me_in_production
PORT=4000
```

## 📚 Docs

- **Chi tiết:** `AUTH_README.md`
- **Changelog:** `CHANGELOG_AUTH.md`
- **Migration:** `src/migrations/001_create_account_table.sql`

## 🐛 Common Issues

**DB connection failed?**
```bash
npm run db:ping
```

**Table missing?**
```bash
npm run db:init
```

**Port already in use?**
```bash
# Change PORT in .env
PORT=4001
```

## ✅ Done!

Auth system ready to use! 🎉
