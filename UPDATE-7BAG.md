# ✅ Cập Nhật: Hệ Thống 7-Bag Randomizer

## 📋 Tóm Tắt Thay Đổi

Đã cập nhật game Tetris để sử dụng **7-Bag Randomizer** - tiêu chuẩn chính thức của Tetris Guideline.

## 🎯 Mục Đích

### Trước đây:
- ❌ Khối xuất hiện hoàn toàn ngẫu nhiên
- ❌ Có thể ra nhiều khối giống nhau liên tiếp
- ❌ Có thể không ra khối cần thiết trong thời gian dài
- ❌ Không công bằng cho người chơi

### Bây giờ:
- ✅ Mỗi 7 khối liên tiếp chứa đủ cả 7 loại khối (I, O, T, S, Z, J, L)
- ✅ Mỗi khối xuất hiện đúng 1 lần trong mỗi túi
- ✅ Người chơi có thể dự đoán và lập chiến lược tốt hơn
- ✅ Công bằng và đúng chuẩn quốc tế

## 📁 Files Đã Thay Đổi

### 1. `client/src/hooks/useQueue.ts`
**Thay đổi chính:**
- ✅ Thêm hàm `shuffle()` dùng thuật toán Fisher-Yates
- ✅ Thêm hàm `generateNewBag()` tạo túi 7 khối và xáo trộn
- ✅ Cập nhật `popNext()` tự động tạo bag mới khi queue sắp hết
- ✅ Khởi tạo queue với 2 túi (14 khối) thay vì random hoàn toàn
- ✅ Thêm documentation chi tiết về cơ chế hoạt động

**Code mới:**
```typescript
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateNewBag(): TType[] {
  return shuffle([...BAG]);
}

// Trong popNext():
if (updated.length < previewSize + 7) {
  const newBag = generateNewBag();
  updated = [...updated, ...newBag];
}
```

### 2. `server/src/index.ts`
**Không cần thay đổi** - Server đã có sẵn `bagGenerator()` triển khai đúng 7-bag:
```typescript
function* bagGenerator(seed = Date.now()) {
  while (true) {
    const bag = [...BAG];
    // Fisher-Yates shuffle
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    for (const t of bag) yield t;
  }
}
```

## 🧪 Test & Verification

### Đã tạo file test:
1. **`test-7bag.html`** - Test trực quan với UI đẹp
   - Hiển thị khối theo từng túi
   - Phân tích thống kê
   - Verify phân bố đều
   - Mở file trong browser để test

2. **`7bag-explanation.md`** - Tài liệu chi tiết
   - Giải thích nguyên lý hoạt động
   - Ví dụ cụ thể
   - So sánh với guideline
   - Các đặc điểm quan trọng

### Cách test thủ công:
```bash
# 1. Mở test-7bag.html trong browser
# 2. Click "Tạo 21 khối (3 túi)"
# 3. Kiểm tra phần "Phân Tích":
#    - Mỗi khối phải xuất hiện đúng 3 lần (1 lần/túi)
#    - Có dấu ✓ xanh = Hoàn hảo!
```

## 🎮 Cách Hoạt Động

### Luồng Khối (Queue Flow):

```
QUEUE (14 khối ban đầu):
┌────────────────────────────────────┐
│ Túi 1 (shuffled)  │ Túi 2 (shuffled)│
│ T L I S O J Z    │ O Z T I J L S   │
└────────────────────────────────────┘
     ↓ popNext()
   [T] → Khối hiện tại (Current)
   ↓
[L I S O] → NEXT Preview (4 khối)
```

### Khi popNext():
1. Lấy khối đầu queue
2. Xóa khối đó khỏi queue
3. Kiểm tra: `queue.length < previewSize + 7`?
   - Nếu **đúng** → Tạo bag mới và nối vào queue
   - Nếu **sai** → Không làm gì

### Đảm bảo:
- Queue luôn có đủ khối cho preview
- Tự động tạo bag mới trước khi hết
- Không bao giờ thiếu khối

## 📊 So Sánh Trước/Sau

### Trước (Random Hoàn Toàn):
```
Khối 1-7:  S S T L Z S O   ← 3 khối S, không có I
Khối 8-14: T Z J I S Z L   ← Không có O
Khối 15-21: S I O J L Z T  ← OK nhưng may mắn
```

### Sau (7-Bag):
```
Túi 1:  T L I S O J Z   ← Đủ 7 khối, mỗi loại 1 lần
Túi 2:  O Z T I J L S   ← Đủ 7 khối, mỗi loại 1 lần
Túi 3:  J S L O T Z I   ← Đủ 7 khối, mỗi loại 1 lần
```

## 🌟 Lợi Ích

### Cho Người Chơi:
- 🎯 **Dự đoán được**: Biết khối nào chưa ra trong túi hiện tại
- 🧠 **Lập chiến lược**: Lên kế hoạch dựa trên queue
- ⚖️ **Công bằng**: Không bị "xui" hoặc "quá may"
- 🎮 **Chuẩn quốc tế**: Giống Tetris.com, Jstris, Tetr.io

### Cho Game:
- ✅ Tuân thủ Tetris Guideline 2009
- ✅ Gameplay mượt mà và cân bằng
- ✅ Dễ debug (phân bố đều, có thể kiểm tra)
- ✅ Multiplayer đồng bộ (server đã có sẵn)

## 🔍 Kiểm Tra Nhanh

Chạy game và chơi 21 lượt (3 túi), ghi lại khối:
```
Túi 1: _ _ _ _ _ _ _  (7 khối)
Túi 2: _ _ _ _ _ _ _  (7 khối)
Túi 3: _ _ _ _ _ _ _  (7 khối)
```

Đếm từng loại:
- I: 3 lần ✓
- J: 3 lần ✓
- L: 3 lần ✓
- O: 3 lần ✓
- S: 3 lần ✓
- T: 3 lần ✓
- Z: 3 lần ✓

## 🚀 Triển Khai

### Client (Single Player):
- ✅ `useQueue.ts` đã cập nhật
- ✅ Tự động tạo bag mới
- ✅ Queue luôn đủ khối

### Server (Multiplayer):
- ✅ `bagGenerator()` đã có sẵn
- ✅ Đồng bộ cho cả 2 người chơi
- ✅ Seed deterministic (cùng seed → cùng sequence)

## 📚 Tài Liệu Tham Khảo

- [Tetris Guideline](https://tetris.wiki/Tetris_Guideline)
- [Random Generator](https://tetris.wiki/Random_Generator)
- [Fisher-Yates Shuffle](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle)

## ✨ Kết Luận

Hệ thống 7-Bag Randomizer đã được triển khai thành công! 🎉

- ✅ Client: Hoạt động tốt với `useQueue.ts`
- ✅ Server: Đã có sẵn `bagGenerator()`
- ✅ Test: File `test-7bag.html` để verify
- ✅ Docs: Chi tiết trong `7bag-explanation.md`

Game giờ đây công bằng, dự đoán được, và tuân thủ chuẩn quốc tế! 🎮✨

---
**Ngày cập nhật:** 06/10/2025  
**Phiên bản:** 1.0.0
