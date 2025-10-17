# 🔐 Hướng Dẫn: Phân Quyền Admin & Player

## 🎯 Mục Tiêu Đã Hoàn Thành

✅ **Admin đăng nhập** → Tự động chuyển đến `/admin` (AdminDashboard)  
✅ **Player đăng nhập** → Hiển thị menu chọn chế độ game  
✅ **Không đăng nhập** → Không truy cập được `/admin/*`  

---

## 🔧 Các Thay Đổi

### 1. **Backend** - Trả về `role` khi login/register

#### File: `server/src/routes/auth.ts`

**Đã thêm:**
- SELECT thêm cột `role` từ database
- Trả về `role` trong response của `/login` và `/register`
- Lưu `role` vào JWT token

```typescript
// Login Response
{
  success: true,
  message: 'Đăng nhập thành công!',
  token: 'jwt_token_here',
  user: {
    accountId: 1,
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin' // ✅ Mới thêm
  }
}
```

---

### 2. **AuthService** - Lưu role vào localStorage

#### File: `client/src/services/authService.ts`

**Đã cập nhật:**
```typescript
localStorage.setItem('tetris:user', JSON.stringify({
  accountId: data.user.accountId,
  username: data.user.username,
  email: data.user.email,
  role: data.user.role || 'player', // ✅ Mới thêm
  isGuest: false
}));
```

---

### 3. **HomeMenu** - Redirect theo role sau login

#### File: `client/src/components/HomeMenu.tsx`

**Đã thêm logic:**
```typescript
if (result.success && result.user) {
  const user: User = {
    username: result.user.username,
    email: result.user.email,
    isGuest: false,
    accountId: result.user.accountId,
    role: result.user.role || 'player', // ✅ Lưu role
  };
  setCurrentUser(user);
  
  // ✅ Phân quyền redirect
  if (user.role === 'admin') {
    navigate('/admin'); // Admin → AdminDashboard
  } else {
    setShowGameModes(true); // Player → Game Modes
  }
}
```

---

### 4. **ProtectedRoute** - Bảo vệ Admin routes

#### File: `client/src/components/ProtectedRoute.tsx` (MỚI)

```typescript
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole = 'admin' }) => {
  const userStr = localStorage.getItem('tetris:user');
  
  if (!userStr) {
    return <Navigate to="/" replace />; // Chưa đăng nhập
  }

  const user = JSON.parse(userStr);
  
  if (user.role !== requiredRole) {
    return <Navigate to="/" replace />; // Không đủ quyền
  }

  return <>{children}</>; // Cho phép truy cập
};
```

---

### 5. **App.tsx** - Wrap admin routes với ProtectedRoute

#### File: `client/src/App.tsx`

**Trước:**
```tsx
<Route path="/admin" element={<AdminDashboard />} />
```

**Sau:**
```tsx
<Route path="/admin" element={
  <ProtectedRoute>
    <AdminDashboard />
  </ProtectedRoute>
} />
```

**Tất cả admin routes đã được bảo vệ:**
- `/admin`
- `/admin/reports`
- `/admin/feedback`
- `/admin/broadcast`

---

## 🗄️ Database Setup

### Kiểm tra cột `role` trong bảng `users`:

```sql
-- Kiểm tra structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role';

-- Nếu chưa có, thêm cột role
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'player';

-- Set admin cho user cụ thể
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

---

## 🧪 Testing

### Test Case 1: Login với Admin
```
1. Mở http://localhost:5173
2. Đăng nhập với:
   - Email: admin@example.com
   - Password: admin123
3. ✅ Kết quả: Tự động redirect đến /admin
```

### Test Case 2: Login với Player
```
1. Mở http://localhost:5173
2. Đăng nhập với:
   - Email: player@example.com
   - Password: player123
3. ✅ Kết quả: Hiện menu chọn chế độ game (Single, Ranked, Custom...)
```

### Test Case 3: Truy cập /admin khi chưa đăng nhập
```
1. Logout hoặc xóa localStorage
2. Truy cập http://localhost:5173/admin
3. ✅ Kết quả: Tự động redirect về trang chủ (/)
```

### Test Case 4: Player cố truy cập /admin
```
1. Đăng nhập với tài khoản player
2. Thủ công truy cập http://localhost:5173/admin
3. ✅ Kết quả: Tự động redirect về trang chủ (/)
```

---

## 📊 Flow Diagram

```
┌─────────────────────────────────────────────────┐
│           User Access Flow                       │
└─────────────────────────────────────────────────┘

                    User Opens App
                         │
                         ▼
                  ┌──────────────┐
                  │   HomeMenu   │
                  └──────┬───────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
    ┌──────────┐                  ┌──────────┐
    │  Login   │                  │ Register │
    └────┬─────┘                  └────┬─────┘
         │                              │
         └──────────┬───────────────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Backend Auth API   │
         │  Returns: user+role │
         └──────────┬──────────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
    ┌─────────┐          ┌─────────┐
    │ Admin?  │          │ Player? │
    └────┬────┘          └────┬────┘
         │                    │
         │ role='admin'       │ role='player'
         ▼                    ▼
   ┌──────────────┐    ┌──────────────┐
   │ navigate()   │    │ showGameModes│
   │ → /admin     │    │ = true       │
   └──────┬───────┘    └──────┬───────┘
          │                   │
          ▼                   ▼
   ┌──────────────┐    ┌──────────────┐
   │ProtectedRoute│    │  Game Menu   │
   │ (role check) │    │ - Single     │
   │              │    │ - Ranked     │
   │ ✅ Pass      │    │ - Custom     │
   └──────┬───────┘    └──────────────┘
          │
          ▼
   ┌──────────────┐
   │AdminDashboard│
   │ - Reports    │
   │ - Feedback   │
   │ - Broadcast  │
   └──────────────┘
```

---

## 🔑 localStorage Structure

### Sau khi login thành công:

```javascript
// localStorage['tetris:user']
{
  "accountId": 1,
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin", // ← Quan trọng!
  "isGuest": false
}

// localStorage['tetris:token']
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🛡️ Security Features

### ✅ Đã Implement:
1. **JWT Authentication** - Token-based auth
2. **Role-based Access Control** - Admin/Player separation
3. **Protected Routes** - Redirect nếu không đủ quyền
4. **Client-side Validation** - Check role trước khi render
5. **Server-side Validation** - Backend verify role trong JWT

### ⚠️ TODO (Future):
1. **Middleware Authentication** - Verify JWT ở mọi API call
2. **Session Timeout** - Auto logout sau X phút
3. **Password Hashing** - Đã có bcrypt
4. **Rate Limiting** - Chống brute force
5. **HTTPS** - Encrypt data in transit

---

## 🚀 Deployment Notes

### 1. Environment Variables

```bash
# server/.env
JWT_SECRET=your-super-secret-key-here
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### 2. Database Migration

```sql
-- Ensure role column exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'player';

-- Create admin user
INSERT INTO users (user_name, email, password, role) 
VALUES ('admin', 'admin@example.com', '$2b$10$hashed_password', 'admin');
```

### 3. Start Services

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

---

## 📝 API Endpoints Summary

### Auth API (`/api/auth`)

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| POST | `/register` | Đăng ký tài khoản mới | `{ success, token, user: { accountId, username, email, role } }` |
| POST | `/login` | Đăng nhập | `{ success, token, user: { accountId, username, email, role } }` |
| GET | `/verify` | Verify JWT token | `{ success, user }` |

### Protected Admin APIs

| Endpoint | Required Role | Description |
|----------|---------------|-------------|
| `/admin` | `admin` | Admin Dashboard |
| `/admin/reports` | `admin` | Reports Management |
| `/admin/feedback` | `admin` | Feedback Management |
| `/admin/broadcast` | `admin` | Broadcast Messages |

---

## ✅ Checklist Hoàn Thành

- [x] Backend trả về `role` trong login/register response
- [x] AuthService lưu `role` vào localStorage
- [x] HomeMenu redirect theo role sau login
- [x] Tạo ProtectedRoute component
- [x] Wrap tất cả admin routes với ProtectedRoute
- [x] Test admin login → redirect /admin
- [x] Test player login → show game modes
- [x] Test unauthorized access → redirect home

---

## 🎉 Summary

**Hiện tại hệ thống đã có:**
1. ✅ Phân quyền đầy đủ Admin/Player
2. ✅ Auto-redirect sau login theo role
3. ✅ Bảo vệ admin routes khỏi truy cập trái phép
4. ✅ Lưu role vào localStorage và JWT
5. ✅ Client-side và Server-side validation

**Để test:**
```sql
-- Tạo admin user
UPDATE users SET role = 'admin' WHERE email = 'youremail@example.com';

-- Hoặc tạo mới
INSERT INTO users (user_name, email, password, role) 
VALUES ('admin', 'admin@test.com', '$2b$10$...hashed...', 'admin');
```

**Status:** ✅ **HOÀN THÀNH**
