# 📢 BROADCAST → INBOX INTEGRATION - HOÀN THÀNH

## ✅ ĐÃ TRIỂN KHAI

### 1️⃣ **Tự động gửi tin nhắn vào hộp thư khi Admin tạo Broadcast**

**File:** `server/src/routes/broadcasts.ts`

**Chức năng:**
- Khi admin tạo broadcast mới → Tự động gửi tin nhắn vào inbox của **TẤT CẢ người chơi**
- Tin nhắn có loại: `broadcast`
- Metadata chứa thông tin: `broadcast_id`, `broadcast_type`, `priority`
- Hiển thị tên admin gửi
- Không gửi cho chính admin (tránh spam)

**SQL Query:**
```sql
INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, metadata)
SELECT 
  user_id,
  :admin_id,
  'broadcast',
  :subject,  -- '📢 [Tiêu đề broadcast]'
  :content,
  :metadata
FROM users
WHERE user_id != :admin_id
  AND is_active = TRUE
```

**Ví dụ:**
- Admin tạo broadcast "Bảo trì hệ thống"
- → Tất cả 100 người chơi nhận tin nhắn vào inbox
- → Tin có icon 📢, loại "broadcast"
- → Click vào xem nội dung chi tiết

---

### 2️⃣ **Hiển thị số tin chưa đọc trên nút Hộp thư**

**File:** `client/src/components/HomeMenu.tsx`

**Chức năng:**
- Badge đỏ hiển thị số tin chưa đọc (ví dụ: 3, 15, 99+)
- Auto-refresh mỗi 30 giây
- Pulse animation để thu hút sự chú ý
- Click vào Hộp thư → Refresh count sau 1s

**UI:**
```
📬 Hộp thư  [🔴 5]
```

**Code:**
```typescript
// State
const [unreadCount, setUnreadCount] = useState(0);

// Fetch API
const fetchUnreadCount = async () => {
  const response = await fetch(`${API_BASE}/api/messages/stats/${userId}`);
  const data = await response.json();
  setUnreadCount(parseInt(data.unread) || 0);
};

// Auto-refresh mỗi 30s
useEffect(() => {
  if (currentUser?.accountId) {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }
}, [currentUser]);
```

---

## 🎯 FLOW HOÀN CHỈNH

### Khi Admin tạo Broadcast:

```
1. Admin vào /admin/broadcast
2. Click "Tạo Thông Báo"
3. Điền: Tiêu đề, Nội dung, Loại, Độ ưu tiên
4. Click "Tạo"
   ↓
5. Backend:
   - Tạo broadcast trong bảng broadcast_messages
   - Lấy broadcast_id
   - Query tất cả users (trừ admin)
   - INSERT INTO messages cho mỗi user
   ↓
6. Tất cả người chơi:
   - Badge đỏ trên nút Hộp thư tăng lên (+1)
   - Vào /inbox → Thấy tin mới với icon 📢
   - Click vào → Xem nội dung → Đánh dấu đã đọc
   - Badge giảm xuống
```

---

## 🧪 TESTING

### Bước 1: Setup Database
```bash
# Chạy migration (nếu chưa)
psql -U postgres -d tetris -f server/src/migrations/003_create_messages_table.sql
```

### Bước 2: Tạo Test Users
```sql
-- Tạo 3 user test
INSERT INTO users (user_name, email, password) VALUES
('Player1', 'player1@test.com', '$2b$10$test'),
('Player2', 'player2@test.com', '$2b$10$test'),
('Player3', 'player3@test.com', '$2b$10$test');
```

### Bước 3: Test Flow
1. **Đăng nhập Admin**
   - Email: admin@example.com (hoặc admin của bạn)
   - Vào `/admin/broadcast`

2. **Tạo Broadcast**
   - Tiêu đề: "🎉 Event cuối tuần"
   - Nội dung: "Giảm giá 50% tất cả skin!"
   - Loại: Event
   - Độ ưu tiên: Cao
   - Click "Tạo"

3. **Kiểm tra Database**
   ```sql
   -- Xem broadcast vừa tạo
   SELECT * FROM broadcast_messages ORDER BY created_at DESC LIMIT 1;
   
   -- Đếm số tin nhắn đã gửi
   SELECT COUNT(*) FROM messages WHERE message_type = 'broadcast';
   
   -- Xem tin nhắn của Player1
   SELECT * FROM messages WHERE recipient_id = 1 ORDER BY created_at DESC;
   ```

4. **Đăng nhập Player1**
   - Vào homepage
   - Thấy badge đỏ "1" trên nút Hộp thư
   - Click vào Hộp thư
   - Thấy tin "📢 🎉 Event cuối tuần"
   - Click xem chi tiết
   - Badge biến mất (hoặc giảm xuống nếu có tin khác)

5. **Lặp lại với Player2, Player3**

---

## 📊 DATABASE SCHEMA

### Bảng `broadcast_messages`
```sql
broadcast_messages (
  message_id,
  admin_id,
  title,
  content,
  message_type (info, warning, maintenance, event),
  priority (low, medium, high),
  is_active,
  start_date, end_date,
  created_at, updated_at
)
```

### Bảng `messages`
```sql
messages (
  message_id,
  recipient_id → users.user_id,
  sender_id → users.user_id,
  message_type = 'broadcast',
  subject = '📢 [broadcast.title]',
  content = [broadcast.content],
  metadata = {
    broadcast_id: 123,
    broadcast_type: 'event',
    priority: 'high'
  },
  is_read, is_starred, is_deleted,
  created_at, read_at, deleted_at
)
```

---

## 🔧 API ENDPOINTS

### Backend
```
POST /api/broadcast              → Tạo broadcast + Gửi vào inbox
GET  /api/messages/stats/:userId → Lấy thống kê (unread count)
GET  /api/messages?userId=1      → Lấy danh sách tin
PATCH /api/messages/:id/read     → Đánh dấu đã đọc
```

### Frontend
```typescript
// Tạo broadcast
POST http://localhost:4000/api/broadcast
{
  "admin_id": 1,
  "title": "Thông báo quan trọng",
  "message": "Nội dung...",
  "type": "info",
  "priority": "high"
}

// Lấy unread count
GET http://localhost:4000/api/messages/stats/2
Response: { unread: "5", total: "10", ... }

// Lấy inbox
GET http://localhost:4000/api/messages?userId=2&filter=unread
```

---

## 🎨 UI/UX FEATURES

### Badge trên nút Hộp thư:
- **Vị trí:** Top-right corner của nút
- **Màu:** Red gradient (#f93a5a → #f7778c)
- **Animation:** Pulse 2s infinite
- **Border:** 2px solid dark background
- **Shadow:** 0 2px 8px rgba(249, 58, 90, 0.6)
- **Max:** Hiển thị "99+" nếu > 99 tin

### Inbox UI:
- **Icon broadcast:** 📢
- **Màu:** Pink (#ec4899)
- **Filter:** Có thể lọc tin broadcast
- **Badge:** "broadcast" tag với màu riêng
- **Metadata:** Hiển thị priority, type

---

## 🔮 FUTURE ENHANCEMENTS

### Phase 2:
- [ ] **Real-time notification** - Socket.IO để push tin ngay lập tức
- [ ] **Push notification** - Browser notification API
- [ ] **Email notification** - Gửi email khi có broadcast quan trọng
- [ ] **Scheduled broadcast** - Hẹn giờ gửi tin
- [ ] **Target audience** - Chọn nhóm người nhận (VIP, newbie, etc.)

### Phase 3:
- [ ] **Broadcast templates** - Mẫu tin có sẵn
- [ ] **Analytics** - Theo dõi open rate, click rate
- [ ] **A/B testing** - Test 2 version broadcast
- [ ] **Rich media** - Gửi hình ảnh, video
- [ ] **Action buttons** - "Tham gia ngay", "Xem chi tiết"

---

## 📝 CHECKLIST TRIỂN KHAI

- [x] Sửa backend `broadcasts.ts` - Tự động gửi inbox
- [x] Thêm state `unreadCount` trong HomeMenu
- [x] Tạo function `fetchUnreadCount()`
- [x] Thêm useEffect auto-refresh 30s
- [x] Cập nhật UI nút Hộp thư với badge
- [x] Thêm animation pulse cho badge
- [x] Test compile - No errors
- [x] Tạo documentation

---

## ⚠️ LƯU Ý QUAN TRỌNG

### Security:
- ✅ Chỉ admin mới tạo broadcast được (cần kiểm tra role)
- ⚠️ TODO: Thêm JWT authentication middleware
- ⚠️ TODO: Rate limiting để tránh spam

### Performance:
- ✅ INSERT nhiều messages dùng SELECT FROM users (1 query)
- ✅ Auto-refresh 30s (không quá thường xuyên)
- ⚠️ TODO: Pagination nếu có > 1000 users
- ⚠️ TODO: Queue system cho việc gửi tin (Bull, RabbitMQ)

### Database:
- ✅ Soft delete (is_deleted) giữ lại history
- ✅ Indexes trên recipient_id, is_read, created_at
- ⚠️ TODO: Cleanup job xóa tin cũ > 90 ngày

---

## 🚀 DEPLOYMENT

1. **Pull code mới nhất**
2. **Chạy migration nếu chưa:**
   ```bash
   psql -U postgres -d tetris -f server/src/migrations/003_create_messages_table.sql
   ```
3. **Restart server:**
   ```bash
   cd server
   npm run dev
   ```
4. **Restart client:**
   ```bash
   cd client
   npm run dev
   ```
5. **Test end-to-end:**
   - Admin tạo broadcast
   - Check inbox của players
   - Check badge trên HomeMenu

---

## 📚 FILES ĐÃ SỬA

```
✏️ server/src/routes/broadcasts.ts     - Thêm logic gửi inbox
✏️ client/src/components/HomeMenu.tsx  - Thêm unread count badge
✅ server/src/routes/messages.ts        - Đã có sẵn
✅ client/src/components/Inbox.tsx      - Đã có sẵn
```

---

**🎉 HOÀN THÀNH! Giờ khi Admin tạo broadcast, tất cả người chơi sẽ nhận tin trong hộp thư!** 📬✨
