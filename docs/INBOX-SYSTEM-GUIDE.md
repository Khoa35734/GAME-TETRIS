# 📬 HỆ THỐNG HỘP THƯ (INBOX) - HƯỚNG DẪN TRIỂN KHAI

## 📋 TỔNG QUAN

Hệ thống hộp thư cá nhân cho phép mỗi người chơi nhận và quản lý tin nhắn từ:
- 🤖 **Hệ thống** (System messages)
- 💬 **Admin** (Phản hồi feedback, thông báo)
- 👥 **Bạn bè** (Lời mời kết bạn)
- 🎮 **Game** (Lời mời chơi)
- 📢 **Broadcast** (Thông báo chung)
- ✉️ **Người chơi khác** (Tin nhắn trực tiếp)

---

## 🗄️ DATABASE

### 1️⃣ Migration File
**File:** `server/src/migrations/003_create_messages_table.sql`

### 2️⃣ Bảng `messages`

```sql
CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    recipient_id INTEGER NOT NULL,           -- Người nhận (FK users.user_id)
    sender_id INTEGER,                       -- Người gửi (NULL = hệ thống)
    message_type VARCHAR(30) DEFAULT 'system',
    subject VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    metadata JSONB,                          -- Dữ liệu bổ sung
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP,
    deleted_at TIMESTAMP,
    
    FOREIGN KEY (recipient_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE SET NULL
);
```

### 3️⃣ Các loại tin nhắn (message_type)

| Loại | Mô tả | Ví dụ |
|------|-------|-------|
| `system` | Tin nhắn hệ thống | Chào mừng user mới |
| `admin_reply` | Admin phản hồi feedback | "Admin đã trả lời feedback của bạn" |
| `friend_request` | Lời mời kết bạn | "User123 muốn kết bạn với bạn" |
| `game_invite` | Lời mời chơi game | "User456 mời bạn vào phòng" |
| `broadcast` | Thông báo broadcast | Sao chép nội dung từ bảng broadcasts |
| `player_message` | Tin nhắn từ người chơi | Chat trực tiếp |

### 4️⃣ Triggers tự động

#### 🎉 Tin nhắn chào mừng user mới
```sql
CREATE TRIGGER trigger_welcome_message
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_welcome_message();
```
- **Khi nào chạy:** Mỗi khi có user mới đăng ký
- **Làm gì:** Tự động tạo tin nhắn chào mừng vào inbox

#### 💬 Thông báo admin reply feedback
```sql
CREATE TRIGGER trigger_feedback_reply_notification
    AFTER UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION send_feedback_reply_notification();
```
- **Khi nào chạy:** Admin cập nhật `admin_response` trong bảng feedback
- **Làm gì:** Tự động gửi tin nhắn vào inbox của user báo có phản hồi

### 5️⃣ Chạy Migration

```bash
# Kết nối PostgreSQL
psql -U postgres -d tetris

# Chạy file SQL
\i server/src/migrations/003_create_messages_table.sql

# Hoặc dùng command
psql -U postgres -d tetris -f server/src/migrations/003_create_messages_table.sql
```

---

## 🔧 BACKEND

### 1️⃣ Model Sequelize
**File:** `server/src/models/Message.ts`

```typescript
interface MessageAttributes {
  message_id: number;
  recipient_id: number;
  sender_id: number | null;
  message_type: 'system' | 'admin_reply' | 'friend_request' | 'game_invite' | 'broadcast' | 'player_message';
  subject: string;
  content: string;
  is_read: boolean;
  is_starred: boolean;
  is_deleted: boolean;
  metadata?: Record<string, any>;
  created_at: Date;
  read_at?: Date;
  deleted_at?: Date;
}
```

### 2️⃣ API Routes
**File:** `server/src/routes/messages.ts`

#### 📥 GET `/api/messages` - Lấy danh sách tin nhắn
```typescript
// Query params:
// - userId: ID của người nhận (required)
// - filter: 'all' | 'unread' | 'starred' (optional)

GET /api/messages?userId=1&filter=unread

// Response:
{
  "messages": [
    {
      "message_id": 1,
      "subject": "Chào mừng!",
      "content": "...",
      "is_read": false,
      "sender_name": "Hệ thống",
      ...
    }
  ],
  "unreadCount": 5
}
```

#### 📄 GET `/api/messages/:id` - Chi tiết 1 tin nhắn
```typescript
GET /api/messages/1

// Response: Message object với đầy đủ thông tin
```

#### ✉️ POST `/api/messages` - Tạo tin nhắn mới
```typescript
POST /api/messages
Content-Type: application/json

{
  "recipient_id": 2,
  "sender_id": 1,              // null nếu từ hệ thống
  "message_type": "player_message",
  "subject": "Hello!",
  "content": "Xin chào bạn!",
  "metadata": {                // Optional
    "game_id": 123
  }
}
```

#### ✅ PATCH `/api/messages/:id/read` - Đánh dấu đã đọc
```typescript
PATCH /api/messages/1/read

// Sets is_read = true, read_at = NOW()
```

#### ⭐ PATCH `/api/messages/:id/star` - Đánh dấu sao
```typescript
PATCH /api/messages/1/star
Content-Type: application/json

{
  "starred": true  // hoặc false
}
```

#### 🗑️ DELETE `/api/messages/:id` - Xóa tin nhắn (soft delete)
```typescript
DELETE /api/messages/1

// Sets is_deleted = true, deleted_at = NOW()
```

#### 📊 GET `/api/messages/stats/:userId` - Thống kê
```typescript
GET /api/messages/stats/1

// Response:
{
  "total": "10",
  "unread": "3",
  "starred": "2",
  "system": "5",
  "admin_reply": "2",
  "player_message": "3"
}
```

#### 🗑️ DELETE `/api/messages/bulk/delete` - Xóa nhiều tin
```typescript
DELETE /api/messages/bulk/delete
Content-Type: application/json

{
  "messageIds": [1, 2, 3, 4]
}
```

#### ✅ PATCH `/api/messages/bulk/read` - Đánh dấu nhiều tin đã đọc
```typescript
PATCH /api/messages/bulk/read
Content-Type: application/json

{
  "messageIds": [1, 2, 3, 4]
}
```

### 3️⃣ Đăng ký Routes trong Server
**File:** `server/src/index.ts`

```typescript
import messagesRouter from './routes/messages';

app.use('/api/messages', messagesRouter);
```

---

## 🎨 FRONTEND

### 1️⃣ Component Inbox
**File:** `client/src/components/Inbox.tsx`

Giao diện chính hiển thị:
- 📊 **Thống kê**: Tổng số tin, chưa đọc, đánh dấu sao, theo loại
- 🔍 **Bộ lọc**: Tất cả / Chưa đọc / Đánh dấu sao
- ☑️ **Bulk actions**: Chọn nhiều tin để xóa hoặc đánh dấu đã đọc
- 📧 **Danh sách tin nhắn**: Table với checkbox, star, loại, người gửi, tiêu đề, ngày
- 👁️ **Modal chi tiết**: Xem nội dung đầy đủ của tin nhắn

### 2️⃣ Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| **Filters** | Lọc theo: Tất cả, Chưa đọc, Đánh dấu sao |
| **Read Status** | Tin chưa đọc có background màu tím nhạt, chữ đậm |
| **Star/Unstar** | Click vào ⭐ để đánh dấu quan trọng |
| **Open Message** | Click vào tin nhắn → Mở modal → Tự động mark as read |
| **Delete** | Xóa từng tin hoặc xóa nhiều tin cùng lúc |
| **Bulk Actions** | Checkbox để chọn nhiều → Đánh dấu đã đọc / Xóa |
| **Auto Refresh** | Có thể thêm setInterval để tự động load tin mới |
| **Message Types** | Mỗi loại có icon và màu riêng (system 🔵, admin 🟢, player 🟣) |

### 3️⃣ Routes
**File:** `client/src/App.tsx`

```typescript
import Inbox from './components/Inbox';

<Route path="/inbox" element={<Inbox />} />
```

### 4️⃣ Truy cập Inbox

```
http://localhost:5173/inbox
```

Hoặc thêm button vào HomeMenu:
```tsx
<Link to="/inbox">📬 Hộp thư ({unreadCount})</Link>
```

---

## 🧪 TESTING

### 1️⃣ Tạo tin nhắn test

```sql
-- Tin nhắn hệ thống
INSERT INTO messages (recipient_id, sender_id, message_type, subject, content)
VALUES (1, NULL, 'system', '🎮 Chào mừng đến Tetris!', 'Chúc bạn chơi game vui vẻ!');

-- Tin nhắn từ admin
INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, metadata)
VALUES (1, NULL, 'admin_reply', '💬 Admin đã phản hồi', 'Cảm ơn bạn đã gửi feedback!', '{"feedback_id": 5}');

-- Tin nhắn từ người chơi
INSERT INTO messages (recipient_id, sender_id, message_type, subject, content)
VALUES (1, 2, 'player_message', '✉️ Tin nhắn từ User123', 'Chơi game với mình không?');
```

### 2️⃣ Test API với curl/Postman

```bash
# 1. Lấy danh sách tin nhắn
curl http://localhost:4000/api/messages?userId=1

# 2. Lấy chi tiết tin nhắn
curl http://localhost:4000/api/messages/1

# 3. Đánh dấu đã đọc
curl -X PATCH http://localhost:4000/api/messages/1/read

# 4. Đánh dấu sao
curl -X PATCH http://localhost:4000/api/messages/1/star \
  -H "Content-Type: application/json" \
  -d '{"starred": true}'

# 5. Tạo tin nhắn mới
curl -X POST http://localhost:4000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": 2,
    "sender_id": 1,
    "message_type": "player_message",
    "subject": "Test Message",
    "content": "Hello!"
  }'

# 6. Xóa tin nhắn
curl -X DELETE http://localhost:4000/api/messages/1

# 7. Thống kê
curl http://localhost:4000/api/messages/stats/1
```

### 3️⃣ Test trên Frontend

1. Đăng nhập vào game
2. Truy cập `/inbox`
3. Kiểm tra:
   - ✅ Hiển thị danh sách tin nhắn
   - ✅ Thống kê chính xác
   - ✅ Filter hoạt động (all, unread, starred)
   - ✅ Click tin nhắn → Mở modal → Đánh dấu đã đọc
   - ✅ Star/unstar hoạt động
   - ✅ Xóa tin nhắn hoạt động
   - ✅ Bulk delete và bulk mark as read

---

## 🔗 TÍCH HỢP VỚI HỆ THỐNG CÓ SẴN

### 1️⃣ Tự động gửi tin khi admin reply feedback

**Đã có trigger trong database!** Không cần code thêm.

Khi admin cập nhật feedback:
```sql
UPDATE feedback 
SET admin_response = 'Cảm ơn bạn đã góp ý!'
WHERE feedback_id = 5;
```

→ Trigger tự động tạo tin nhắn vào inbox của user.

### 2️⃣ Gửi tin khi có broadcast mới

**Thêm vào:** `server/src/routes/broadcasts.ts`

```typescript
// Sau khi tạo broadcast mới
const result = await sequelize.query(
  `INSERT INTO broadcasts (...) VALUES (...) RETURNING *`,
  { type: QueryTypes.INSERT }
);

const broadcast = result[0][0];

// Gửi tin nhắn cho TẤT CẢ users
await sequelize.query(
  `INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, metadata)
   SELECT 
     user_id,
     :adminId,
     'broadcast',
     :subject,
     :content,
     :metadata
   FROM users
   WHERE is_active = TRUE`,
  {
    replacements: {
      adminId: broadcast.admin_id,
      subject: '📢 ' + broadcast.title,
      content: broadcast.message,
      metadata: JSON.stringify({ broadcast_id: broadcast.id })
    },
    type: QueryTypes.INSERT
  }
);
```

### 3️⃣ Hiển thị số tin chưa đọc trên HomeMenu

**File:** `client/src/components/HomeMenu.tsx`

```typescript
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  if (currentUser?.accountId) {
    fetchUnreadCount();
  }
}, [currentUser]);

const fetchUnreadCount = async () => {
  try {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const response = await fetch(`${API_BASE}/api/messages/stats/${currentUser.accountId}`);
    const data = await response.json();
    setUnreadCount(parseInt(data.unread));
  } catch (err) {
    console.error('Failed to fetch unread count:', err);
  }
};

// Trong UI
<Link to="/inbox">
  📬 Hộp thư {unreadCount > 0 && `(${unreadCount})`}
</Link>
```

---

## 📝 CÁC TRƯỜNG HỢP SỬ DỤNG

### 1. Tin nhắn hệ thống tự động

```sql
-- Chúc mừng sinh nhật
INSERT INTO messages (recipient_id, message_type, subject, content)
SELECT user_id, 'system', '🎂 Chúc mừng sinh nhật!', 'Chúc bạn một ngày sinh nhật vui vẻ!'
FROM users
WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(DAY FROM created_at) = EXTRACT(DAY FROM CURRENT_DATE);

-- Nhắc nhở user không hoạt động
INSERT INTO messages (recipient_id, message_type, subject, content)
SELECT user_id, 'system', '😴 Bạn đã lâu không chơi', 'Quay lại chơi game với chúng tôi nhé!'
FROM users
WHERE last_login < NOW() - INTERVAL '30 days';
```

### 2. Thông báo báo cáo được giải quyết

**File:** `server/src/routes/reports.ts`

```typescript
// Khi admin resolve report
await sequelize.query(
  `UPDATE user_reports 
   SET status = 'resolved', resolved_at = NOW(), resolved_by = :adminId
   WHERE report_id = :reportId`,
  { replacements: { reportId, adminId }, type: QueryTypes.UPDATE }
);

// Gửi tin nhắn cho người báo cáo
await sequelize.query(
  `INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, metadata)
   VALUES (:reporterId, :adminId, 'admin_reply', 
           '✅ Báo cáo của bạn đã được xử lý',
           'Cảm ơn bạn đã báo cáo. Chúng tôi đã xem xét và xử lý.',
           :metadata)`,
  {
    replacements: {
      reporterId: report.reporter_id,
      adminId,
      metadata: JSON.stringify({ report_id: reportId })
    },
    type: QueryTypes.INSERT
  }
);
```

### 3. Lời mời kết bạn

```typescript
// Khi user A gửi lời mời kết bạn cho user B
await sequelize.query(
  `INSERT INTO messages (recipient_id, sender_id, message_type, subject, content, metadata)
   VALUES (:recipientId, :senderId, 'friend_request',
           '👥 Lời mời kết bạn',
           :content,
           :metadata)`,
  {
    replacements: {
      recipientId: userB_id,
      senderId: userA_id,
      content: `${userA_name} muốn kết bạn với bạn`,
      metadata: JSON.stringify({ 
        friend_request_id: friendRequestId,
        action_url: `/friends/accept/${friendRequestId}`
      })
    },
    type: QueryTypes.INSERT
  }
);
```

---

## 🎯 ROADMAP / TÍNH NĂNG TƯƠNG LAI

### Phase 2
- [ ] **Real-time notifications** với Socket.IO
- [ ] **Push notifications** trên browser
- [ ] **Email notifications** cho tin quan trọng
- [ ] **Message attachments** (hình ảnh, file)
- [ ] **Reply messages** (trả lời tin nhắn)
- [ ] **Message templates** cho admin

### Phase 3
- [ ] **Folders/Labels** phân loại tin nhắn
- [ ] **Search** tìm kiếm tin nhắn
- [ ] **Archive** lưu trữ tin cũ
- [ ] **Export** xuất tin nhắn ra file
- [ ] **Block users** chặn người gửi spam

---

## ⚠️ LƯU Ý QUAN TRỌNG

### 1. Security
- ✅ **Phải kiểm tra quyền truy cập:** User chỉ được xem tin nhắn của mình
- ✅ **Validate userId:** Không cho phép xem tin nhắn của người khác
- ⚠️ **Thêm JWT authentication** vào các API routes

### 2. Performance
- ✅ Đã có **indexes** trên các cột thường query (recipient_id, is_read, created_at)
- ✅ **Soft delete** để không mất dữ liệu
- ⚠️ **Pagination:** Nên thêm limit/offset khi có nhiều tin nhắn

### 3. Database Cleanup
```sql
-- Xóa vĩnh viễn tin đã deleted > 30 ngày
DELETE FROM messages 
WHERE is_deleted = TRUE 
  AND deleted_at < NOW() - INTERVAL '30 days';

-- Chạy định kỳ bằng cron job
```

---

## 📚 FILES CREATED

```
✅ server/src/migrations/003_create_messages_table.sql
✅ server/src/models/Message.ts
✅ server/src/routes/messages.ts
✅ server/src/index.ts (updated - added messages routes)
✅ client/src/components/Inbox.tsx
✅ client/src/App.tsx (updated - added /inbox route)
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Run migration SQL on production database
- [ ] Test all API endpoints on staging
- [ ] Test frontend inbox on staging
- [ ] Add JWT authentication middleware to messages routes
- [ ] Add rate limiting to prevent spam
- [ ] Setup database backup schedule
- [ ] Add monitoring/logging for message creation
- [ ] Document API in Swagger/Postman collection
- [ ] Train admins on using broadcast → inbox integration
- [ ] Setup automated cleanup job for old deleted messages

---

**🎉 HỆ THỐNG HỘP THƯ ĐÃ HOÀN THÀNH!**

Giờ mỗi người chơi đều có hộp thư riêng để nhận tin nhắn từ hệ thống, admin, và người chơi khác. 📬✨
