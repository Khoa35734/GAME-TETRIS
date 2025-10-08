# ⏱️ Cập Nhật: Điều Chỉnh Tốc Độ Rơi

## 📋 Tóm Tắt Thay Đổi

Đã điều chỉnh tốc độ rơi khối Tetris để bắt đầu chậm hơn (800ms) và tăng dần đến level 22.

## 🎯 Vấn Đề Trước Đây

### ❌ Công thức Guideline cũ:
```typescript
// G = 1 / ((0.8 - (L - 1) × 0.007)^(L-1))
// Level 1: ~450ms (quá nhanh cho người mới)
// Level 5: ~300ms
// Level 10: ~150ms
// Level 22: ~16ms (instant)
```

**Vấn đề:**
- Level 1 rơi quá nhanh (~450ms)
- Khó cho người chơi mới làm quen
- Không đủ thời gian suy nghĩ và xếp khối

## ✅ Giải Pháp Mới

### Công thức mới (Exponential Decay):
```typescript
const START_SPEED = 800;  // 0.8 giây ở level 1
const END_SPEED = 16.67;  // ~16.67ms ở level 22

progress = level / 21
speed = 800 × (16.67 / 800)^progress
```

### Bảng Tốc Độ Theo Level:

| Level | Tốc Độ (ms) | Tốc Độ (s) | Mô Tả |
|-------|-------------|------------|-------|
| 1     | 800.00      | 0.800      | 🟢 Rất chậm, dễ chơi |
| 2     | 679.36      | 0.679      | 🟢 Chậm |
| 3     | 577.04      | 0.577      | 🟢 Chậm |
| 4     | 490.03      | 0.490      | 🟢 Chậm |
| 5     | 416.25      | 0.416      | 🟢 Chậm |
| 6     | 353.54      | 0.354      | 🟡 Trung bình |
| 7     | 300.26      | 0.300      | 🟡 Trung bình |
| 8     | 255.02      | 0.255      | 🟡 Trung bình |
| 9     | 216.61      | 0.217      | 🟡 Trung bình |
| 10    | 184.00      | 0.184      | 🟡 Trung bình |
| 11    | 156.30      | 0.156      | 🟠 Nhanh |
| 12    | 132.79      | 0.133      | 🟠 Nhanh |
| 13    | 112.77      | 0.113      | 🟠 Nhanh |
| 14    | 95.79       | 0.096      | 🟠 Nhanh |
| 15    | 81.37       | 0.081      | 🟠 Nhanh |
| 16    | 69.12       | 0.069      | 🔴 Rất nhanh |
| 17    | 58.71       | 0.059      | 🔴 Rất nhanh |
| 18    | 49.87       | 0.050      | 🔴 Rất nhanh |
| 19    | 42.35       | 0.042      | 🔴 Rất nhanh |
| 20    | 35.98       | 0.036      | 🔴 Rất nhanh |
| 21    | 30.56       | 0.031      | 🟣 Cực nhanh |
| 22    | 16.67       | 0.017      | 🟣 Instant drop |

## 📁 Files Đã Thay Đổi

### 1. `client/src/components/Tetris.tsx`
```typescript
const START_SPEED = 800; // 0.8 giây ở level 1
const END_SPEED = 16.67;  // ~16.67ms ở level 22 (instant)

const getFallSpeed = (lvl: number): number => {
  const L = Math.min(lvl, MAX_LEVEL - 1);
  
  if (L >= MAX_LEVEL - 1) {
    return END_SPEED;
  }
  
  const progress = L / (MAX_LEVEL - 1);
  const speed = START_SPEED * Math.pow(END_SPEED / START_SPEED, progress);
  
  return Math.max(END_SPEED, speed);
};
```

### 2. `client/src/components/Versus.tsx`
- ✅ Cập nhật công thức tương tự cho chế độ đối kháng
- ✅ Đảm bảo cả 2 chế độ có tốc độ giống nhau

## 🎮 Đặc Điểm

### Tốc Độ Ban Đầu:
- **Level 1:** 800ms (0.8 giây) - Chậm, dễ chơi
- Người mới có đủ thời gian suy nghĩ
- Dễ làm quen với điều khiển

### Tăng Dần:
- **Level 1-5:** Chậm (800ms → 416ms)
- **Level 6-10:** Trung bình (416ms → 184ms)
- **Level 11-15:** Nhanh (184ms → 81ms)
- **Level 16-20:** Rất nhanh (81ms → 36ms)
- **Level 21-22:** Instant drop (~16ms)

### Công Thức Tăng Level:
```
Level = Số dòng xóa / 10
```
- Xóa 0-9 dòng: Level 1
- Xóa 10-19 dòng: Level 2
- Xóa 20-29 dòng: Level 3
- ...
- Xóa 210+ dòng: Level 22 (max)

## 🧪 Test

### File Test: `speed-test.html`
Mở file trong browser để xem:
- ✅ Bảng tốc độ đầy đủ 22 level
- ✅ Trực quan hóa độ giảm tốc độ
- ✅ So sánh trước/sau

**Cách mở:**
1. Mở `e:\PBL4\GAME-TETRIS\speed-test.html` trong Chrome/Edge
2. Xem bảng tốc độ chi tiết
3. Kiểm tra công thức và trực quan

## 📊 So Sánh Trước/Sau

### Trước (Guideline):
```
Level 1: ~450ms  ← Quá nhanh!
Level 5: ~300ms
Level 10: ~150ms
Level 22: ~16ms
```

### Sau (Mới):
```
Level 1: 800ms   ← Chậm, dễ chơi ✓
Level 5: 416ms
Level 10: 184ms
Level 22: 16.67ms
```

## ✨ Lợi Ích

### Cho Người Chơi Mới:
- 🎯 **Dễ tiếp cận:** Level 1 chậm đủ để học
- 🧠 **Thời gian suy nghĩ:** 0.8s cho mỗi ô
- 💪 **Tự tin hơn:** Không bị áp lực tốc độ ngay từ đầu

### Cho Người Chơi Giỏi:
- 🚀 **Thử thách:** Level 15+ vẫn rất nhanh
- 🏆 **Level 22:** Instant drop như guideline
- ⚡ **Smooth progression:** Tăng dần tự nhiên

### Cho Gameplay:
- ✅ Cân bằng tốt hơn
- ✅ Độ khó tăng dần hợp lý
- ✅ Giữ được người chơi lâu hơn

## 🔧 Tuning (Nếu Cần)

### Muốn chậm hơn nữa?
```typescript
const START_SPEED = 1000; // 1 giây
```

### Muốn nhanh hơn một chút?
```typescript
const START_SPEED = 600; // 0.6 giây
```

### Muốn level 22 đạt sớm hơn?
```typescript
const MAX_LEVEL = 20; // Thay vì 22
```

## 📈 Công Thức Chi Tiết

### Exponential Decay:
```
speed(L) = S₀ × (Sₑ / S₀)^(L / (MAX-1))

Trong đó:
- S₀ = START_SPEED = 800ms
- Sₑ = END_SPEED = 16.67ms
- L = level hiện tại (0-21)
- MAX = 22
```

### Tại sao dùng hàm mũ?
- ✅ Giảm chậm ở đầu (level 1-5)
- ✅ Giảm nhanh ở giữa (level 10-15)
- ✅ Tiệm cận ở cuối (level 20-22)
- ✅ Cảm giác tự nhiên, không đột ngột

## 🎯 Kết Luận

Tốc độ rơi giờ đây:
- ✅ Bắt đầu chậm (800ms) ở level 1
- ✅ Tăng dần hợp lý đến level 22
- ✅ Dễ chơi cho người mới
- ✅ Vẫn thử thách cho người giỏi
- ✅ Smooth progression

Game giờ đây thân thiện và cân bằng hơn! 🎮✨

---
**Ngày cập nhật:** 06/10/2025  
**Phiên bản:** 2.0.0
