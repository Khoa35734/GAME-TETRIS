# Room Invitation System - Testing Guide 🧪

## 📋 Test Scenarios

### ✅ **Test 1: Successful Invitation Flow**

**Prerequisites:**
- User A (Host) has created a custom room
- User B (Friend) is online and in User A's friend list
- Room has available space

**Steps:**
1. User A creates custom room (max 4 players)
2. User A clicks "👥 Mời bạn bè" button
3. Modal opens with friends list
4. User B appears with 🟢 green indicator (online)
5. User A clicks "✉️ Mời" button next to User B's name
6. Modal closes
7. Chat shows: "✉️ Đã gửi lời mời đến [User B]"
8. User B sees notification in top-right corner
9. User B clicks "✓ Tham gia"
10. User B is navigated to room lobby
11. Both users see updated player list

**Expected Results:**
- ✅ Invitation sent successfully
- ✅ Notification appears for User B
- ✅ User B joins room
- ✅ Player list updates for both users

---

### ❌ **Test 2: Friend Offline**

**Prerequisites:**
- User A (Host) is in custom room
- User B (Friend) is offline

**Steps:**
1. User A clicks "👥 Mời bạn bè"
2. Modal opens
3. User B appears with ⚫ gray indicator (offline)
4. "Mời" button is disabled with text "🚫 Offline"
5. User A tries to click (button does not respond)

**Expected Results:**
- ✅ Button is disabled (visual feedback)
- ✅ No invite sent
- ✅ No error shown (client prevents the action)

---

### ❌ **Test 3: Room Full**

**Prerequisites:**
- User A (Host) is in custom room with max players (4/4)
- User B (Friend) is online

**Steps:**
1. User A tries to click "👥 Mời bạn bè" button
2. Button should NOT be visible (conditional: players.length < maxPlayers)

**Alternative (if button somehow visible):**
1. User A clicks "Mời" for User B
2. Server validates and responds with error
3. Alert shows: "Không thể gửi lời mời: Phòng đã đầy"

**Expected Results:**
- ✅ Button hidden when room full
- ✅ OR error message if validation bypassed

---

### ❌ **Test 4: Non-Host Tries to Invite**

**Prerequisites:**
- User A (Host) creates custom room
- User B (Player) joins as non-host

**Steps:**
1. User B looks for "👥 Mời bạn bè" button
2. Button should NOT be visible (conditional: isHost)

**Expected Results:**
- ✅ Button not shown to non-host players
- ✅ Only host can access invite feature

---

### ❌ **Test 5: Friend Already in Room**

**Prerequisites:**
- User A (Host) is in custom room
- User B (Friend) is already a player in the room
- User C (Friend) is online

**Steps:**
1. User A clicks "👥 Mời bạn bè"
2. Modal opens with friends list
3. User B should appear in list (if they're still friends)
4. User A clicks "Mời" for User B
5. Server validates and detects User B is already in room
6. Alert shows: "Không thể gửi lời mời: [User B] đã ở trong phòng"

**Expected Results:**
- ✅ Server prevents duplicate invitation
- ✅ Error message displayed
- ✅ Modal remains open (user can try another friend)

---

### ⏱️ **Test 6: Invitation Timeout**

**Prerequisites:**
- User A sends invitation to User B
- User B receives notification

**Steps:**
1. User B sees notification appear
2. User B takes no action (neither Accept nor Decline)
3. Wait 15 seconds
4. Notification disappears automatically

**Expected Results:**
- ✅ Notification auto-dismisses after 15 seconds
- ✅ No error occurs
- ✅ User B can still manually join room via /online/join

---

### 🔄 **Test 7: Multiple Invitations**

**Prerequisites:**
- User A (Host) is in custom room
- User B, C, D are all online friends

**Steps:**
1. User A invites User B → Success message
2. User A immediately invites User C → Success message
3. User A immediately invites User D → Success message
4. All three users receive notifications simultaneously
5. User B accepts → Joins room (3/4 players)
6. User C accepts → Joins room (4/4 players - room full)
7. User D accepts → Error: "Phòng đã đầy"

**Expected Results:**
- ✅ All invitations sent successfully
- ✅ First two friends join successfully
- ✅ Third friend sees room full error

---

### 🔄 **Test 8: Invitation Notification Stacking**

**Prerequisites:**
- User A is in multiple friend lists (B, C, D)
- Users B, C, D are all hosts of different rooms

**Steps:**
1. User B invites User A to Room 1
2. User C invites User A to Room 2
3. User D invites User A to Room 3
4. User A receives 3 stacked notifications (max 3 displayed)

**Expected Results:**
- ✅ Up to 3 notifications displayed
- ✅ Notifications stacked vertically
- ✅ Each has independent Accept/Decline buttons
- ✅ User can accept/decline individually

---

### ❌ **Test 9: Host Leaves Before Friend Accepts**

**Prerequisites:**
- User A (Host) creates room and invites User B
- User B receives notification

**Steps:**
1. User B sees notification (deciding whether to accept)
2. User A leaves the room
3. Room is deleted (no other players)
4. User B clicks "✓ Tham gia"
5. User B is navigated to `/room/[roomId]`
6. Server responds: "Match not found"
7. RoomLobby shows error and navigates back

**Expected Results:**
- ✅ Graceful error handling
- ✅ User B sees "Phòng không tồn tại"
- ✅ Auto-redirect to online menu after 3 seconds

---

### ❌ **Test 10: Host Transfer After Invite**

**Prerequisites:**
- User A (Host) creates room
- User C is already in room as player
- User A invites User B

**Steps:**
1. User A invites User B → Notification sent
2. User A leaves room
3. User C becomes new host (host transfer)
4. User B accepts invitation
5. User B joins room with new host (User C)

**Expected Results:**
- ✅ Host transfer occurs correctly
- ✅ User B can still join room
- ✅ User C is now host, User B is player

---

## 🐛 Edge Cases to Test

### **Edge Case 1: Rapid Invite Spam**
**Scenario:** Host clicks "Mời" button repeatedly on same friend

**Expected Behavior:**
- Button should be disabled while invite is processing (invitingFriends Set)
- Server rate limiting (future enhancement)

---

### **Edge Case 2: Friend Goes Offline Mid-Invite**
**Scenario:** Friend appears online, but disconnects before invite is sent

**Expected Behavior:**
- Server checks `onlineUsers.get(friendId)` at time of invite
- Returns error: "[Username] hiện đang offline"

---

### **Edge Case 3: Room Deleted Mid-Invite**
**Scenario:** Room is deleted while invite modal is open

**Expected Behavior:**
- Server validates `matchManager.getMatch(roomId)`
- Returns error: "Phòng không tồn tại"

---

### **Edge Case 4: Accept Multiple Invitations**
**Scenario:** User receives invites from Room A and Room B, accepts both

**Expected Behavior:**
- First accept: User joins Room A successfully
- Second accept: Error - User already in a room (if implemented)
- OR: User leaves Room A and joins Room B (current behavior)

---

## 🔍 Server Logs to Verify

### **Successful Invitation:**
```
[room:invite] ✅ Invitation sent from [Host Name] to [Friend Name] (123456) for room abcd1234
```

### **Validation Errors:**
```
[room:invite] ❌ Missing required fields
[room:invite] ❌ Match not found: [roomId]
[room:invite] ❌ Only host can invite
[room:invite] ❌ Room is full
[room:invite] ❌ Friend is offline: 123456
[room:invite] ❌ Friend already in room
```

---

## 🎯 Client Console Logs to Verify

### **Invitation Sent:**
```javascript
console.log('Invitation sent to friend:', friendUsername);
```

### **Invitation Received:**
```javascript
console.log('[InvitationNotification] Received invitation:', {
  roomId: 'abcd1234',
  roomName: 'Custom Room',
  inviterName: 'Host Name',
  maxPlayers: 4,
  currentPlayers: 2
});
```

### **Invitation Accepted:**
```javascript
console.log('[InvitationNotification] Accepting invitation to room:', roomId);
```

### **Invitation Declined:**
```javascript
console.log('[InvitationNotification] Declining invitation:', roomId);
```

---

## 📊 Testing Checklist

### **Functionality Tests:**
- [ ] Host can open invite modal
- [ ] Friends list loads correctly
- [ ] Online friends show green indicator
- [ ] Offline friends show gray indicator
- [ ] Invite button works for online friends
- [ ] Invite button disabled for offline friends
- [ ] Success message appears in chat
- [ ] Modal closes after successful invite
- [ ] Notification appears for invited friend
- [ ] Accept button navigates to room
- [ ] Decline button dismisses notification
- [ ] Auto-dismiss after 15 seconds works

### **Validation Tests:**
- [ ] Non-host cannot see invite button
- [ ] Cannot invite when room full
- [ ] Cannot invite offline friends (client-side)
- [ ] Server rejects offline friend invites
- [ ] Server rejects when room full
- [ ] Server rejects non-host invites
- [ ] Server prevents duplicate invites

### **UI/UX Tests:**
- [ ] Modal has correct styling (purple theme)
- [ ] Online indicator has green glow effect
- [ ] Buttons have hover effects
- [ ] Notification has slide-in animation
- [ ] Notification stacking works (max 3)
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly

### **Performance Tests:**
- [ ] Friends list loads quickly
- [ ] Invite sends without delay
- [ ] Notification appears immediately
- [ ] No memory leaks (cleanup listeners)
- [ ] Multiple notifications don't lag

---

## 🚀 Manual Testing Steps

### **Setup:**
1. Start server: `cd server && npm run dev`
2. Start client: `cd client && npm run dev`
3. Open 2 browser windows (User A and User B)
4. Create accounts for both users
5. Add each other as friends

### **Test Execution:**
1. **User A:** Create custom room (max 4 players)
2. **User A:** Click "👥 Mời bạn bè" button
3. Verify friends list loads
4. Verify User B shows as online (green indicator)
5. **User A:** Click "Mời" next to User B
6. Verify success message in chat
7. **User B:** Check for notification in top-right
8. Verify notification has all details (room name, player count)
9. **User B:** Click "✓ Tham gia"
10. Verify User B joins room successfully
11. Verify both users see updated player list

### **Expected Results:**
✅ All steps complete without errors  
✅ Invitation system works end-to-end  
✅ UI is responsive and user-friendly  

---

## 🎉 Success Criteria

The room invitation system is considered **fully functional** when:

✅ Host can invite online friends from custom room  
✅ Invited friends receive real-time notifications  
✅ Friends can accept and join the room  
✅ Friends can decline or ignore invitations  
✅ All validation works (host-only, room capacity, online status)  
✅ Error messages are clear and helpful  
✅ UI is consistent with app design (purple theme)  
✅ No console errors or warnings  
✅ Server logs show correct validation flow  

---

## 📝 Test Report Template

```markdown
## Test Report: Room Invitation System

**Date:** [Date]
**Tester:** [Name]
**Build:** [Version/Commit Hash]

### Test Results:

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| T1 | Successful Invitation Flow | ✅ PASS | |
| T2 | Friend Offline | ✅ PASS | |
| T3 | Room Full | ✅ PASS | |
| T4 | Non-Host Invite | ✅ PASS | |
| T5 | Friend Already in Room | ✅ PASS | |
| T6 | Invitation Timeout | ✅ PASS | |
| T7 | Multiple Invitations | ✅ PASS | |
| T8 | Notification Stacking | ✅ PASS | |
| T9 | Host Leaves | ✅ PASS | |
| T10 | Host Transfer | ✅ PASS | |

### Issues Found:
1. [Issue description]
2. [Issue description]

### Overall Status: ✅ PASS / ❌ FAIL

### Recommendations:
- [Recommendation 1]
- [Recommendation 2]
```

---

✅ **All tests documented and ready for execution!**
