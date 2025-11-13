# 🔐 Authentication System - Visual Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────┐
                    │   User Opens App     │
                    │  localhost:5173      │
                    └──────────┬───────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │   HomeMenu.tsx       │
                    │  - Login Form        │
                    │  - Register Form     │
                    └──────────┬───────────┘
                              │
              ┌───────────────┴────────────────┐
              │                                │
         [Đăng nhập]                     [Đăng ký]
              │                                │
              ▼                                ▼
    ┌─────────────────────┐        ┌─────────────────────┐
    │  Enter Email        │        │  Enter Username     │
    │      ↓ [Tab]        │        │      ↓ [Tab]        │
    │  Enter Password     │        │  Enter Email        │
    │      ↓ [Enter]      │        │      ↓ [Tab]        │
    │   Submit Form       │        │  Enter Password     │
    └──────────┬──────────┘        │      ↓ [Tab]        │
              │                    │  Confirm Password   │
              │                    │      ↓ [Enter]      │
              │                    │   Submit Form       │
              │                    └──────────┬──────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  authService.ts      │
                    │  API Client          │
                    └──────────┬───────────┘
                              │
                   HTTP POST   │
                              ▼
                    ┌──────────────────────┐
                    │  Backend Server      │
                    │  localhost:4000      │
                    │  /api/auth/*         │
                    └──────────┬───────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
         [/register]     [/login]      [/verify]
                │             │             │
                ▼             ▼             ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │ Validate │  │ Validate │  │ Validate │
         │ Email    │  │ Email    │  │ Token    │
         │ Password │  │ Password │  └──────────┘
         └────┬─────┘  └────┬─────┘
              │             │
              ▼             ▼
         ┌──────────┐  ┌──────────┐
         │ Hash pwd │  │ Compare  │
         │ (bcrypt) │  │ password │
         └────┬─────┘  └────┬─────┘
              │             │
              ▼             ▼
         ┌────────────────────────┐
         │    PostgreSQL DB       │
         │    "Tetris"            │
         │    account table       │
         └────────┬───────────────┘
                  │
         ┌────────┴────────┐
         │                 │
    [INSERT]          [SELECT]
         │                 │
         ▼                 ▼
    New User          User Found
         │                 │
         └────────┬────────┘
                  │
                  ▼
         ┌──────────────────────┐
         │  Generate JWT Token  │
         │  (7-day expiry)      │
         └──────────┬───────────┘
                    │
         JSON Response
                    ▼
         ┌──────────────────────┐
         │  {                   │
         │    success: true,    │
         │    token: "eyJ...",  │
         │    user: {...}       │
         │  }                   │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Store in            │
         │  localStorage        │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Update UI           │
         │  Show Game Modes     │
         │  "Xin chào, user!"   │
         └──────────────────────┘

```

## 🎯 Key Components

### Frontend (React + TypeScript)
```
client/src/
├── components/
│   └── HomeMenu.tsx ..................... Main menu with auth forms
├── services/
│   └── authService.ts ................... API client for authentication
```

### Backend (Express + PostgreSQL)
```
server/src/
├── routes/
│   └── auth.ts .......................... Authentication endpoints
├── postgres.ts .......................... Database connection
├── migrations/
│   └── 001_create_account_table.sql ..... Database schema
└── scripts/
    ├── init-db.ts ....................... Initialize database
    └── test-auth.ts ..................... Test API endpoints
```

## 🔄 State Flow

### Registration Flow
```
User Input → Validation → Hash Password → Store in DB → Generate JWT → Return Token → Store Locally → Update UI
```

### Login Flow
```
User Input → Validation → Find User → Compare Password → Generate JWT → Return Token → Store Locally → Update UI
```

### Token Verification Flow
```
Get Token → Decode JWT → Check Expiry → Return User Info
```

## 🔐 Security Layers

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Password Hashing** | bcrypt (10 rounds) | Secure password storage |
| **JWT Tokens** | jsonwebtoken | Stateless authentication |
| **Email Validation** | Regex pattern | Prevent invalid emails |
| **SQL Safety** | Sequelize ORM | Prevent SQL injection |
| **CORS** | Express middleware | Control API access |

## 📊 Database Schema

```sql
CREATE TABLE account (
  account_id    SERIAL PRIMARY KEY,
  username      VARCHAR(50) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,     -- bcrypt hashed
  elo_rating    INTEGER DEFAULT 1000,
  games_played  INTEGER DEFAULT 0,
  wins          INTEGER DEFAULT 0,
  losses        INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email ON account(email);
CREATE INDEX idx_username ON account(username);
```

## 🎨 UI Components

### Login Form
```
┌─────────────────────────────────────┐
│ [Đăng nhập] [Đăng ký]              │ ← Tab selector
├─────────────────────────────────────┤
│ ⚠️  Error message here (if any)    │ ← Error display
├─────────────────────────────────────┤
│ Email:                              │
│ [____________________________]      │ ← Auto-focused
│                                     │
│ Mật khẩu:                           │
│ [____________________________]      │
│                                     │
│     [🎯 Đăng nhập]                  │ ← Submit button
│                                     │
│ ────────── HOẶC ──────────         │
│                                     │
│  [Chơi với tư cách Khách]          │ ← Guest button
└─────────────────────────────────────┘
```

### Register Form
```
┌─────────────────────────────────────┐
│ [Đăng nhập] [Đăng ký]              │ ← Tab selector
├─────────────────────────────────────┤
│ ⚠️  Error message here (if any)    │ ← Error display
├─────────────────────────────────────┤
│ Tên người dùng:                     │
│ [____________________________]      │ ← Auto-focused
│                                     │
│ Email:                              │
│ [____________________________]      │
│                                     │
│ Mật khẩu:                           │
│ [____________________________]      │
│                                     │
│ Xác nhận mật khẩu:                  │
│ [____________________________]      │
│                                     │
│     [✨ Đăng ký ngay]               │ ← Submit button
│                                     │
│ ────────── HOẶC ──────────         │
│                                     │
│  [Chơi với tư cách Khách]          │ ← Guest button
└─────────────────────────────────────┘
```

## ⌨️ Keyboard Navigation

```
Login:
  Email (focused) → [Enter] → Password → [Enter] → Submit

Register:
  Username (focused) → [Enter] → Email → [Enter] → Password → [Enter] → Confirm → [Enter] → Submit
```

## 🚦 Loading States

### Idle State
```
Button: "🎯 Đăng nhập" / "✨ Đăng ký ngay"
Inputs: Enabled, white background
Cursor: Pointer
```

### Loading State
```
Button: "⏳ Đang đăng nhập..." / "⏳ Đang tạo tài khoản..."
Inputs: Disabled, opacity 0.6
Cursor: not-allowed
```

### Success State
```
Redirect to game modes menu
Show: "Xin chào, [username]!"
Token stored in localStorage
```

### Error State
```
Red error box appears:
┌─────────────────────────────────────┐
│ ⚠️  Email đã được sử dụng          │
└─────────────────────────────────────┘
Inputs: Re-enabled
Button: Returns to idle state
```

## 📡 API Endpoints

| Method | Endpoint | Request Body | Response |
|--------|----------|--------------|----------|
| POST | `/api/auth/register` | `{username, email, password}` | `{success, token, user}` |
| POST | `/api/auth/login` | `{email, password}` | `{success, token, user}` |
| GET | `/api/auth/verify` | Header: `Authorization: Bearer <token>` | `{success, user}` |

## 🔄 Token Lifecycle

```
1. Registration/Login → Generate JWT (7 days)
2. Store in localStorage
3. Include in future API requests
4. Backend validates on each request
5. Token expires after 7 days
6. User must login again
```

## ✨ Features Summary

| Feature | Implementation | User Benefit |
|---------|---------------|--------------|
| **Tab Navigation** | useRef + onKeyDown | Fast form filling |
| **Auto-focus** | autoFocus prop | Immediate typing |
| **Error Display** | Conditional render | Clear feedback |
| **Loading State** | Emoji + disabled | Know what's happening |
| **Error Clearing** | onClick handler | Clean UX |
| **Real API** | fetch + authService | Secure authentication |
| **JWT Tokens** | jsonwebtoken | Persistent login |
| **Password Hash** | bcrypt | Secure storage |

---

**Architecture Type**: Full-Stack Authentication  
**Frontend**: React + TypeScript  
**Backend**: Express + PostgreSQL  
**Security**: JWT + bcrypt  
**UX Pattern**: Tab navigation + Real-time feedback  

🎉 **Professional-grade authentication system!**
