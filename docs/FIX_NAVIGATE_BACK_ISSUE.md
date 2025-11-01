# Fix Navigation Back Issue - Đăng nhập lại khi bấm thoát

## 🐛 Vấn đề

Khi user đã đăng nhập và vào các màn hình game (đấu thường, xếp hạng, phòng custom, settings chơi đơn), sau đó bấm nút "Thoát" hoặc "Quay lại", họ bị đưa về **màn hình đăng nhập** thay vì **menu chính với các chế độ game**.

## 🔍 Nguyên nhân

### Vấn đề 1: State bị reset khi navigate('/')
Các màn hình con (OnlineCasual, OnlineRanked, OnlineMenu, SinglePlayerSettings) đang dùng:
```typescript
onClick={() => navigate('/')}
```

Khi gọi `navigate('/')`, React Router sẽ **remount** component `HomeMenu`, làm cho:
- State `showGameModes` bị reset về giá trị mặc định
- Hook `useAuth` chạy lại bootstrap logic
- Nếu bootstrap không set `showGameModes=true`, user sẽ thấy màn hình login

### Vấn đề 2: Bootstrap logic không nhất quán
Trong `useAuth.ts`, logic bootstrap có một số path không set `showGameModes=true`:

```typescript
// ❌ Trong syncFromStorage
setShowGameModes(false); // Luôn set false

// ❌ Trong bootstrap
if (session) {
  setShowGameModes(false); // Luôn set false
}
```

## ✅ Giải pháp

### Giải pháp 1: Dùng navigate(-1) thay vì navigate('/')

Thay vì navigate về root path (sẽ remount component), dùng `navigate(-1)` để quay lại trang trước đó trong history stack. Điều này **giữ nguyên state** của HomeMenu.

### Giải pháp 2: Lưu showGameModes vào localStorage (Backup plan)

Nếu cần, có thể lưu state `showGameModes` vào localStorage để persist qua các lần remount.

## 🔧 Các file đã sửa

### 1. OnlineCasual.tsx
```typescript
// Trước
onClick={() => navigate('/')}

// Sau
onClick={() => navigate(-1)}
```

### 2. OnlineRanked.tsx
```typescript
// Trước
onClick={() => navigate('/')}

// Sau
onClick={() => navigate(-1)}
```

### 3. OnlineMenu.tsx
```typescript
// Trước
onClick={() => navigate('/')}

// Sau
onClick={() => navigate(-1)}
```

### 4. SinglePlayerSettings.tsx
```typescript
// Trước
const handleBack = () => {
  navigate('/');
};

// Sau
const handleBack = () => {
  navigate(-1);
};
```

## 🎯 Luồng hoạt động mới

### Luồng 1: Đấu thường (Casual)
1. User ở HomeMenu (đã login, `showGameModes=true`)
2. Click vào "⚔️ Đối kháng" → `navigate('/online/casual')`
3. Màn hình OnlineCasual hiển thị
4. Click "← Thoát" → `navigate(-1)`
5. **Quay lại HomeMenu với state cũ** (showGameModes vẫn = true)
6. ✅ Menu chính hiển thị, không phải màn hình login

### Luồng 2: Đấu xếp hạng (Ranked)
1. User ở HomeMenu (đã login, `showGameModes=true`)
2. Click vào "🏆 Xếp hạng" → `navigate('/online/ranked')`
3. Màn hình OnlineRanked hiển thị
4. Click "← Thoát" → `navigate(-1)`
5. **Quay lại HomeMenu với state cũ**
6. ✅ Menu chính hiển thị

### Luồng 3: Phòng tùy chỉnh (Custom Room)
1. User ở HomeMenu → Click "🎮 Tạo phòng" → `navigate('/online')`
2. Màn hình OnlineMenu hiển thị
3. Click "← Quay lại" → `navigate(-1)`
4. **Quay lại HomeMenu với state cũ**
5. ✅ Menu chính hiển thị

### Luồng 4: Cài đặt chơi đơn (Single Player Settings)
1. User ở HomeMenu → Click "🎮 Chơi đơn" → `navigate('/single/settings')`
2. Màn hình SinglePlayerSettings hiển thị
3. Click "◀ Quay lại" → `navigate(-1)`
4. **Quay lại HomeMenu với state cũ**
5. ✅ Menu chính hiển thị

## 📋 So sánh navigate('/') vs navigate(-1)

| Phương thức | Hành vi | State của HomeMenu | Use case |
|------------|---------|-------------------|----------|
| `navigate('/')` | Navigate tới root path | **Reset** (remount component) | Logout, fresh start |
| `navigate(-1)` | Quay lại trang trước trong history | **Giữ nguyên** (không remount) | Back button, cancel action |

## ⚠️ Lưu ý

### 1. History stack rỗng
Nếu user vào trực tiếp URL (ví dụ: `/online/casual`), không có history để quay lại. Trong trường hợp này, `navigate(-1)` sẽ không làm gì cả.

**Giải pháp:** Có thể thêm fallback logic:
```typescript
const handleBack = () => {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigate('/');
  }
};
```

### 2. Deep navigation
Nếu user vào nhiều màn hình lồng nhau, `navigate(-1)` chỉ quay lại 1 bước. Nếu muốn về Home, có thể dùng `navigate(-2)` hoặc `navigate('/')`.

### 3. Kết hợp với Bootstrap logic
Nếu sau này cần fix thêm bootstrap logic trong `useAuth`, nên đảm bảo:
- `syncFromStorage()` set `showGameModes=true` nếu có user
- Bootstrap với valid session set `showGameModes=true`

## ✅ Kết quả mong đợi

- ✅ User đăng nhập → vào đấu thường → thoát → **về menu chính** (không logout)
- ✅ User đăng nhập → vào xếp hạng → thoát → **về menu chính** (không logout)
- ✅ User đăng nhập → vào tạo phòng → quay lại → **về menu chính** (không logout)
- ✅ User đăng nhập → vào settings chơi đơn → quay lại → **về menu chính** (không logout)
- ✅ State `showGameModes` được giữ nguyên khi quay lại
- ✅ Không bị remount HomeMenu component

## 🧪 Testing checklist

- [ ] Đăng nhập → vào "Đối kháng" → bấm "Thoát" → kiểm tra vẫn ở menu chính
- [ ] Đăng nhập → vào "Xếp hạng" → bấm "Thoát" → kiểm tra vẫn ở menu chính
- [ ] Đăng nhập → vào "Tạo phòng" → bấm "Quay lại" → kiểm tra vẫn ở menu chính
- [ ] Đăng nhập → vào "Chơi đơn" → chọn settings → bấm "Quay lại" → kiểm tra vẫn ở menu chính
- [ ] Vào trực tiếp URL `/online/casual` (không có history) → bấm "Thoát" → kiểm tra hành vi
- [ ] Đăng nhập → vào nhiều màn hình lồng nhau → bấm back nhiều lần → kiểm tra navigation flow

## 📝 Tóm tắt

**Vấn đề:** Bấm thoát trong các màn hình game → bị đưa về màn hình đăng nhập

**Nguyên nhân:** `navigate('/')` làm reset state của HomeMenu

**Giải pháp:** Thay `navigate('/')` bằng `navigate(-1)` để giữ nguyên state

**Files sửa:**
- `client/src/components/OnlineCasual.tsx`
- `client/src/components/OnlineRanked.tsx`
- `client/src/components/OnlineMenu.tsx`
- `client/src/components/SinglePlayerSettings.tsx`

**Kết quả:** User bấm thoát sẽ quay lại menu chính với state đã đăng nhập, không bị logout
