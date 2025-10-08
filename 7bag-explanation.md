# 🎲 Hệ Thống 7-Bag Randomizer

## Nguyên Lý Hoạt Động

### Trước Đây (Random Hoàn Toàn)
```
❌ Có thể ra: S S S L Z S S ... (5 khối S liên tiếp!)
❌ Có thể không ra I trong 30+ lượt
❌ Không công bằng, khó lập chiến thuật
```

### Bây Giờ (7-Bag Randomizer)
```
✅ Mỗi túi chứa đúng 7 khối: I, O, T, S, Z, J, L
✅ Xáo trộn ngẫu nhiên TRONG túi
✅ Mỗi 7 khối liên tiếp đảm bảo có đủ cả 7 loại
```

## Ví Dụ Cụ Thể

### Túi 1 (đã shuffle):
```
[T, L, I, S, O, J, Z]
 ↓  ↓  ↓  ↓  ↓  ↓  ↓
 1  2  3  4  5  6  7  ← Lượt chơi
```

### Túi 2 (đã shuffle):
```
[O, Z, T, I, J, L, S]
 ↓  ↓  ↓  ↓  ↓  ↓  ↓
 8  9  10 11 12 13 14 ← Lượt chơi
```

### Túi 3 (đã shuffle):
```
[J, S, L, O, T, Z, I]
 ↓  ↓  ↓  ↓  ↓  ↓  ↓
 15 16 17 18 19 20 21 ← Lượt chơi
```

## Đặc Điểm Quan Trọng

### ✅ Công Bằng
- Mỗi khối xuất hiện **chính xác 1 lần** trong 7 lượt
- Không có khối nào bị "thiên vị" hay "bỏ quên"

### ✅ Dự Đoán Được
- Nếu bạn thấy 6 khối rồi, bạn biết chắc khối thứ 7 là gì
- Giúp lập chiến lược tốt hơn

### ⚠️ Vẫn Có Ngẫu Nhiên
- Thứ tự TRONG túi hoàn toàn random
- Có thể xảy ra "trùng túi": Túi 1 kết thúc bằng `Z`, Túi 2 bắt đầu bằng `Z`
  ```
  Túi 1: [..., L, Z]
  Túi 2: [Z, T, ...]
          ↓  ↓
          Z Z ← Hai khối Z liên tiếp (nhưng từ 2 túi khác nhau)
  ```

## Cài Đặt Code

### Client (`useQueue.ts`)
```typescript
function generateNewBag(): TType[] {
  return shuffle([...BAG]);  // BAG = ["I","J","L","O","S","T","Z"]
}

// Khi popNext():
// 1. Lấy khối từ đầu queue
// 2. Kiểm tra nếu queue < previewSize + 7
//    → Tạo bag mới và nối vào queue
```

### Server (`index.ts`)
```typescript
function* bagGenerator(seed) {
  while (true) {
    const bag = [...BAG];  // Tạo túi mới
    shuffle(bag);           // Xáo trộn
    for (const t of bag) {
      yield t;              // Phát từng khối
    }
    // Túi hết → Lặp lại (tạo túi mới)
  }
}
```

## So Sánh Với Guideline

Hệ thống 7-Bag là **tiêu chuẩn chính thức** của Tetris Guideline (2009) và được sử dụng trong:
- ✅ Tetris.com
- ✅ Jstris
- ✅ Tetr.io
- ✅ Puyo Puyo Tetris
- ✅ Tetris Effect

## Test Thử

Chạy 21 lượt (3 túi), kiểm tra:
```javascript
// Túi 1: [T,L,I,S,O,J,Z] ← 7 khối khác nhau
// Túi 2: [O,Z,T,I,J,L,S] ← 7 khối khác nhau  
// Túi 3: [J,S,L,O,T,Z,I] ← 7 khối khác nhau

// Đếm từng loại trong 21 lượt:
I: 3 lần (1 lần/túi)
J: 3 lần (1 lần/túi)
L: 3 lần (1 lần/túi)
O: 3 lần (1 lần/túi)
S: 3 lần (1 lần/túi)
T: 3 lần (1 lần/túi)
Z: 3 lần (1 lần/túi)
```

---
**Kết Luận:** Hệ thống 7-Bag đảm bảo công bằng, dự đoán được, nhưng vẫn giữ yếu tố ngẫu nhiên hấp dẫn! 🎮
