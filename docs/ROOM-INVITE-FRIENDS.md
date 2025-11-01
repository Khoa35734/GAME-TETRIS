# Room Invite Friends Feature

## 📋 Summary
Added friend invitation feature to Custom Room (RoomLobby). Host can invite friends to join the room, with only online friends being invitable.

## ✅ Features Implemented

### 1. **Invite Button**
- ✅ Only visible to **Host**
- ✅ Only visible when **room is not full** (players < maxPlayers)
- ✅ Located at bottom of Players panel
- ✅ Purple-themed button matching friends feature

### 2. **Friends List Modal**
- ✅ Shows all friends (both online and offline)
- ✅ **Online friends**: Green indicator, can be invited
- ✅ **Offline friends**: Gray indicator, invite button disabled
- ✅ Real-time online status from friends list API

### 3. **Invite Functionality**
- ✅ Click "Mời" button to send invitation
- ✅ Socket event `room:invite` sent to server
- ✅ Success message shown in chat
- ✅ Loading state while sending invite
- ✅ Error handling with alert

---

## 🎨 UI Components

### Invite Button (Host Only)
```tsx
{isHost && players.length < maxPlayers && (
  <button onClick={openInviteModal}>
    👥 Mời bạn bè
  </button>
)}
```

**Conditions:**
- User is host: `isHost === true`
- Room not full: `players.length < maxPlayers`
- Purple theme: `rgba(156, 39, 176, ...)`

### Friends List Modal
**Structure:**
```
┌─────────────────────────────┐
│ 👥 Mời bạn bè            ✕  │
├─────────────────────────────┤
│ 🟢 Friend1 (Online)    [Mời]│
│ ⚫ Friend2 (Offline) [Offline]│
│ 🟢 Friend3 (Online)    [Mời]│
└─────────────────────────────┘
```

**Friend Card:**
- Online indicator: Green dot with glow (online) / Gray dot (offline)
- Username: Bold, white (online) / gray (offline)
- Status text: "🟢 Đang online" / "⚫ Offline"
- Invite button: Enabled (online) / Disabled (offline)

---

## 📡 Socket Events

### Client → Server

**Event:** `room:invite`

**Payload:**
```typescript
{
  roomId: string,        // Room ID to invite to
  friendId: number,      // Friend's account ID
  friendUsername: string, // Friend's username
  inviterName: string    // Inviter's display name
}
```

**Response:**
```typescript
{
  ok: boolean,
  error?: string
}
```

---

## 🔄 Data Flow

### 1. Open Modal Flow
```
User clicks "Mời bạn bè"
    ↓
openInviteModal() called
    ↓
setShowInviteModal(true)
    ↓
fetchFriends() called
    ↓
GET /api/friends/list
    ↓
setFriends(data.friends)
    ↓
Modal renders with friends list
```

### 2. Send Invite Flow
```
User clicks "Mời" on online friend
    ↓
inviteFriend(friendId, username) called
    ↓
socket.emit('room:invite', {...})
    ↓
Server processes invite
    ↓
Response received
    ↓
Success: Show message in chat
Error: Show alert
```

---

## 🎯 TypeScript Types

```typescript
type Friend = {
  friendId: number;
  friendUsername: string;
  status: string;
  isOnline: boolean;
};
```

**State Variables:**
```typescript
const [showInviteModal, setShowInviteModal] = useState(false);
const [friends, setFriends] = useState<Friend[]>([]);
const [loadingFriends, setLoadingFriends] = useState(false);
const [invitingFriends, setInvitingFriends] = useState<Set<number>>(new Set());
```

---

## 🔧 Key Functions

### `fetchFriends()`
```typescript
const fetchFriends = async () => {
  setLoadingFriends(true);
  const token = localStorage.getItem('tetris:token');
  const response = await fetch(`${getApiBaseUrl()}/friends/list`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  setFriends(data.friends || []);
  setLoadingFriends(false);
};
```

**Purpose:** Fetch friends list from API with auth token

### `openInviteModal()`
```typescript
const openInviteModal = () => {
  setShowInviteModal(true);
  fetchFriends();
};
```

**Purpose:** Show modal and load friends list

### `inviteFriend(friendId, friendUsername)`
```typescript
const inviteFriend = (friendId: number, friendUsername: string) => {
  setInvitingFriends(prev => new Set(prev).add(friendId));
  
  socket.emit('room:invite', {
    roomId,
    friendId,
    friendUsername,
    inviterName: displayName
  }, (response: any) => {
    setInvitingFriends(prev => {
      const newSet = new Set(prev);
      newSet.delete(friendId);
      return newSet;
    });

    if (response?.ok) {
      setChatMessages(prev => [...prev, {
        from: 'system',
        message: `✉️ Đã gửi lời mời đến ${friendUsername}`,
        ts: Date.now()
      }]);
    } else {
      alert(`Không thể gửi lời mời: ${response?.error}`);
    }
  });
};
```

**Purpose:** Send invitation to friend via socket

---

## 🎨 Styling

### Theme Colors
- **Purple (Main):** `rgba(156, 39, 176, ...)`
- **Online Green:** `#4ecdc4` / `rgba(78, 205, 196, ...)`
- **Offline Gray:** `#888` / `#666`
- **Error Red:** `rgba(244, 67, 54, ...)`

### Invite Button
```css
background: rgba(156, 39, 176, 0.2)
border: 1px solid rgba(156, 39, 176, 0.5)
color: #ba68c8
```

**Hover:**
```css
background: rgba(156, 39, 176, 0.3)
transform: translateY(-2px)
```

### Friend Card (Online)
```css
background: rgba(78, 205, 196, 0.1)
border: 1px solid rgba(78, 205, 196, 0.3)
```

### Friend Card (Offline)
```css
background: rgba(255, 255, 255, 0.05)
border: 1px solid rgba(255, 255, 255, 0.1)
```

---

## 🚀 Usage Example

### Host invites friend:
1. Host opens room lobby
2. Clicks "👥 Mời bạn bè" button
3. Modal opens showing friends list
4. Online friends have green indicator and enabled "Mời" button
5. Offline friends have gray indicator and disabled button
6. Click "Mời" on online friend
7. Button shows "⏳ Đang gửi..." while processing
8. Success: Chat message "✉️ Đã gửi lời mời đến [username]"
9. Error: Alert with error message

### Friend receives invite:
- *(Server-side implementation needed)*
- Friend should receive notification
- Friend can click to join room

---

## 📌 Server-Side TODO

The client is ready, but server needs to implement:

1. **Socket handler** for `room:invite` event
2. **Notification system** to send invite to friend
3. **Validation:**
   - Check if friend is online
   - Check if room exists and not full
   - Check if friend is not already in room
4. **Response** with ok/error status

---

## 🔒 Security & Validation

### Client-side checks:
- ✅ Only host can see invite button
- ✅ Only shown when room not full
- ✅ Only online friends can be invited
- ✅ Auth token required for friends list API
- ✅ Duplicate invite prevention (loading state)

### Server-side checks needed:
- ⚠️ Verify sender is room host
- ⚠️ Verify friend exists and is online
- ⚠️ Verify room exists and has space
- ⚠️ Verify friend not already in room

---

## 📁 Files Modified

1. **client/src/components/RoomLobby.tsx**
   - Added Friend type
   - Added state variables (showInviteModal, friends, loadingFriends, invitingFriends)
   - Added fetchFriends() function
   - Added openInviteModal() function
   - Added inviteFriend() function
   - Added Invite Button UI (in Players panel)
   - Added Friends List Modal UI

---

## ✨ Benefits

1. **Social Integration:** Connect friends system with room system
2. **Better UX:** Easy way to play with friends
3. **Visual Clarity:** Clear distinction between online/offline friends
4. **Instant Feedback:** Loading states and success messages
5. **Access Control:** Only online friends can be invited

---

## 🎮 User Experience

**Before:**
- No way to invite friends to room
- Must manually share room ID
- Friends need to copy/paste room ID

**After:**
- ✅ One-click invite for online friends
- ✅ Visual friends list in room
- ✅ Clear online/offline status
- ✅ Instant notification in chat
- ✅ Disabled state for offline friends

---

**Date:** October 14, 2025
**Status:** ✅ Client-side Complete, Server-side Pending
