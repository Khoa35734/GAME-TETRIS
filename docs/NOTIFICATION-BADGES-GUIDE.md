# 🔔 Notification Badges Feature

## Tổng Quan
Thêm badge hiển thị số lượng thông báo chưa đọc trên các nút **Bạn bè** và **Hộp thư** trong menu chính.

## Tính Năng

### 1. **Badge Hộp Thư (Inbox)**
- Hiển thị số lượng tin nhắn chưa đọc
- Vị trí: Góc trên bên phải nút "📬 Hộp thư"
- Màu đỏ với gradient
- Giới hạn hiển thị: 99+ nếu quá 99

### 2. **Badge Bạn Bè (Friends)**
- Hiển thị số lượng lời mời kết bạn chờ xử lý
- Vị trí: Góc trên bên phải nút "👥 Bạn bè"
- Màu đỏ với gradient
- Giới hạn hiển thị: 99+ nếu quá 99

## Implementation

### Backend (Server)

#### 1. Endpoint Mới
**File:** `server/src/routes/friends.ts`

```typescript
// GET /api/friends/pending - Lấy số lượng lời mời kết bạn chờ xử lý
router.get('/pending', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const count = await Friendship.count({
      where: {
        friend_id: userId,
        status: FriendshipStatus.REQUESTED,
      },
    });
    res.json({ success: true, count });
  } catch (error: any) {
    console.error('[Friends] Get pending count error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});
```

#### 2. Endpoint Đã Có
**File:** `server/src/routes/messages.ts`

```typescript
// GET /api/messages/stats/:userId - Thống kê tin nhắn
router.get('/stats/:userId', async (req: Request, res: Response) => {
  // Returns: { total, unread, starred, system, admin_reply, player_message }
});
```

### Frontend (Client)

#### 1. State Management
**File:** `client/src/components/menu/HomeMenu.tsx`

```typescript
// Notification badges
const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
const [pendingFriendRequestsCount, setPendingFriendRequestsCount] = useState(0);
```

#### 2. Auto-fetch Notifications
```typescript
useEffect(() => {
  const loadNotifications = async () => {
    if (!currentUser || currentUser.isGuest) return;

    try {
      // Fetch unread messages
      const messagesResponse = await fetch(
        `${API_BASE}/api/messages/stats/${currentUser.accountId}`
      );
      if (messagesResponse.ok) {
        const data = await messagesResponse.json();
        setUnreadMessagesCount(Number(data.unread) || 0);
      }

      // Fetch pending friend requests
      const friendsResponse = await fetch(
        `${API_BASE}/api/friends/pending`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (friendsResponse.ok) {
        const data = await friendsResponse.json();
        setPendingFriendRequestsCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  loadNotifications();
  const interval = setInterval(loadNotifications, 30000); // Refresh every 30s
  return () => clearInterval(interval);
}, [currentUser]);
```

#### 3. Badge UI Component
```tsx
{unreadMessagesCount > 0 && (
  <span style={{
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    borderRadius: '50%',
    minWidth: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    border: '2px solid #1a1a2e',
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)'
  }}>
    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
  </span>
)}
```

## Styling

### Badge Style
- **Position:** Absolute, góc trên-phải của button (-8px top/right)
- **Background:** Red gradient (#ef4444 → #dc2626)
- **Size:** Tối thiểu 20x20px, tròn (borderRadius: 50%)
- **Border:** 2px solid #1a1a2e (màu background)
- **Shadow:** Glow effect với rgba(239, 68, 68, 0.5)
- **Text:** White, bold, 0.75rem

### Button Position
- Thêm `position: 'relative'` cho button để badge absolute positioning hoạt động đúng

## API Endpoints

### Get Unread Messages Count
```http
GET /api/messages/stats/:userId

Response:
{
  "total": 15,
  "unread": 5,      ← Số tin nhắn chưa đọc
  "starred": 2,
  "system": 3,
  "admin_reply": 1,
  "player_message": 11
}
```

### Get Pending Friend Requests Count
```http
GET /api/friends/pending
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 3,       ← Số lời mời chờ xử lý
  "requests": []
}
```

## Refresh Strategy

### Auto-refresh
- Interval: **30 giây**
- Chỉ chạy khi user đã đăng nhập (không phải guest)
- Clear interval khi component unmount

### Manual Refresh
- Khi mở Inbox Modal → reload tin nhắn → badge tự cập nhật
- Khi mở Friends Manager → reload requests → badge tự cập nhật

## Testing

### Test Inbox Badge
1. Đăng nhập với user A
2. Từ user B, gửi tin nhắn cho user A
3. Kiểm tra badge "📬 Hộp thư" hiển thị số 1
4. Mở Inbox, đọc tin nhắn
5. Badge biến mất

### Test Friends Badge
1. Đăng nhập với user A
2. Từ user B, gửi lời mời kết bạn cho user A
3. Kiểm tra badge "👥 Bạn bè" hiển thị số 1
4. Mở Friends Manager, accept/reject request
5. Badge biến mất

### Test 99+ Limit
1. Tạo >100 tin nhắn chưa đọc
2. Badge hiển thị "99+"

## Notes

- Badge chỉ hiển thị khi count > 0
- Auto-refresh mỗi 30 giây để real-time
- Guest users không có badge
- Badge có animation pulse khi hover button (từ button style)

## Future Improvements

- [ ] Socket.IO real-time updates (không cần polling 30s)
- [ ] Badge animation khi có thông báo mới
- [ ] Sound notification
- [ ] Toast notification
