# Cập nhật Feedback System - Đồng bộ với Database

## Thay đổi chính

### 1. Cấu trúc Database (đã có sẵn)
Bảng `feedback` đã tồn tại với cấu trúc sau:

```sql
CREATE TABLE feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    feedback_id TEXT NOT NULL UNIQUE,           -- Mã định danh (e.g., FB-1731654321-abc123)
    category VARCHAR(200) NOT NULL,             -- Danh mục feedback
    subject VARCHAR(200) NOT NULL,              -- Tiêu đề ngắn gọn
    description TEXT NOT NULL,                  -- Mô tả chi tiết
    status feedback_status DEFAULT 'pending',   -- ENUM: pending, reviewed, resolved, dismissed
    priority VARCHAR(20) DEFAULT 'medium',      -- low, medium, high
    admin_response TEXT,                        -- Phản hồi từ admin
    admin_id BIGINT,                           -- Admin xử lý
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE
);
```

**Enum type:** `feedback_status` = ('pending', 'reviewed', 'resolved', 'dismissed')

### 2. Backend API (server/src/routes/feedback.ts)

#### Thay đổi:
- ✅ Loại bỏ `feedbackType` (feedback/complaint/report) - chỉ còn 1 loại chung
- ✅ Loại bỏ `reportedUserId`, `reportedUsername` - không còn tính năng report player
- ✅ Thêm `priority` (low/medium/high)
- ✅ Thêm `adminResponse`, `adminId`, `resolvedAt`
- ✅ Tự động tạo `feedback_id` unique: `FB-{timestamp}-{random}`

#### Endpoints:

**POST /api/feedback**
```typescript
Request: {
  userId: number;
  category: string;         // feature_request, bug, improvement, ui_ux, etc.
  subject: string;          // max 200 chars
  description: string;
  priority?: string;        // low | medium | high (default: medium)
}

Response: {
  success: true;
  message: "Feedback submitted successfully";
  feedbackId: number;       // Database ID
  createdAt: string;
}
```

**GET /api/feedback/user/:userId**
```typescript
Response: {
  success: true;
  feedbacks: Array<{
    id: number;
    feedback_id: string;
    category: string;
    subject: string;
    description: string;
    status: string;
    priority: string;
    admin_response: string | null;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
  }>
}
```

**GET /api/feedback/admin**
```typescript
Query params:
  ?status=pending|reviewed|resolved|dismissed
  ?priority=low|medium|high
  ?limit=100

Response: {
  success: true;
  feedbacks: Array<{...}>;
  count: number;
}
```

**PATCH /api/feedback/:id/status**
```typescript
Request: {
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  adminResponse?: string;
  adminId?: number;
  priority?: 'low' | 'medium' | 'high';
}

Response: {
  message: "Feedback updated successfully"
}
```

### 3. Frontend Component (client/src/components/FeedbackModal.tsx)

#### Thay đổi:
- ✅ Loại bỏ type selector (feedback/complaint/report)
- ✅ Loại bỏ reported username field
- ✅ Thêm priority selector (🟢 Thấp / 🟡 Trung bình / 🔴 Cao)
- ✅ Category list hợp nhất:
  - Đề xuất tính năng mới
  - Lỗi kỹ thuật
  - Cải thiện game
  - Giao diện / Trải nghiệm
  - Hiệu suất / Lag
  - Hệ thống ghép trận
  - Cân bằng game
  - Khác

#### UI mới:
```
┌─────────────────────────────────────┐
│ 📢 Gửi phản hồi                  ✕ │
├─────────────────────────────────────┤
│                                     │
│ Danh mục *                          │
│ [Dropdown: Chọn danh mục]           │
│                                     │
│ Tiêu đề *                           │
│ [Input: Mô tả ngắn gọn vấn đề]     │
│                                     │
│ Mô tả chi tiết *                    │
│ [Textarea: 6 rows]                  │
│                                     │
│ Mức độ ưu tiên                      │
│ [🟢 Thấp] [🟡 Trung bình] [🔴 Cao] │
│                                     │
│ [📤 Gửi phản hồi]                   │
└─────────────────────────────────────┘
```

### 4. Menu Integration

Nút feedback đã được thêm vào `HomeMenu.tsx`:
- Vị trí: Giữa "🏆 Bảng xếp hạng" và "⚙️ Cài đặt"
- Icon: 💬
- Label: "Feedback"
- Màu: Blue theme (#42a5f5)

### 5. Migration Script

**File:** `server/src/scripts/init-feedback-table.ts`

Công dụng: Kiểm tra cấu trúc bảng feedback (không tạo mới vì đã có sẵn)

```bash
cd server
npm run db:feedback    # Xem cấu trúc bảng hiện tại
```

Output:
```
[Feedback Check] Connected successfully
[Feedback Check] ✅ Table "feedback" exists
[Feedback Check] Table structure:
┌─────┬──────────────────┬──────────────────────────┐
│     │ column_name      │ data_type                │
├─────┼──────────────────┼──────────────────────────┤
│ 0   │ id               │ bigint                   │
│ 1   │ user_id          │ bigint                   │
│ 2   │ feedback_id      │ text                     │
│ 3   │ category         │ character varying        │
│ 4   │ subject          │ character varying        │
│ 5   │ description      │ text                     │
│ 6   │ status           │ USER-DEFINED             │
│ 7   │ priority         │ character varying        │
│ 8   │ admin_response   │ text                     │
│ 9   │ admin_id         │ bigint                   │
│ 10  │ created_at       │ timestamp with time zone │
│ 11  │ updated_at       │ timestamp with time zone │
│ 12  │ resolved_at      │ timestamp with time zone │
└─────┴──────────────────┴──────────────────────────┘
[Feedback Check] Status enum values: pending, reviewed, resolved, dismissed
[Feedback Check] Total records: X
```

## So sánh với phiên bản cũ

| Tính năng | Trước | Sau |
|-----------|-------|-----|
| **Loại feedback** | 3 loại (feedback/complaint/report) | 1 loại chung |
| **Report player** | ✅ Có | ❌ Loại bỏ |
| **Priority** | ❌ Không có | ✅ Có (low/medium/high) |
| **Admin response** | `admin_notes` (text) | `admin_response` (text) |
| **Status tracking** | Basic | ✅ Có `resolved_at` timestamp |
| **Feedback ID** | Auto-increment | ✅ Unique string (FB-xxx) |

## Testing

### 1. Kiểm tra backend
```bash
# Start server
cd server
npm run dev

# Test submission
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "category": "bug",
    "subject": "Test feedback",
    "description": "This is a test",
    "priority": "medium"
  }'

# Get user feedback
curl http://localhost:3000/api/feedback/user/1
```

### 2. Kiểm tra frontend
```bash
cd client
npm run dev
```

1. Click nút "💬 Feedback" trên menu
2. Chọn danh mục từ dropdown
3. Nhập tiêu đề và mô tả
4. Chọn mức độ ưu tiên (🟢/🟡/🔴)
5. Click "📤 Gửi phản hồi"
6. Kiểm tra thông báo thành công
7. Verify trong database: `SELECT * FROM feedback ORDER BY created_at DESC LIMIT 5;`

### 3. Database queries
```sql
-- Xem tất cả feedback
SELECT id, feedback_id, category, subject, status, priority, created_at 
FROM feedback 
ORDER BY created_at DESC;

-- Feedback pending
SELECT * FROM feedback WHERE status = 'pending';

-- Feedback theo priority
SELECT * FROM feedback WHERE priority = 'high' AND status = 'pending';

-- Feedback của 1 user
SELECT * FROM feedback WHERE user_id = 1;
```

## Files thay đổi

### Modified:
1. ✅ `server/src/routes/feedback.ts` - API endpoints đồng bộ với DB
2. ✅ `client/src/components/FeedbackModal.tsx` - Loại bỏ report, thêm priority
3. ✅ `server/src/scripts/init-feedback-table.ts` - Script kiểm tra DB
4. ✅ `server/migrations/004_create_feedbacks_table.sql` - Documentation

### Unchanged:
- ✅ `server/src/routes/index.ts` - Routing vẫn giữ nguyên
- ✅ `client/src/components/menu/HomeMenu.tsx` - Integration vẫn hoạt động

## Lưu ý quan trọng

### Backend:
1. **Feedback ID**: Được tạo tự động theo format `FB-{timestamp}-{random}`
2. **Priority**: Default là `medium` nếu không truyền
3. **Status**: Mặc định là `pending` khi tạo mới
4. **Admin fields**: `admin_response`, `admin_id`, `resolved_at` là NULL cho đến khi admin xử lý

### Frontend:
1. **Category validation**: Required field, phải chọn từ dropdown
2. **Subject**: Max 200 characters (khớp với DB)
3. **Priority**: Default là `medium`, có thể thay đổi trước khi submit
4. **Success message**: Auto-close sau 2 giây

### Database:
1. **Enum type**: `feedback_status` phải đã tồn tại
2. **Foreign keys**: `user_id` references `users(user_id)`
3. **Timestamps**: Auto-update via trigger khi UPDATE
4. **Indexes**: Đã có trên `user_id`, `status`, `priority`, `created_at`

## Next Steps

### Admin Panel (chưa implement):
```typescript
// GET /api/feedback/admin?status=pending&priority=high
// Show pending high-priority feedback

// PATCH /api/feedback/:id/status
{
  status: 'resolved',
  adminResponse: 'Đã fix lỗi này trong bản cập nhật 1.2.0',
  adminId: 1
}
```

### User Feedback History (tương lai):
- Thêm tab "Feedback của tôi" vào ProfileModal
- Show status, admin response
- Filter by status

---

**Status:** ✅ Complete - Đã đồng bộ hoàn toàn với database hiện có
**Test:** Ready for testing
**Migration:** Không cần (bảng đã tồn tại)
