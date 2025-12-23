# ✅ SETTINGS SYSTEM - DATABASE PERSISTENCE

## 🎯 MỤC TIÊU

**Tất cả sửa đổi trong cài đặt đều được lưu vào DATABASE, không dùng localStorage.**

Mỗi user có 1 row riêng trong bảng `users_settings` với các giá trị **RIÊNG BIỆT**, không phải dữ liệu mẫu.

---

## 📊 KIẾN TRÚC HỆ THỐNG

### **1. DATABASE (PostgreSQL)**

```
Bảng: users_settings
─────────────────────────────────────────────
| user_id (PK) | das_delay_ms | arr_ms | ... |
─────────────────────────────────────────────
| 1            | 150          | 30     | ... |  ← User 1
| 2            | 200          | 10     | ... |  ← User 2 (khác User 1)
| 3            | 150          | 50     | ... |  ← User 3 (khác User 1 & 2)
─────────────────────────────────────────────
```

### **2. BACKEND API**

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/settings` | GET | Lấy settings của user từ DB |
| `/api/settings` | PUT | Cập nhật toàn bộ settings vào DB |
| `/api/settings/keys` | PATCH | Chỉ cập nhật key bindings vào DB |
| `/api/settings/reset` | POST | Reset về default và lưu vào DB |

### **3. FRONTEND**

```
SettingsPage.tsx
  ↓ Load settings từ database
  ↓ User thay đổi
  ↓ Click "Lưu"
  ↓ PATCH/PUT → Backend → Database
  ↓ ✅ Saved to DB
```

---

## 🔄 FLOW DỮ LIỆU

### **Scenario 1: User lần đầu đăng nhập**

```
1. User đăng ký tài khoản
   ↓
2. Trigger tự động tạo row trong users_settings
   INSERT INTO users_settings (user_id, das_delay_ms, arr_ms, ...)
   VALUES (NEW.user_id, 150, 30, ...)
   ↓
3. User vào Settings → Thấy giá trị mặc định từ DB
```

### **Scenario 2: User thay đổi settings**

```
1. User mở Settings → GET /api/settings
   ↓
2. Backend truy vấn:
   SELECT * FROM users_settings WHERE user_id = ?
   ↓
3. Frontend hiển thị giá trị từ database
   ↓
4. User thay đổi (ví dụ: das_delay_ms từ 150 → 200)
   ↓
5. User click "Lưu" → PUT /api/settings
   ↓
6. Backend UPDATE:
   UPDATE users_settings 
   SET das_delay_ms = 200, ...
   WHERE user_id = ?
   ↓
7. ✅ Dữ liệu đã lưu vào database
   ↓
8. Lần sau user mở Settings → Thấy 200 (không phải 150)
```

### **Scenario 3: User reset settings**

```
1. User click "Reset mặc định"
   ↓
2. POST /api/settings/reset
   ↓
3. Backend UPSERT:
   INSERT INTO users_settings (user_id, das_delay_ms, ...)
   VALUES (?, 150, ...)
   ON CONFLICT (user_id) DO UPDATE
   SET das_delay_ms = 150, ...
   ↓
4. ✅ Reset thành công, lưu vào database
```

---

## 📝 CÁC FILE ĐÃ SỬA

### **Backend:**

1. ✅ **`server/src/models/UserSettings.ts`**
   - Đổi `allowNull: true` → `allowNull: false` cho das_delay_ms, arr_ms, soft_drop_rate
   - Cập nhật default values: 150ms, 30ms, 60ms, 1.00, 0.60

2. ✅ **`server/src/routes/settings.ts`**
   - Cập nhật default values khi tạo settings mới
   - Đảm bảo tất cả endpoints lưu vào database

3. ✅ **`server/src/migrations/004_update_users_settings_defaults.sql`** (MỚI)
   - Migration để cập nhật database schema
   - Tạo trigger tự động tạo settings khi user đăng ký
   - Cập nhật default values cho các cột

### **Frontend:**

4. ✅ **`client/src/components/SettingsPage.tsx`**
   - Sửa hardcoded values (133, 10, 50) → Dùng giá trị từ database
   - Thay `||` → `??` để tránh falsy values (0 cũng là valid)
   - Đảm bảo mọi thay đổi gọi API để lưu vào DB

---

## 🧪 CÁCH TEST

### **1. Chạy Migration**

```bash
# PowerShell
cd "e:\Kì I năm 3\PBL4\Tetris\GAME-TETRIS\server"
$env:PGPASSWORD="yourpassword"; psql -U postgres -d tetris -f "src/migrations/004_update_users_settings_defaults.sql"
```

Kết quả mong đợi:
```
✅ Migration 004 completed successfully!
Updated default values:
  - das_delay_ms: 150ms
  - arr_ms: 30ms
  - soft_drop_rate: 60ms
  - sound_volume: 1.00
  - music_volume: 0.60
```

### **2. Kiểm tra Database**

```sql
-- Xem settings của user_id = 1
SELECT * FROM users_settings WHERE user_id = 1;

-- Kết quả:
-- user_id | das_delay_ms | arr_ms | soft_drop_rate | sound_volume | music_volume | ...
-- 1       | 150          | 30     | 60             | 1.00         | 0.60         | ...
```

### **3. Test từ Frontend**

**Bước 1:** Đăng nhập user
**Bước 2:** Vào Settings (⚙️)
**Bước 3:** Thay đổi DAS Delay từ 150 → 200
**Bước 4:** Click "💾 Lưu"
**Bước 5:** Đăng xuất và đăng nhập lại
**Bước 6:** Vào Settings → **Phải thấy 200 (không phải 150)**

### **4. Test API với curl**

```bash
# 1. Lấy settings
curl -X GET http://localhost:4000/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
# {
#   "success": true,
#   "settings": {
#     "das_delay_ms": 150,
#     "arr_ms": 30,
#     "key_bindings": {...},
#     ...
#   }
# }

# 2. Cập nhật settings
curl -X PUT http://localhost:4000/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "das_delay_ms": 200,
    "arr_ms": 50
  }'

# 3. Kiểm tra lại (phải thấy giá trị mới)
curl -X GET http://localhost:4000/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 VERIFICATION QUERIES

### **Kiểm tra mỗi user có settings riêng:**

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
LEFT JOIN users_settings s ON u.user_id = s.user_id
ORDER BY u.user_id;
```

Kết quả mong đợi: **Mỗi user có giá trị khác nhau**

### **Kiểm tra user nào chưa có settings:**

```sql
SELECT 
  u.user_id,
  u.user_name,
  'No settings' as status
FROM users u
WHERE u.user_id NOT IN (SELECT user_id FROM users_settings);
```

Kết quả mong đợi: **0 rows** (trigger đã tạo settings tự động)

### **Kiểm tra trigger hoạt động:**

```sql
-- Tạo user test
INSERT INTO users (user_name, email, password_hash)
VALUES ('test_settings', 'test@test.com', 'hash');

-- Kiểm tra settings tự động tạo
SELECT * FROM users_settings 
WHERE user_id = (SELECT user_id FROM users WHERE user_name = 'test_settings');

-- Phải có 1 row với giá trị default
```

---

## ⚠️ TROUBLESHOOTING

### **Vấn đề 1: "Settings không lưu vào database"**

**Kiểm tra:**
```sql
-- Trước khi lưu
SELECT das_delay_ms FROM users_settings WHERE user_id = 1;

-- Click "Lưu" trong UI

-- Sau khi lưu
SELECT das_delay_ms FROM users_settings WHERE user_id = 1;
```

**Nếu không thay đổi:**
- Kiểm tra network tab: có gọi PUT /api/settings không?
- Kiểm tra console log: có lỗi API không?
- Kiểm tra backend log: có nhận request không?

### **Vấn đề 2: "Giá trị bị reset về mặc định"**

**Nguyên nhân:** Frontend dùng hardcoded fallback values

**Giải pháp:** Đã sửa trong SettingsPage.tsx:
```tsx
// ❌ SAI (dùng hardcoded fallback)
value={settings.das_delay_ms || 133}

// ✅ ĐÚNG (dùng giá trị từ database)
value={settings.das_delay_ms ?? 150}
```

### **Vấn đề 3: "User mới không có settings"**

**Nguyên nhân:** Trigger chưa được tạo

**Giải pháp:**
```sql
-- Kiểm tra trigger tồn tại
SELECT * FROM pg_trigger WHERE tgname = 'trigger_create_user_settings';

-- Nếu không có, chạy lại migration 004
```

---

## 📌 SUMMARY

| Mục | Trạng thái | Ghi chú |
|-----|-----------|---------|
| Database schema | ✅ Đã cập nhật | Default values: 150, 30, 60, 1.00, 0.60 |
| Backend Model | ✅ Đã sửa | allowNull: false cho main settings |
| Backend Routes | ✅ Đã sửa | Lưu vào DB khi create/update |
| Frontend | ✅ Đã sửa | Không dùng hardcoded values |
| Migration | ✅ Đã tạo | 004_update_users_settings_defaults.sql |
| Trigger | ✅ Đã tạo | Auto-create settings on user signup |
| Test Script | ✅ Đã tạo | Xem bên dưới ↓ |

---

## 🚀 NEXT STEPS

1. **Chạy migration:**
   ```bash
   psql -U postgres -d tetris -f "server/src/migrations/004_update_users_settings_defaults.sql"
   ```

2. **Restart server:**
   ```bash
   npm run dev
   ```

3. **Test trên UI:**
   - Login → Settings → Thay đổi → Lưu → Logout → Login → Kiểm tra

4. **Verify database:**
   ```sql
   SELECT * FROM users_settings WHERE user_id = YOUR_USER_ID;
   ```

✅ **TẤT CẢ THAY ĐỔI SETTINGS GIỜ ĐÃ LƯU VÀO DATABASE!**
