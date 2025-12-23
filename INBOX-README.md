# 📬 HỆ THỐNG HỘP THƯ - HƯỚNG DẪN NHANH

## 🎯 GIỚI THIỆU

Mỗi người chơi có **1 hộp thư riêng** để nhận:
- 🤖 Tin nhắn hệ thống
- 💬 Phản hồi từ admin  
- 📢 Thông báo broadcast
- 👥 Lời mời kết bạn
- 🎮 Lời mời chơi game
- ✉️ Tin nhắn từ người chơi khác

---

## ⚡ QUICK START

### 1️⃣ Cài đặt Database
```bash
psql -U postgres -d tetris -f server/src/migrations/003_create_messages_table.sql
psql -U postgres -d tetris -f server/sql/test-messages.sql
```

### 2️⃣ Kiểm tra Backend
```bash
# Server đã tự động load messagesRouter
curl http://localhost:4000/api/messages?userId=1
```

### 3️⃣ Truy cập Frontend
```
http://localhost:5173/inbox
```

---

## 📂 FILES ĐÃ TẠO

### Database
- `server/src/migrations/003_create_messages_table.sql` ⭐ **Main migration**
- `server/sql/test-messages.sql` - Dữ liệu test

### Backend
- `server/src/models/Message.ts` - Sequelize model
- `server/src/routes/messages.ts` ⭐ **9 API endpoints**
- `server/src/index.ts` - ✏️ Updated

### Frontend  
- `client/src/components/Inbox.tsx` ⭐ **UI component**
- `client/src/App.tsx` - ✏️ Updated

### Docs
- `FILE MD/INBOX-SYSTEM-GUIDE.md` - Chi tiết 400+ dòng
- `FILE MD/INBOX-IMPLEMENTATION-SUMMARY.md` - Tổng kết

---

## 🔧 API ENDPOINTS

```
GET    /api/messages?userId=1&filter=all   # Danh sách tin
GET    /api/messages/:id                   # Chi tiết
POST   /api/messages                       # Tạo mới
PATCH  /api/messages/:id/read              # Đánh dấu đã đọc
PATCH  /api/messages/:id/star              # Đánh dấu sao
DELETE /api/messages/:id                   # Xóa
DELETE /api/messages/bulk/delete           # Xóa nhiều
PATCH  /api/messages/bulk/read             # Đánh dấu nhiều đã đọc
GET    /api/messages/stats/:userId         # Thống kê
```

---

## 🎨 FEATURES

- ✅ Filter: All / Unread / Starred
- ✅ Bulk actions: Select nhiều → Delete / Mark as Read
- ✅ Auto mark as read khi mở tin
- ✅ Star/unstar messages
- ✅ Soft delete (không mất dữ liệu)
- ✅ Statistics dashboard
- ✅ Auto-send khi admin reply feedback (trigger)
- ✅ Auto welcome message cho user mới (trigger)

---

## 📊 DATABASE SCHEMA

```sql
messages (
  message_id,
  recipient_id → users.user_id,
  sender_id → users.user_id (NULL = hệ thống),
  message_type (system, admin_reply, friend_request, ...),
  subject,
  content,
  is_read,
  is_starred,
  is_deleted,
  metadata (JSONB),
  created_at, read_at, deleted_at
)
```

---

## 🚀 NEXT STEPS

### Tích hợp với Broadcast
**File:** `server/src/routes/broadcasts.ts`

```typescript
// Sau khi tạo broadcast mới
await sequelize.query(
  `INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, metadata)
   SELECT user_id, :adminId, 'broadcast', :subject, :content, :metadata
   FROM users WHERE is_active = TRUE`,
  { replacements: { adminId, subject, content, metadata } }
);
```

### Hiển thị Unread Count
**File:** `client/src/components/HomeMenu.tsx`

```typescript
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  fetch(`/api/messages/stats/${userId}`)
    .then(res => res.json())
    .then(data => setUnreadCount(parseInt(data.unread)));
}, [userId]);

// UI
<Link to="/inbox">📬 Hộp thư ({unreadCount})</Link>
```

---

## 📚 XEM THÊM

- Chi tiết: `FILE MD/INBOX-SYSTEM-GUIDE.md`
- Summary: `FILE MD/INBOX-IMPLEMENTATION-SUMMARY.md`

---

**✅ HOÀN THÀNH! Giờ mỗi người chơi đều có hộp thư riêng!** 📬
