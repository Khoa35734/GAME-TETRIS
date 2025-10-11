# 👥 Hệ thống Kết Bạn - Friends System

## 📋 Tổng quan
Hệ thống kết bạn hoàn chỉnh cho phép người dùng tìm kiếm, kết bạn và quản lý danh sách bạn bè dựa trên bảng `friendships` PostgreSQL.

## 🗄️ Database Schema

### Bảng: `friendships`
```sql
CREATE TABLE friendships (
  user_id BIGINT NOT NULL REFERENCES users(user_id),
  friend_id BIGINT NOT NULL REFERENCES users(user_id),
  status friendship_status NOT NULL DEFAULT 'requested',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);
```

### Enum: `friendship_status`
- `requested` - Lời mời đã gửi
- `accepted` - Đã chấp nhận, là bạn bè
- `blocked` - Đã chặn
- `removed` - Đã xóa

## 🔧 Backend Implementation

### Model: `Friendship.ts`
- Sequelize ORM model
- Associations với User model:
  - `requester` (user_id)
  - `friend` (friend_id)

### API Routes: `/api/friends`

#### 1. **GET /api/friends** - Lấy danh sách bạn bè
```typescript
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  friends: [
    {
      userId: 1,
      username: "player1",
      email: "player1@example.com",
      createdAt: "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### 2. **GET /api/friends/requests** - Lấy lời mời kết bạn
```typescript
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  incoming: [...], // Lời mời đến
  outgoing: [...]  // Lời mời đi
}
```

#### 3. **POST /api/friends/search** - Tìm user theo ID
```typescript
Headers: Authorization: Bearer <token>
Body: { userId: 123 }
Response: {
  success: true,
  user: {
    userId: 123,
    username: "target_user",
    email: "user@example.com",
    relationshipStatus: "none" | "requested" | "accepted",
    isOutgoing: false
  }
}
```

#### 4. **POST /api/friends/request** - Gửi lời mời kết bạn
```typescript
Headers: Authorization: Bearer <token>
Body: { friendId: 123 }
Response: {
  success: true,
  message: "Đã gửi lời mời kết bạn"
}
```

#### 5. **POST /api/friends/accept** - Chấp nhận lời mời
```typescript
Headers: Authorization: Bearer <token>
Body: { friendId: 123 }
Response: {
  success: true,
  message: "Đã chấp nhận lời mời kết bạn"
}
```

#### 6. **POST /api/friends/reject** - Từ chối lời mời
```typescript
Headers: Authorization: Bearer <token>
Body: { friendId: 123 }
Response: {
  success: true,
  message: "Đã từ chối lời mời kết bạn"
}
```

#### 7. **DELETE /api/friends/:friendId** - Xóa bạn bè
```typescript
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  message: "Đã xóa bạn bè"
}
```

## 🎨 Frontend Implementation

### Service: `friendsService.ts`
Client-side API wrapper với TypeScript types:
- `getFriends()` - Lấy danh sách bạn bè
- `getFriendRequests()` - Lấy lời mời
- `searchUser(userId)` - Tìm user
- `sendFriendRequest(friendId)` - Gửi lời mời
- `acceptFriendRequest(friendId)` - Chấp nhận
- `rejectFriendRequest(friendId)` - Từ chối
- `removeFriend(friendId)` - Xóa bạn

### Component: `FriendsManager.tsx`

#### Features:
1. **3 Tabs:**
   - 👥 Bạn bè - Danh sách bạn đã kết nối
   - 📥 Lời mời - Lời mời đến/đi
   - 🔍 Tìm bạn - Tìm theo User ID

2. **Search Tab:**
   - Input User ID
   - Hiển thị kết quả với avatar & info
   - Actions:
     - ➕ Kết bạn (nếu chưa có quan hệ)
     - ⏳ Đã gửi lời mời (nếu đã gửi)
     - ✓/✕ Chấp nhận/Từ chối (nếu nhận được lời mời)
     - ✓ Đã là bạn bè (nếu đã kết bạn)

3. **Friends Tab:**
   - Danh sách tất cả bạn bè
   - Hiển thị username, email, User ID
   - Nút "✕ Xóa bạn"

4. **Requests Tab:**
   - **Lời mời đến:** Chấp nhận/Từ chối
   - **Lời mời đi:** Hiển thị trạng thái "Đang chờ"

5. **Toast Notifications:**
   - Fixed position ở đầu màn hình
   - Auto-dismiss sau 3 giây
   - 3 types: success, error, info

### UI Integration: `HomeMenu.tsx`
- Nút "👥 Bạn bè" trong top bar (màu tím)
- Full-screen modal overlay
- Smooth animations

## 🎨 Styling

### Color Scheme:
- Primary: `#4ecdc4` (Cyan/Teal)
- Success: `#4caf50` (Green)
- Danger: `#f44336` (Red)
- Friends Button: `#ba68c8` (Purple)
- Background: `rgba(0, 0, 0, 0.6)` với blur

### Components:
- Styled-components với TypeScript
- Responsive design
- Hover effects với transitions
- Glass-morphism style

## 🔐 Security

### JWT Authentication:
- Tất cả endpoints require Bearer token
- Token format: `Bearer <JWT>`
- JWT secret: `123456` (development)

### Validations:
- Không thể kết bạn với chính mình
- Check user tồn tại trước khi gửi lời mời
- Check trạng thái friendship trước khi thực hiện action
- Foreign key constraints đảm bảo data integrity

## 🧪 Testing Guide

### 1. Tạo test users:
```sql
-- Đã có sẵn trong DB
SELECT user_id, user_name FROM users;
-- Output:
-- user_id=1: admin
-- user_id=2: testuser_xxx
-- user_id=3: khoaphamby
-- user_id=4: test123
```

### 2. Test Flow:

#### A. Tìm và gửi lời mời:
1. Đăng nhập với user_id=3
2. Click "👥 Bạn bè"
3. Tab "Tìm bạn"
4. Nhập "4" (User ID của test123)
5. Click "Tìm kiếm"
6. Click "➕ Kết bạn"
7. ✅ Thông báo "Đã gửi lời mời kết bạn"

#### B. Chấp nhận lời mời:
1. Đăng nhập với user_id=4 (test123)
2. Click "👥 Bạn bè"
3. Tab "Lời mời" → Tab "📥 Lời mời đến"
4. Thấy lời mời từ khoaphamby
5. Click "✓ Chấp nhận"
6. ✅ Thông báo "Đã chấp nhận lời mời"

#### C. Xem danh sách bạn:
1. Tab "Bạn bè"
2. Thấy khoaphamby trong danh sách
3. Có thể click "✕ Xóa bạn"

### 3. Database Verification:
```sql
-- Check friendships
SELECT * FROM friendships;

-- Check với user names
SELECT 
  u1.user_name as requester,
  u2.user_name as friend,
  f.status,
  f.requested_at,
  f.accepted_at
FROM friendships f
JOIN users u1 ON f.user_id = u1.user_id
JOIN users u2 ON f.friend_id = u2.user_id;
```

## 📊 Features Summary

### ✅ Implemented:
- ✅ Tìm user theo User ID
- ✅ Gửi lời mời kết bạn
- ✅ Chấp nhận/Từ chối lời mời
- ✅ Xem danh sách bạn bè
- ✅ Xóa bạn bè
- ✅ Xem lời mời đến/đi
- ✅ Toast notifications
- ✅ Responsive UI
- ✅ JWT authentication
- ✅ Real-time status updates

### 🔮 Future Enhancements:
- 🔄 Real-time notifications với Socket.IO
- 👥 Online status indicator
- 💬 Mời bạn vào phòng chơi
- 🔍 Tìm kiếm theo username (không chỉ ID)
- 📝 Ghi chú cho bạn bè
- 🚫 Chức năng Block user
- 📊 Thống kê: số lượng bạn, tỉ lệ thắng vs bạn

## 📁 File Structure

```
server/
  src/
    models/
      Friendship.ts         ✅ Sequelize model
    routes/
      friends.ts            ✅ API endpoints
    index.ts                ✅ Routes registration

client/
  src/
    components/
      FriendsManager.tsx    ✅ UI component
      HomeMenu.tsx          ✅ Integration
    services/
      friendsService.ts     ✅ API client

FILE MD/
  FRIENDS_SYSTEM.md         ✅ Documentation
```

## 🚀 Quick Start

### Server:
```bash
cd server
npm run dev
# Server running on http://localhost:4000
```

### Client:
```bash
cd client
npm run dev
# Client running on http://localhost:5173
```

### Access:
1. Open http://localhost:5173
2. Đăng nhập
3. Click "👥 Bạn bè" ở top bar
4. Start adding friends!

## 🐛 Troubleshooting

### Lỗi "Not authenticated":
- Kiểm tra token trong localStorage: `tetris:token`
- Đăng xuất và đăng nhập lại

### Lỗi "User không tồn tại":
- Kiểm tra User ID có đúng không
- Query DB: `SELECT user_id FROM users;`

### Lỗi "Đã là bạn bè":
- Check database: `SELECT * FROM friendships WHERE user_id=X AND friend_id=Y;`
- Xóa friendship cũ nếu cần test lại

---

**Created:** 2025-10-11  
**Author:** Khoa  
**Database:** PostgreSQL `tetris`  
**Status:** ✅ Fully Implemented & Tested
