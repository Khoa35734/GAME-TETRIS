# ✅ Friends Online/Offline Status System

## 🎯 Tính Năng Mới

Hiển thị trạng thái **online/offline** của bạn bè trong thời gian thực với:
- 🟢 **Tròn xanh** (pulsing) - User đang online
- ⚪ **Tròn xám** - User offline
- 📡 **Real-time updates** - Socket.IO broadcasting

---

## 🔧 Thay Đổi Technical

### **1. Server Side (Backend)**

#### A. `server/src/index.ts`

**Tracking System:**
```typescript
// Map để theo dõi userId online
const onlineUsers = new Map<number, string>(); // userId -> socketId
```

**Authentication Event:**
```typescript
// Client gửi userId sau khi login
socket.on('user:authenticate', (userId: number) => {
  if (userId && typeof userId === 'number') {
    onlineUsers.set(userId, socket.id);
    console.log(`[Online] User ${userId} connected`);
    
    // Broadcast user online to all clients
    io.emit('user:online', userId);
  }
});
```

**Disconnect Handling:**
```typescript
socket.on('disconnect', async () => {
  // Remove user from online tracking
  for (const [userId, sockId] of onlineUsers.entries()) {
    if (sockId === socket.id) {
      onlineUsers.delete(userId);
      console.log(`[Offline] User ${userId} disconnected`);
      
      // Broadcast user offline
      io.emit('user:offline', userId);
      break;
    }
  }
});
```

**Exported Functions:**
```typescript
export function isUserOnline(userId: number): boolean {
  return onlineUsers.has(userId);
}

export function getOnlineUsers(): number[] {
  return Array.from(onlineUsers.keys());
}
```

#### B. `server/src/routes/friends.ts`

**Updated Friend Response:**
```typescript
import { isUserOnline } from '../index';

// GET /api/friends - Include online status
res.json({
  success: true,
  friends: friends.map((f) => ({
    userId: f.user_id,
    username: f.user_name,
    email: f.email,
    createdAt: f.created_at,
    isOnline: isUserOnline(f.user_id), // ✨ NEW
  })),
});
```

---

### **2. Client Side (Frontend)**

#### A. `client/src/services/friendsService.ts`

**Updated Interface:**
```typescript
export interface Friend {
  userId: number;
  username: string;
  email: string;
  createdAt: string;
  isOnline?: boolean; // ✨ NEW - Online status
}
```

#### B. `client/src/components/HomeMenu.tsx`

**Authentication on Login:**
```typescript
import socket from '../socket';

const handleLogin = async (e: React.FormEvent) => {
  // ... login logic ...
  
  if (result.success && result.user) {
    setCurrentUser(user);
    
    // ✨ NEW: Send authentication to server
    socket.emit('user:authenticate', result.user.accountId);
  }
};
```

**Authentication on Register:**
```typescript
const handleRegister = async (e: React.FormEvent) => {
  // ... register logic ...
  
  if (result.success && result.user) {
    setCurrentUser(user);
    
    // ✨ NEW: Send authentication to server
    socket.emit('user:authenticate', result.user.accountId);
  }
};
```

#### C. `client/src/components/FriendsManager.tsx`

**Socket Import:**
```typescript
import socket from '../socket';
```

**Real-time Updates:**
```typescript
useEffect(() => {
  const handleUserOnline = (userId: number) => {
    setFriends((prev) =>
      prev.map((f) => (f.userId === userId ? { ...f, isOnline: true } : f))
    );
  };

  const handleUserOffline = (userId: number) => {
    setFriends((prev) =>
      prev.map((f) => (f.userId === userId ? { ...f, isOnline: false } : f))
    );
  };

  socket.on('user:online', handleUserOnline);
  socket.on('user:offline', handleUserOffline);

  return () => {
    socket.off('user:online', handleUserOnline);
    socket.off('user:offline', handleUserOffline);
  };
}, []);
```

**Online Indicator Component:**
```typescript
const OnlineIndicator = styled.div<{ isOnline: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${(props) => (props.isOnline ? '#4ecdc4' : '#666')};
  box-shadow: ${(props) =>
    props.isOnline ? '0 0 8px rgba(78, 205, 196, 0.8)' : 'none'};
  
  ${(props) =>
    props.isOnline &&
    `
    &::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid rgba(78, 205, 196, 0.3);
      animation: pulse 2s ease-in-out infinite;
    }
  `}

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.5; }
  }
`;
```

**Updated UI:**
```tsx
<UserCard key={friend.userId}>
  <UserInfo>
    <UserHeader>
      <OnlineIndicator isOnline={friend.isOnline || false} />
      <Username>{friend.username}</Username>
    </UserHeader>
    <UserDetail>User ID: #{friend.userId}</UserDetail>
    <UserDetail>{friend.email}</UserDetail>
    <UserDetail style={{ color: friend.isOnline ? '#4ecdc4' : '#666' }}>
      {friend.isOnline ? '🟢 Online' : '⚪ Offline'}
    </UserDetail>
  </UserInfo>
</UserCard>
```

---

## 🎨 Visual Design

### **Online Status Indicator**

**Online (Green):**
```
┌─────────────────────┐
│ 🟢 Username         │ ← Pulsing green dot + glow
│ User ID: #123       │
│ email@example.com   │
│ 🟢 Online           │ ← Text status
└─────────────────────┘
```

**Offline (Gray):**
```
┌─────────────────────┐
│ ⚪ Username         │ ← Static gray dot
│ User ID: #456       │
│ email@example.com   │
│ ⚪ Offline          │ ← Text status
└─────────────────────┘
```

### **Color Scheme**

| Status | Dot Color | Glow | Text Color |
|--------|-----------|------|------------|
| Online | `#4ecdc4` (Teal) | `rgba(78, 205, 196, 0.8)` | `#4ecdc4` |
| Offline | `#666` (Gray) | None | `#666` |

### **Animation**

**Pulse Effect (Online only):**
- Duration: 2s
- Easing: ease-in-out
- Effect: Scale from 1.0 → 1.2 → 1.0
- Opacity: 1.0 → 0.5 → 1.0

---

## 📡 Socket.IO Events

### **Client → Server**

| Event | Payload | When | Purpose |
|-------|---------|------|---------|
| `user:authenticate` | `userId: number` | After login/register | Tell server "I'm online" |

### **Server → All Clients**

| Event | Payload | When | Purpose |
|-------|---------|------|---------|
| `user:online` | `userId: number` | User connects | Broadcast "User X is now online" |
| `user:offline` | `userId: number` | User disconnects | Broadcast "User X went offline" |

---

## 🔄 Data Flow

### **1. User Login Flow**

```
User
  ↓ (login)
AuthService
  ↓ (success)
HomeMenu
  ↓ socket.emit('user:authenticate', userId)
Server
  ↓ onlineUsers.set(userId, socketId)
  ↓ io.emit('user:online', userId)
All Connected Clients
  ↓ Update friend list UI
FriendsManager (green dot appears)
```

### **2. User Disconnect Flow**

```
User closes browser/tab
  ↓
Socket.IO disconnect event
  ↓
Server
  ↓ onlineUsers.delete(userId)
  ↓ io.emit('user:offline', userId)
All Connected Clients
  ↓ Update friend list UI
FriendsManager (dot turns gray)
```

### **3. Real-time Update Flow**

```
Friend A logs in
  ↓ emit('user:online', userA_id)
Your Browser (watching friend list)
  ↓ socket.on('user:online')
  ↓ setFriends(prev => update userA isOnline=true)
React Re-render
  ↓ Green dot + "🟢 Online" appears
```

---

## 🧪 Testing Checklist

### **Server Testing**

- [ ] Server starts without errors
- [ ] `onlineUsers` Map initialized
- [ ] `isUserOnline()` function exported
- [ ] `/api/friends` returns `isOnline` field

### **Client Testing**

**Single User:**
- [ ] Login → `user:authenticate` emitted
- [ ] Register → `user:authenticate` emitted
- [ ] Logout/disconnect → removed from online users

**Multiple Users (2+ browsers):**
- [ ] User A logs in → User B sees green dot
- [ ] User A logs out → User B sees gray dot
- [ ] User A refreshes → Status persists
- [ ] Both users online → Both see green dots

**Friends Manager:**
- [ ] Friends list loads with online status
- [ ] Green dot pulses for online friends
- [ ] Gray dot static for offline friends
- [ ] Text shows "🟢 Online" or "⚪ Offline"
- [ ] Real-time updates without refresh

**Edge Cases:**
- [ ] Friend not in list → No error
- [ ] Multiple tabs same user → Works correctly
- [ ] Network disconnect → Properly handled
- [ ] Server restart → Clients reconnect

---

## 🐛 Troubleshooting

### **Issue 1: Status không update**

**Symptoms:** Bạn bè vẫn offline dù đang online

**Debug:**
```javascript
// Browser Console (Client)
socket.on('user:online', (userId) => {
  console.log('User online:', userId);
});

socket.on('user:offline', (userId) => {
  console.log('User offline:', userId);
});
```

**Check Server:**
```typescript
// server/src/index.ts
console.log('Online users:', Array.from(onlineUsers.keys()));
```

**Solutions:**
1. Kiểm tra socket connected: `socket.connected` (should be `true`)
2. Kiểm tra userId đúng format (number, not string)
3. Verify `user:authenticate` được gọi sau login

### **Issue 2: Không gửi user:authenticate**

**Symptoms:** Không có event nào được emit sau login

**Check:**
```typescript
// HomeMenu.tsx - handleLogin
console.log('Emitting authenticate:', result.user.accountId);
socket.emit('user:authenticate', result.user.accountId);
```

**Solutions:**
1. Import socket: `import socket from '../socket'`
2. Kiểm tra `result.user.accountId` có giá trị
3. Verify socket.io client connected

### **Issue 3: Tất cả đều offline**

**Symptoms:** Tất cả friends hiển thị offline

**Check Server Route:**
```typescript
// server/src/routes/friends.ts
console.log('isUserOnline import:', typeof isUserOnline);
console.log('Friend online status:', isUserOnline(f.user_id));
```

**Solutions:**
1. Verify `isUserOnline` được export từ `index.ts`
2. Check import path đúng
3. Restart server sau khi thay đổi code

---

## 📊 Performance Considerations

### **Memory Usage**

```typescript
// Với 1000 users online:
onlineUsers Map: ~1000 entries × (8 bytes key + 20 bytes socketId) = ~28KB
```

**Optimization:**
- Map structure: O(1) lookup
- Broadcast events: Only send userId (4-8 bytes)
- No polling required (push-based)

### **Network Traffic**

**Per User Login:**
- 1 emit `user:authenticate`: ~50 bytes
- 1 broadcast `user:online`: ~50 bytes × N clients

**Per User Disconnect:**
- 1 broadcast `user:offline`: ~50 bytes × N clients

**Total:** Minimal overhead (~100 bytes per status change)

---

## ✨ Future Enhancements

### **1. Last Seen Timestamp**
```typescript
interface Friend {
  lastSeen?: Date; // "Last seen 5 minutes ago"
}
```

### **2. Custom Status Messages**
```typescript
interface Friend {
  statusMessage?: string; // "Playing Tetris", "Away"
}
```

### **3. Do Not Disturb Mode**
```typescript
interface Friend {
  status: 'online' | 'offline' | 'away' | 'dnd';
}
```

### **4. Online Friends Counter**
```typescript
// Show "3 friends online" at the top
const onlineCount = friends.filter(f => f.isOnline).length;
```

### **5. Sort by Online Status**
```typescript
// Online friends first, then offline
const sortedFriends = [...friends].sort((a, b) => 
  (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)
);
```

---

## 🎉 Summary

### **What Was Added:**

✅ **Server:**
- `onlineUsers` Map tracking system
- `user:authenticate` event handler
- Online/offline broadcasting
- `isUserOnline()` helper function
- Updated `/api/friends` with online status

✅ **Client:**
- `isOnline` field in Friend interface
- Socket authentication on login/register
- Real-time socket listeners
- Animated online indicator (pulsing green)
- Static offline indicator (gray)
- "🟢 Online" / "⚪ Offline" text labels

### **Benefits:**

🎯 **User Experience:**
- See which friends are active
- No need to refresh page
- Clear visual indicators
- Real-time updates

⚡ **Performance:**
- Efficient Map-based tracking
- Minimal network overhead
- Push-based (no polling)
- O(1) lookup complexity

🔒 **Reliability:**
- Automatic disconnect detection
- Cleanup on user logout
- Socket.IO guaranteed delivery

---

**Test ngay:** 
1. Mở 2 browsers
2. Login với 2 accounts khác nhau (đã là friends)
3. Xem sidebar "Bạn bè" → Tròn xanh xuất hiện! 🟢
4. Đóng 1 browser → Tròn chuyển xám ⚪

🚀 **Status: READY FOR TESTING**
