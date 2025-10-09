# Tetris Game - Authentication System

## Database Schema

### Account Table
```sql
account (
  account_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  elo_rating INTEGER DEFAULT 1000,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0
)
```

## API Endpoints

### Base URL
```
http://localhost:4000/api/auth
```

### 1. Register
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "username": "player123",
  "email": "player@example.com",
  "password": "securePassword123"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Đăng ký thành công!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "accountId": 1,
    "username": "player123",
    "email": "player@example.com"
  }
}
```

**Error Responses:**
- `400`: Thiếu thông tin / Email hoặc username đã tồn tại
- `500`: Lỗi server

### 2. Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "player@example.com",
  "password": "securePassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Đăng nhập thành công!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "accountId": 1,
    "username": "player123",
    "email": "player@example.com"
  }
}
```

**Error Responses:**
- `400`: Thiếu thông tin
- `404`: Email không tồn tại
- `401`: Sai mật khẩu
- `500`: Lỗi server

### 3. Verify Token
**Endpoint:** `GET /api/auth/verify`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "accountId": 1,
    "username": "player123",
    "email": "player@example.com"
  }
}
```

**Error Responses:**
- `401`: Token không hợp lệ hoặc hết hạn
- `404`: Người dùng không tồn tại

## Setup Instructions

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Configure Environment
Create `.env` file in server root:
```env
# Database
PG_HOST=localhost
PG_PORT=5432
PG_USER=devuser
PG_PASSWORD=123456
PG_DB=Tetris

# JWT
JWT_SECRET=your_secret_key_here

# Server
PORT=4000
HOST=0.0.0.0
```

### 3. Initialize Database
```bash
npm run db:init
```

This will:
- Create the `account` table
- Set up indexes
- Create triggers for auto-updating timestamps

### 4. Start Server
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Client Integration Example

### Using Fetch API
```typescript
// Register
const register = async (username: string, email: string, password: string) => {
  const response = await fetch('http://localhost:4000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  const data = await response.json();
  
  if (data.success) {
    // Save token to localStorage
    localStorage.setItem('tetris:token', data.token);
    localStorage.setItem('tetris:user', JSON.stringify(data.user));
  }
  
  return data;
};

// Login
const login = async (email: string, password: string) => {
  const response = await fetch('http://localhost:4000/api/auth/login', {
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
};

// Verify token
const verifyToken = async () => {
  const token = localStorage.getItem('tetris:token');
  if (!token) return null;
  
  const response = await fetch('http://localhost:4000/api/auth/verify', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  return response.json();
};

// Logout
const logout = () => {
  localStorage.removeItem('tetris:token');
  localStorage.removeItem('tetris:user');
};
```

## Security Notes

⚠️ **Important:**
1. Change `JWT_SECRET` in production to a strong random string
2. Use HTTPS in production
3. Consider implementing:
   - Rate limiting for login attempts
   - Email verification
   - Password reset functionality
   - Session management with refresh tokens
   - Account lockout after failed attempts

## Testing

### Manual Testing with cURL

**Register:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'
```

**Login:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

**Verify:**
```bash
curl -X GET http://localhost:4000/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Troubleshooting

### Connection Issues
- Check PostgreSQL is running
- Verify database credentials in `.env`
- Ensure Tetris database exists: `createdb -U devuser Tetris`

### Migration Issues
- Run `npm run db:init` to create/update tables
- Check logs for SQL errors
- Verify user has CREATE privileges

### Authentication Issues
- Check token expiry (default: 7 days)
- Verify JWT_SECRET matches between registration and verification
- Clear localStorage if tokens are outdated
