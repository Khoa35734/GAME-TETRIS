# 🔍 WEBRTC DEBUG GUIDE - Step by Step

## 📋 **Current Issue**
- ❌ **Board đối phương không hiển thị realtime**
- ❌ **Chỉ thấy "TCP Mode" thay vì "UDP Active"**
- ❌ **WebRTC connection không establish**

---

## 🧪 **Debug Steps**

### **Step 1: Kiểm tra Console Logs**

**Mở 2 browsers → Custom room → Start game**

**Expected logs trong console:**

#### **🎧 Game Start Event:**
```
🚨 [DEBUG] Setting up game:start listener
🚨 [DEBUG] handleGameStartForWebRTC called with: { opponent: "SOCKET_ID" }
🚨 [DEBUG] Current roomId: ROOM_ID
🚨 [DEBUG] My socket.id: MY_SOCKET_ID
✅ [WebRTC] 🎮 Game started!
✅ [WebRTC] My socket.id: MY_SOCKET_ID
✅ [WebRTC] Opponent socket.id: OPPONENT_SOCKET_ID
✅ [WebRTC] I am 🏠 HOST (will create offer) / 📡 PEER (will receive offer)
🆕 [WebRTC] No existing connection, starting fresh...
🚀 [WebRTC] Starting fresh connection...
```

#### **🚀 WebRTC Initialization:**
```
🚨 [DEBUG] initWebRTC called with isHost: true/false
🚨 [DEBUG] Current roomId: ROOM_ID
🚨 [DEBUG] pcRef.current exists: false
🚚 [DEBUG] closingRef.current: false
🚀 [WebRTC] Initializing as HOST/PEER
```

#### **🏠 HOST Side:**
```
🏠 [WebRTC] HOST: Creating data channel...
📤 [WebRTC] Creating offer...
📤 [WebRTC] Sending offer to room: ROOM_ID
```

#### **📡 PEER Side:**
```
🚨 [DEBUG] WebRTC offer received
🚨 [DEBUG] Offer details: { type: "offer", sdp: 2000+ }
📥 [WebRTC] Received offer, creating answer...
📨 [WebRTC] Data channel received (answerer)
✅ [WebRTC] Remote description set
📤 [WebRTC] Sending answer to room: ROOM_ID
```

#### **✅ Connection Success:**
```
✅ [WebRTC] UDP channel OPEN (host/answerer)
```

### **Step 2: Check for Missing Logs**

**❌ Nếu KHÔNG thấy logs:**

1. **Game Start Event không trigger:**
   ```
   // Không thấy: "🚨 [DEBUG] handleGameStartForWebRTC called"
   → Server không gửi game:start với opponent field
   ```

2. **initWebRTC không được gọi:**
   ```
   // Không thấy: "🚨 [DEBUG] initWebRTC called"
   → setTimeout hoặc dependency issue
   ```

3. **WebRTC signaling lỗi:**
   ```
   // Không thấy: "🚨 [DEBUG] WebRTC offer received"
   → Signaling events không được relay
   ```

4. **DataChannel không open:**
   ```
   // Không thấy: "✅ [WebRTC] UDP channel OPEN"
   → ICE negotiation failed
   ```

### **Step 3: Manual Debug Commands**

**Mở Console trong game và chạy:**

```javascript
// 1. Check current state
console.log('=== WebRTC Debug Info ===');
console.log('roomId:', roomId);
console.log('socket.id:', socket.id);
console.log('isRtcReady:', isRtcReady);
console.log('pcRef.current:', pcRef.current);
console.log('dcRef.current:', dcRef.current);
console.log('dcRef.current?.readyState:', dcRef.current?.readyState);
console.log('pcRef.current?.connectionState:', pcRef.current?.connectionState);

// 2. Check UDP stats
console.log('UDP Stats:', udpStatsRef.current);

// 3. Force manual WebRTC init (as HOST)
initWebRTC(true);

// 4. Force manual WebRTC init (as PEER)  
initWebRTC(false);

// 5. Test UDP send
sendViaUDP('test', { message: 'hello from console' });

// 6. Check if game:start listener is attached
console.log('Socket listeners:', socket.listeners('game:start'));
```

### **Step 4: Server-Side Debug**

**Kiểm tra server logs cho:**

```
[Room ROOM_ID] ✅ All players are ready. Sending full game data.
[Room ROOM_ID] 💾 Stored generator for Redis match  
[Room ROOM_ID] 🎮 Game started! Piece queue sent to all players.
```

**Expected server emit:**
```javascript
io.to(playerId).emit('game:start', {
  next: first,
  roomId,
  opponent: opponentId,  // ← This MUST be present
  seed: match?.seed || r?.seed
});
```

### **Step 5: Network Tab Debug**

**Chrome DevTools → Network Tab → Filter: WS**

**Expected WebSocket traffic:**
```
➡️ webrtc:offer { roomId: "ROOM_ID", offer: {...} }
⬅️ webrtc:answer { roomId: "ROOM_ID", answer: {...} }
➡️ webrtc:ice { roomId: "ROOM_ID", candidate: {...} }
⬅️ webrtc:ice { roomId: "ROOM_ID", candidate: {...} }
```

### **Step 6: WebRTC Stats**

**Advanced debug trong console:**

```javascript
// Get detailed WebRTC stats
if (pcRef.current) {
  pcRef.current.getStats().then(stats => {
    stats.forEach(report => {
      if (report.type === 'data-channel') {
        console.log('DataChannel Stats:', report);
      }
      if (report.type === 'candidate-pair') {
        console.log('ICE Candidate Pair:', report);
      }
    });
  });
}

// Check ICE connection state
console.log('ICE Connection State:', pcRef.current?.iceConnectionState);
console.log('ICE Gathering State:', pcRef.current?.iceGatheringState);
console.log('Connection State:', pcRef.current?.connectionState);
```

---

## 🔧 **Common Issues & Solutions**

### **Issue 1: game:start Event Không Nhận**

**Symptoms:**
```
// Không thấy log này:
🚨 [DEBUG] handleGameStartForWebRTC called
```

**Solutions:**
1. **Check server Redis/legacy logic**
2. **Verify `opponent` field in game:start**
3. **Check socket listener attachment**

### **Issue 2: Offer/Answer Cycle Fails**

**Symptoms:**
```
📤 [WebRTC] Sending offer to room: ROOM_ID
// Nhưng PEER không nhận được offer
```

**Solutions:**
1. **Check server WebRTC relay:**
   ```javascript
   socket.on('webrtc:offer', ({ roomId, offer }) => {
     socket.to(roomId).emit('webrtc:offer', { offer });
   });
   ```
2. **Verify both players cùng room**
3. **Check ICE candidate exchange**

### **Issue 3: DataChannel Không Open**

**Symptoms:**
```
📨 [WebRTC] Data channel received (answerer)
// Nhưng không thấy: "✅ [WebRTC] UDP channel OPEN"
```

**Solutions:**
1. **Check ICE connection state**
2. **Verify STUN servers accessible**
3. **Check firewall/NAT issues**

### **Issue 4: Same Machine Testing Issues**

**Symptoms:**
- WebRTC hoạt động trên different machines
- Nhưng fail trên same machine (2 browsers)

**Solutions:**
1. **Use different browser types** (Chrome + Firefox)
2. **Check localhost vs 127.0.0.1**
3. **Disable browser ICE restrictions**
4. **Use different ports for each browser**

---

## 🚀 **Quick Fix Commands**

**1. Force TCP Mode Test:**
```javascript
// Disable UDP to test TCP fallback
setIsRtcReady(false);
dcRef.current = null;
```

**2. Reset WebRTC Connection:**
```javascript
// Clean slate
cleanupWebRTC('manual-reset');
setTimeout(() => initWebRTC(true), 1000);
```

**3. Test Board Sync via TCP:**
```javascript
// Manually send board state via Socket.IO
socket.emit('game:state', roomId, {
  matrix: stage,
  hold: hold,
  nextFour: nextFour.slice(0, 4)
});
```

---

## 📊 **Expected Results After Fix**

**✅ Console Output:**
```
🚨 [DEBUG] handleGameStartForWebRTC called with: { opponent: "abc123" }
🚀 [WebRTC] Initializing as HOST
📤 [WebRTC] Creating offer...
📤 [WebRTC] Sending offer to room: ROOM_ID
🚨 [DEBUG] WebRTC offer received
📨 [WebRTC] Data channel received (answerer)
✅ [WebRTC] UDP channel OPEN (host)
✅ [WebRTC] UDP channel OPEN (answerer)
⚡ [UDP] Sent snapshot: matrix, hold, nextFour, combo, b2b, pendingGarbage
⚡ [UDP] Received snapshot from SOCKET_ID
📡 [UDP] ✅ Updated opponent board from UDP snapshot
```

**✅ Visual Indicators:**
- Status indicator: **⚡ UDP Active** (green background)
- Opponent board updates **instantly** when moving pieces
- Garbage attacks appear **immediately**
- Game over/topout works correctly

**✅ Performance:**
- Board sync latency: **5-20ms** (vs 50-100ms TCP)
- Garbage response: **10-30ms** (vs 100-200ms TCP)
- No visible lag when moving pieces

---

**🎯 Start with Step 1 - check console logs và report back kết quả!**