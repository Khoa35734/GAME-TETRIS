# 🚀 HƯỚNG DẪN CHẠY MIGRATION - SETTINGS DATABASE

## ✅ TỔNG QUAN

Migration này cập nhật hệ thống settings để **TẤT CẢ THAY ĐỔI ĐỀU LƯU VÀO DATABASE**.

**Thay đổi chính:**
- Cập nhật default values: DAS 150ms, ARR 30ms, Soft Drop 60ms
- Tạo trigger tự động tạo settings khi user đăng ký
- Đảm bảo mỗi user có settings riêng (không dùng localStorage)

---

## 📋 BƯỚC 1: BACKUP DATABASE (BẮT BUỘC)

```powershell
# PowerShell - Backup trước khi migrate
cd "e:\Kì I năm 3\PBL4\Tetris\GAME-TETRIS\server"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$env:PGPASSWORD="yourpassword"
pg_dump -U postgres -d tetris -f "backups/tetris_backup_$timestamp.sql"

Write-Host "✅ Backup created: backups/tetris_backup_$timestamp.sql"
```

---

## 📋 BƯỚC 2: CHẠY MIGRATION

### **Option A: PowerShell (Khuyến nghị)**

```powershell
cd "e:\Kì I năm 3\PBL4\Tetris\GAME-TETRIS\server"

# Set password
$env:PGPASSWORD="yourpassword"

# Run migration
psql -U postgres -d tetris -f "src/migrations/004_update_users_settings_defaults.sql"
```

### **Option B: psql interactive**

```bash
# Mở psql
psql -U postgres -d tetris

-- Chạy migration
\i 'e:/Kì I năm 3/PBL4/Tetris/GAME-TETRIS/server/src/migrations/004_update_users_settings_defaults.sql'

-- Thoát
\q
```

### **Kết quả mong đợi:**

```
ALTER TABLE
UPDATE X  (X = số users có settings cũ)
UPDATE X  (X = số users có key_bindings NULL)
CREATE FUNCTION
DROP TRIGGER
CREATE TRIGGER
NOTICE:  ✅ Migration 004 completed successfully!
NOTICE:  Updated default values:
NOTICE:    - das_delay_ms: 150ms
NOTICE:    - arr_ms: 30ms
NOTICE:    - soft_drop_rate: 60ms
NOTICE:    - sound_volume: 1.00
NOTICE:    - music_volume: 0.60
NOTICE:  
NOTICE:  Total users with settings: X
NOTICE:  Total users without settings: 0

 info              | total_settings | with_key_bindings | avg_das_delay | ...
-------------------+----------------+-------------------+---------------+-----
 Settings Summary  | X              | X                 | 150.00        | ...
```

---

## 📋 BƯỚC 3: VERIFY MIGRATION

```powershell
# Chạy test script
$env:PGPASSWORD="yourpassword"
psql -U postgres -d tetris -f "sql/test-settings-persistence.sql"
```

### **Kết quả mong đợi:**

```
✅ Created test user with ID: XXX
✅ Trigger worked! Settings auto-created for user XXX
🧹 Cleaned up test user

Testing update for user_id: XXX
Old das_delay_ms: 150
✅ Update successful! New value: 999
🔄 Restored old value: 150

✅ TEST COMPLETE
```

---

## 📋 BƯỚC 4: RESTART SERVER

```powershell
# Stop server (Ctrl+C nếu đang chạy)

# Rebuild TypeScript
cd "e:\Kì I năm 3\PBL4\Tetris\GAME-TETRIS\server"
npm run build

# Start server
npm run dev
```

Kiểm tra log:

```
[postgres] ✅ Connected to PostgreSQL
[Server] 🚀 Server running on http://0.0.0.0:4000
```

---

## 📋 BƯỚC 5: TEST TRÊN UI

### **Test Case 1: Load Settings**

1. Mở browser → http://localhost:5173
2. Đăng nhập
3. Click nút ⚙️ **Cài đặt**
4. **Kiểm tra:** Các giá trị hiển thị đúng từ database

### **Test Case 2: Update Settings**

1. Thay đổi DAS Delay: 150 → 200
2. Click **💾 Lưu**
3. Thấy message: "✅ Đã lưu cài đặt thành công!"
4. **Verify trong database:**
   ```sql
   SELECT das_delay_ms FROM users_settings WHERE user_id = YOUR_USER_ID;
   -- Kết quả: 200
   ```

### **Test Case 3: Persistence**

1. Đăng xuất
2. Đăng nhập lại
3. Vào Settings
4. **Kiểm tra:** DAS Delay vẫn là 200 (không phải 150)

### **Test Case 4: Reset**

1. Click **⚠️ Reset mặc định**
2. Confirm
3. **Kiểm tra:** Tất cả giá trị về default (150, 30, 60, ...)
4. **Verify database:**
   ```sql
   SELECT das_delay_ms, arr_ms FROM users_settings WHERE user_id = YOUR_USER_ID;
   -- Kết quả: 150, 30
   ```

---

## 🧪 QUERIES KIỂM TRA

### **1. Xem settings của tất cả users**

```sql
SELECT 
  u.user_id,
  u.user_name,
  s.das_delay_ms,
  s.arr_ms,
  s.soft_drop_rate,
  s.sound_volume,
  s.music_volume
FROM users u
JOIN users_settings s ON u.user_id = s.user_id
ORDER BY u.user_id;
```

### **2. Kiểm tra user nào chưa có settings**

```sql
SELECT COUNT(*) as users_without_settings
FROM users u
WHERE u.user_id NOT IN (SELECT user_id FROM users_settings);
```

Kết quả mong đợi: **0** (trigger đã tạo cho tất cả)

### **3. Kiểm tra trigger hoạt động**

```sql
-- Tạo user test
INSERT INTO users (user_name, email, password_hash, role)
VALUES ('test_trigger', 'trigger@test.com', 'hash', 'player')
RETURNING user_id;

-- Kiểm tra settings tự động tạo (thay XXX = user_id vừa tạo)
SELECT * FROM users_settings WHERE user_id = XXX;

-- Cleanup
DELETE FROM users WHERE user_name = 'test_trigger';
```

### **4. Xem key bindings**

```sql
SELECT 
  user_id,
  key_bindings
FROM users_settings
LIMIT 5;
```

---

## ⚠️ TROUBLESHOOTING

### **Lỗi: "permission denied"**

```powershell
# Chạy PowerShell as Administrator
# Hoặc kiểm tra quyền user postgres
```

### **Lỗi: "relation users_settings does not exist"**

```sql
-- Kiểm tra bảng tồn tại
\dt users_settings

-- Nếu không có, chạy migration trước đó:
\i 'server/src/migrations/001_create_users_table.sql'
\i 'server/src/migrations/002_create_users_settings_table.sql'
```

### **Lỗi: "trigger already exists"**

```sql
-- Drop trigger cũ
DROP TRIGGER IF EXISTS trigger_create_user_settings ON users;

-- Chạy lại migration
```

### **Settings không lưu vào database**

**Kiểm tra:**

1. **Backend log có lỗi không?**
   ```
   [settings] PUT error: ...
   ```

2. **Network tab trong browser:**
   - Request: PUT /api/settings
   - Status: 200 OK?
   - Response: { success: true }?

3. **Database log:**
   ```sql
   -- Enable query logging
   ALTER DATABASE tetris SET log_statement = 'all';
   
   -- Xem log
   SELECT * FROM pg_stat_activity WHERE datname = 'tetris';
   ```

4. **Token hợp lệ không?**
   ```javascript
   // Frontend console
   localStorage.getItem('tetris:token')
   ```

---

## 📊 EXPECTED RESULTS

| Item | Before Migration | After Migration |
|------|-----------------|----------------|
| DAS default | 133ms | 150ms ✅ |
| ARR default | 10ms | 30ms ✅ |
| Soft Drop default | 50ms | 60ms ✅ |
| Sound Volume | 0.70 | 1.00 ✅ |
| Music Volume | 0.50 | 0.60 ✅ |
| Auto-create settings | ❌ Manual | ✅ Trigger |
| Database persistence | ⚠️ Mixed | ✅ Always |

---

## ✅ CHECKLIST

- [ ] **1. Backup database** (`pg_dump`)
- [ ] **2. Run migration** (`psql -f 004_update_users_settings_defaults.sql`)
- [ ] **3. Verify migration** (check NOTICE messages)
- [ ] **4. Run test script** (`test-settings-persistence.sql`)
- [ ] **5. Restart server** (`npm run dev`)
- [ ] **6. Test UI - Load** (vào Settings, xem giá trị)
- [ ] **7. Test UI - Update** (thay đổi, lưu, kiểm tra DB)
- [ ] **8. Test UI - Persistence** (logout, login, kiểm tra)
- [ ] **9. Test UI - Reset** (reset về default)
- [ ] **10. Verify database** (chạy verification queries)

---

## 🎯 SUCCESS CRITERIA

✅ **Migration thành công khi:**

1. Tất cả NOTICE messages hiển thị
2. Test script pass (✅ không có ❌)
3. Server khởi động không lỗi
4. UI load settings từ database
5. Thay đổi lưu vào database và persist sau khi logout/login
6. Mỗi user có settings riêng (không dùng localStorage)
7. User mới tự động có settings (trigger)

---

## 📞 SUPPORT

Nếu gặp vấn đề:

1. Check server logs: `server/logs/`
2. Check database logs: `SELECT * FROM pg_stat_activity;`
3. Re-run migration: `psql -f 004_update_users_settings_defaults.sql`
4. Restore backup: `psql -f backups/tetris_backup_YYYYMMDD_HHMMSS.sql`

---

**Documentation:** `FILE MD/SETTINGS-DATABASE-PERSISTENCE.md`

**Test Script:** `server/sql/test-settings-persistence.sql`

**Migration:** `server/src/migrations/004_update_users_settings_defaults.sql`
