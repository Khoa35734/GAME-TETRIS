# 🔧 HƯỚNG DẪN SETUP HỆ THỐNG HỘP THƯ - BƯỚC 1: DATABASE

## ⚠️ VẤN ĐỀ HIỆN TẠI
Bạn đang thấy "Không có tin nhắn nào" vì:
1. ❌ Chưa tạo bảng `messages` trong database
2. ❌ Chưa có dữ liệu test

## ✅ GIẢI PHÁP - CHẠY MIGRATION

### CÁCH 1: Dùng pgAdmin (Đơn giản nhất)

1. **Mở pgAdmin 4**
2. **Kết nối đến database `tetris`**
3. **Click chuột phải vào `tetris` → Query Tool**
4. **Copy toàn bộ nội dung file này:** `server/src/migrations/003_create_messages_table.sql`
5. **Paste vào Query Tool**
6. **Click Execute (F5) hoặc nút ▶️**
7. **Kiểm tra kết quả:** Phải thấy thông báo "Query returned successfully"

### CÁCH 2: Dùng Command Line (PowerShell)

Mở PowerShell với quyền Administrator:

```powershell
# Di chuyển đến thư mục server
cd "E:\Kì I năm 3\PBL4\Tetris\GAME-TETRIS\server"

# Chạy migration
psql -U postgres -d tetris -f "src/migrations/003_create_messages_table.sql"
```

**Nhập mật khẩu PostgreSQL** khi được yêu cầu.

### CÁCH 3: Copy SQL từ file và chạy thủ công

Nếu 2 cách trên không được, làm như sau:

1. **Mở file:** `server/src/migrations/003_create_messages_table.sql`
2. **Copy TẤT CẢ nội dung** (Ctrl+A → Ctrl+C)
3. **Mở pgAdmin hoặc psql**
4. **Paste và Execute**

---

## 🧪 SAU KHI CHẠY MIGRATION - TẠO DỮ LIỆU TEST

### CÁCH 1: Dùng pgAdmin

1. **Mở Query Tool trong database `tetris`**
2. **Copy nội dung file:** `server/sql/test-messages.sql`
3. **Paste và Execute**

### CÁCH 2: Command Line

```powershell
cd "E:\Kì I năm 3\PBL4\Tetris\GAME-TETRIS\server"
psql -U postgres -d tetris -f "sql/test-messages.sql"
```

---

## ✅ KIỂM TRA XEM ĐÃ THÀNH CÔNG CHƯA

### Trong pgAdmin hoặc psql:

```sql
-- Kiểm tra bảng messages đã tồn tại
SELECT * FROM information_schema.tables WHERE table_name = 'messages';

-- Xem có bao nhiêu tin nhắn
SELECT COUNT(*) FROM messages;

-- Xem danh sách tin nhắn
SELECT message_id, subject, message_type, is_read FROM messages;
```

**Kết quả mong đợi:**
- Bảng `messages` tồn tại ✅
- Có ít nhất 5-6 tin nhắn test ✅

---

## 🚀 SAU KHI SETUP DATABASE XONG

1. **Khởi động lại server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Truy cập Inbox:**
   ```
   http://localhost:5173/inbox
   ```

3. **Bạn sẽ thấy:**
   - 📊 Thống kê: Tổng số tin, Chưa đọc, Đánh dấu sao
   - 📧 Danh sách tin nhắn
   - 🔍 Bộ lọc: All / Unread / Starred
   - ✅ Các nút CRUD: Read, Star, Delete

---

## 📝 BẢNG MESSAGES ĐÃ CÓ ĐẦY ĐỦ CRUD

### Backend API (9 endpoints):
✅ GET `/api/messages?userId=1` - Lấy danh sách
✅ GET `/api/messages/:id` - Chi tiết
✅ POST `/api/messages` - Tạo tin mới
✅ PATCH `/api/messages/:id/read` - Đánh dấu đã đọc
✅ PATCH `/api/messages/:id/star` - Đánh dấu sao
✅ DELETE `/api/messages/:id` - Xóa (soft delete)
✅ DELETE `/api/messages/bulk/delete` - Xóa nhiều
✅ PATCH `/api/messages/bulk/read` - Đánh dấu nhiều đã đọc
✅ GET `/api/messages/stats/:userId` - Thống kê

### Frontend UI:
✅ Hiển thị danh sách tin nhắn
✅ Filter: All / Unread / Starred
✅ Bulk actions: Checkbox chọn nhiều
✅ Delete tin nhắn
✅ Mark as read khi mở tin
✅ Star/unstar
✅ Detail modal
✅ Statistics dashboard

---

## 🔍 TROUBLESHOOTING

### Lỗi: "relation messages does not exist"
➡️ **Chưa chạy migration.** Quay lại mục "CHẠY MIGRATION" ở trên.

### Lỗi: "Cannot connect to database"
➡️ **Kiểm tra PostgreSQL đang chạy chưa.** Mở Services → PostgreSQL phải có status "Running".

### Inbox vẫn hiển thị "Không có tin nhắn"
➡️ **Chưa có dữ liệu.** Chạy file `test-messages.sql` để tạo tin test.

### API trả về 500 Internal Server Error
➡️ **Kiểm tra server logs.** Có thể do:
- Bảng messages chưa có
- userId không đúng
- Server chưa khởi động

---

## 📚 FILES LIÊN QUAN

```
server/src/migrations/003_create_messages_table.sql  ⭐ Migration chính
server/sql/test-messages.sql                         ⭐ Dữ liệu test
server/src/routes/messages.ts                        ⭐ API routes
server/src/models/Message.ts                         ⭐ Sequelize model
client/src/components/Inbox.tsx                      ⭐ UI component
```

---

## 🎯 NEXT STEP

Sau khi setup database xong, bạn có thể:

1. **Tích hợp với Broadcast** - Tự động gửi tin khi tạo broadcast
2. **Hiển thị unread count** - Badge số tin chưa đọc trên nút Hộp thư
3. **Real-time notification** - Socket.IO để nhận tin real-time
4. **Admin có thể gửi tin** - Tạo form trong AdminDashboard

Chi tiết xem: `FILE MD/INBOX-SYSTEM-GUIDE.md`

---

**🔥 QUAN TRỌNG: PHẢI CHẠY MIGRATION TRƯỚC KHI TEST!**
