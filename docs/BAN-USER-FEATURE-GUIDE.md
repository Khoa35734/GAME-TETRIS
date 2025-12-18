# 🚫 Hướng Dẫn Test Chức Năng Ban User

## Tổng Quan
Chức năng ban user cho phép admin khóa tài khoản người chơi vi phạm với các tùy chọn:
- Ban có thời hạn (số ngày)
- Ban vĩnh viễn
- Tự động unban khi hết hạn
- Hiển thị thông tin ban chi tiết khi đăng nhập

## Các Tính Năng Đã Implement

### Backend (Server)
1. **Route `/api/reports/:id/ban`** (POST)
   - Ban user dựa trên report
   - Ghi vào bảng `ban_history`
   - Cập nhật `is_banned = true` trong bảng `users`
   - Tự động resolve report

2. **Route `/api/reports/unban/:userId`** (POST)
   - Unban user
   - Deactivate tất cả ban history
   - Cập nhật `is_banned = false`

3. **Route `/api/reports/ban-history/:userId`** (GET)
   - Xem lịch sử ban của user

4. **Route `/api/admin/banned-users`** (GET)
   - Lấy danh sách tất cả user đang bị ban

5. **Authentication Check**
   - Kiểm tra ban status khi đăng nhập
   - Tự động unban nếu ban đã hết hạn
   - Trả về thông tin chi tiết về ban

6. **Cron Job**
   - Tự động check và unban user hết hạn mỗi giờ

### Frontend (Client)
1. **ReportsManagement Component**
   - Nút "Ban User" trong modal chi tiết report
   - Prompt nhập lý do và số ngày ban
   - Hiển thị confirmation trước khi ban

2. **BannedUsersManagement Component**
   - Danh sách user đang bị ban
   - Xem lịch sử ban
   - Nút unban

3. **Login Screen**
   - Hiển thị thông báo ban chi tiết với format đẹp
   - Bao gồm: lý do, admin, thời gian, số ngày còn lại

## Cách Test

### 1. Ban User Từ Report

**Bước 1:** Đăng nhập với tài khoản admin
```
Email: admin@example.com
Password: admin123
```

**Bước 2:** Vào trang "Reports Management"
- Chọn một report về user vi phạm
- Click "Chi tiết"

**Bước 3:** Click nút "🚫 Ban User"
- Nhập lý do: "Vi phạm quy định game"
- Nhập số ngày: `7` (để trống = vĩnh viễn)
- Confirm

**Kỳ vọng:**
- ✅ Hiển thị thông báo thành công
- ✅ Report status chuyển thành "resolved"
- ✅ User không đăng nhập được

### 2. Test Đăng Nhập Với Tài Khoản Bị Ban

**Bước 1:** Logout khỏi admin account

**Bước 2:** Cố gắng đăng nhập với tài khoản bị ban
```
Email: (email của user vừa bị ban)
Password: (password của user)
```

**Kỳ vọng:**
Hiển thị error message với format:
```
🚫 TÀI KHOẢN ĐÃ BỊ KHÓA

📝 Lý do: Vi phạm quy định game
👮 Bởi: Admin
📅 Thời gian ban: 15/11/2025 10:30:00
⏰ Hết hạn: 22/11/2025 10:30:00
⏱️ Còn lại: 7 ngày
```

### 3. Quản Lý Banned Users

**Bước 1:** Đăng nhập admin

**Bước 2:** Vào trang "Banned Users Management"

**Kỳ vọng:**
- ✅ Hiển thị danh sách user đang bị ban
- ✅ Thông tin: username, admin ban, lý do, thời gian, còn lại
- ✅ Có nút "Lịch Sử" và "Unban"

**Bước 3:** Click "📜 Lịch Sử"
- Xem tất cả lần bị ban của user (active/inactive)

**Bước 4:** Click "✅ Unban"
- Confirm unban
- User có thể đăng nhập lại

### 4. Test Auto-Unban

**Bước 1:** Ban một user với thời hạn ngắn (1 ngày)

**Bước 2:** Đợi cron job chạy (mỗi giờ) hoặc restart server

**Bước 3:** Cố đăng nhập sau khi ban hết hạn

**Kỳ vọng:**
- ✅ User có thể đăng nhập bình thường
- ✅ `is_banned` tự động chuyển về `false`
- ✅ Ban history được mark `is_active = false`

### 5. Test Ban Vĩnh Viễn

**Bước 1:** Ban user không nhập số ngày (để trống)

**Bước 2:** Cố đăng nhập

**Kỳ vọng:**
```
🚫 TÀI KHOẢN ĐÃ BỊ KHÓA

📝 Lý do: [lý do]
👮 Bởi: Admin
📅 Thời gian ban: [timestamp]
⏰ Thời hạn: VĨnh VIỄN
```

## Database Tables

### `ban_history`
```sql
ban_id          BIGSERIAL PRIMARY KEY
user_id         BIGINT NOT NULL
admin_id        BIGINT NOT NULL
reason          TEXT NOT NULL
ban_start       TIMESTAMP WITH TIME ZONE
ban_end         TIMESTAMP WITH TIME ZONE (null = permanent)
is_active       BOOLEAN (true = đang ban)
created_at      TIMESTAMP WITH TIME ZONE
```

### `users`
```sql
is_banned       BOOLEAN (true = bị ban)
```

## API Endpoints

### Ban User
```http
POST /api/reports/:reportId/ban
Content-Type: application/json

{
  "admin_id": 1,
  "reason": "Vi phạm quy định",
  "ban_duration": 7  // days, null = permanent
}
```

### Unban User
```http
POST /api/reports/unban/:userId
Content-Type: application/json

{
  "admin_id": 1
}
```

### Get Ban History
```http
GET /api/reports/ban-history/:userId
```

### Get All Banned Users
```http
GET /api/admin/banned-users
```

## Troubleshooting

### User vẫn đăng nhập được sau khi ban
- Kiểm tra `is_banned` trong database: `SELECT is_banned FROM users WHERE user_id = ?`
- Kiểm tra ban_history: `SELECT * FROM ban_history WHERE user_id = ? AND is_active = true`
- Restart server để đảm bảo code mới được load

### Thông báo ban không hiển thị đúng format
- Kiểm tra console browser để xem response từ server
- Verify rằng `banned: true` và `banInfo` có trong response

### Auto-unban không hoạt động
- Kiểm tra logs: `[BanJob] Checking for expired bans...`
- Cron job chạy mỗi giờ, có thể cần đợi hoặc restart server
- Check logic trong `checkExpiredBans.ts`

## Notes

- Admin ID hiện tại đang hardcode là `1`, cần lấy từ auth context thực tế
- Ban duration tính theo số ngày (integer)
- Ban end date được tính tự động: `ban_start + ban_duration days`
- Nếu user login khi ban hết hạn, server tự động unban ngay lập tức
