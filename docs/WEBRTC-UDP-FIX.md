# 🔧 WebRTC UDP Connection Fix - Prevent Player Disconnect

## 🐛 **Vấn Đề**

Khi WebRTC UDP được kích hoạt trong custom rooms, một trong hai player bị disconnect/crash. Nguyên nhân:

1. **Aggressive Cleanup**: `cleanupWebRTC` được gọi quá sớm khi connection đang khởi tạo
2. **Race Condition**: Cả 2 players cùng cleanup và init, gây conflict
3. **Cascade Failures**: Connection state change → cleanup → trigger thêm state change → cleanup lại
4. **`disconnected` được treat như `failed`**: WebRTC có thể tạm thời `disconnected` rồi reconnect

## ✅ **Các Fix Đã Áp Dụng**

### 1. **Enhanced `cleanupWebRTC` với Safeguard**

**Trước:**
```typescript
const cleanupWebRTC = useCallback((reason: string = 'manual-cleanup') => {
  if (closingRef.current) return; // ❌ Return ngay, không log
  closingRef.current = true;
  // ... cleanup code ...
  closingRef.current = false; // ❌ Reset ngay lập tức
}, [setIsRtcReady]);
```

**Sau:**
```typescript
const cleanupWebRTC = useCallback((reason: string = 'manual-cleanup') => {
  if (closingRef.current) {
    console.log(`[WebRTC] Cleanup already in progress, skipping (${reason})`);
    return; // ✅ Skip với logging
  }
  closingRef.current = true;
  console.log(`[WebRTC] Cleaning up (${reason})`);

  setIsRtcReady(false);

  if (dcRef.current) {
    try {
      dcRef.current.onopen = null;
      dcRef.current.onclose = null;
      dcRef.current.onerror = null; // ✅ Thêm onerror
      dcRef.current.onmessage = null;
      // ✅ Check cả 'closing' state
      if (dcRef.current.readyState !== 'closed' && dcRef.current.readyState !== 'closing') {
        dcRef.current.close();
      }
    } catch (err) {
      console.warn('[WebRTC] Data channel cleanup error:', err);
    }
    dcRef.current = null;
  }

  if (pcRef.current) {
    try {
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.ondatachannel = null;
      pcRef.current.onicegatheringstatechange = null; // ✅ Thêm
      pcRef.current.onsignalingstatechange = null; // ✅ Thêm
      if (pcRef.current.signalingState !== 'closed') {
        pcRef.current.close();
      }
    } catch (err) {
      console.warn('[WebRTC] Peer connection cleanup error:', err);
    }
    pcRef.current = null;
  }

  udpStatsRef.current = { sent: 0, received: 0, failed: udpStatsRef.current.failed };
  
  // ✅ Delay trước khi cho phép connection mới
  setTimeout(() => {
    closingRef.current = false;
    console.log('[WebRTC] Cleanup complete, ready for new connection');
  }, 100);
}, [setIsRtcReady]);
```

**Cải thiện:**
- ✅ Log rõ ràng khi skip cleanup (debug)
- ✅ Null tất cả event handlers (prevent memory leak)
- ✅ Check thêm `closing` state cho DataChannel
- ✅ 100ms delay trước khi cho phép init mới (avoid race)

---

### 2. **Smarter Connection State Handler**

**Trước:**
```typescript
pc.onconnectionstatechange = () => {
  console.log('[WebRTC] Connection state:', pc.connectionState);
  // ❌ Cleanup ngay khi 'disconnected' (có thể reconnect!)
  if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
    cleanupWebRTC(`state-${pc.connectionState}`);
  }
};
```

**Sau:**
```typescript
pc.onconnectionstatechange = () => {
  console.log('[WebRTC] Connection state:', pc.connectionState);
  
  // ✅ Chỉ cleanup khi PERMANENT failure
  if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
    console.warn('[WebRTC] Connection permanently failed/closed. Cleaning up.');
    cleanupWebRTC(`state-${pc.connectionState}`);
  } else if (pc.connectionState === 'disconnected') {
    // ✅ Không cleanup, cho phép reconnect
    console.warn('[WebRTC] Connection disconnected (may reconnect)...');
  } else if (pc.connectionState === 'connected') {
    console.log('✅ [WebRTC] Peer connection CONNECTED');
  }
};
```

**Cải thiện:**
- ✅ Không cleanup khi `disconnected` (WebRTC có thể tự reconnect)
- ✅ Chỉ cleanup khi `failed` hoặc `closed` (permanent)
- ✅ Log rõ ràng từng state transition

---

### 3. **Improved `initWebRTC` với Wait Logic**

**Trước:**
```typescript
const initWebRTC = useCallback(async (isHost: boolean) => {
  try {
    if (pcRef.current) {
      console.log('[WebRTC] PeerConnection already exists, skipping re-init');
      return;
    }

    console.log('[WebRTC] Initializing as', isHost ? 'HOST' : 'PEER');
    const pc = createPeerConnection();
    
    // ... init logic ...
  } catch (err) {
    cleanupWebRTC('init-error');
  }
}, [createPeerConnection, handleUDPMessage, cleanupWebRTC]);
```

**Sau:**
```typescript
const initWebRTC = useCallback(async (isHost: boolean) => {
  try {
    if (pcRef.current) {
      console.log('[WebRTC] PeerConnection already exists, skipping re-init');
      return;
    }
    
    // ✅ Chờ cleanup hoàn tất nếu đang trong quá trình
    if (closingRef.current) {
      console.log('[WebRTC] Cleanup in progress, waiting...');
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('[WebRTC] Initializing as', isHost ? 'HOST' : 'PEER');
    const pc = createPeerConnection();

    if (isHost) {
      const dc = pc.createDataChannel('tetris', {
        ordered: false,
        maxRetransmits: 0,
      });
      dcRef.current = dc;

      dc.onopen = () => {
        console.log('✅ [WebRTC] UDP channel OPEN (host)');
        setIsRtcReady(true);
      };

      // ✅ Không cleanup ngay khi close (có thể temporary)
      dc.onclose = () => {
        console.warn('⚠️ [WebRTC] UDP channel CLOSED (host)');
        setIsRtcReady(false);
      };

      // ✅ Thêm error handler
      dc.onerror = (err) => {
        console.error('[WebRTC] Data channel error (host):', err);
      };

      dc.onmessage = (e) => handleUDPMessage(e.data);

      // ✅ Log chi tiết
      console.log('[WebRTC] Creating offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('[WebRTC] Sending offer to room:', roomId);
      socket.emit('webrtc:offer', { roomId, offer });
      
    } else {
      pc.ondatachannel = (e) => {
        console.log('[WebRTC] Data channel received (peer)');
        const dc = e.channel;
        dcRef.current = dc;

        dc.onopen = () => {
          console.log('✅ [WebRTC] UDP channel OPEN (peer)');
          setIsRtcReady(true);
        };

        // ✅ Không cleanup ngay
        dc.onclose = () => {
          console.warn('⚠️ [WebRTC] UDP channel CLOSED (peer)');
          setIsRtcReady(false);
        };

        dc.onerror = (err) => {
          console.error('[WebRTC] Data channel error (peer):', err);
        };

        dc.onmessage = (e) => handleUDPMessage(e.data);
      };
      
      console.log('[WebRTC] Waiting for offer from host...');
    }
    
  } catch (err) {
    console.error('[WebRTC] Init failed:', err);
    setIsRtcReady(false);
    cleanupWebRTC('init-error');
  }
}, [createPeerConnection, handleUDPMessage, cleanupWebRTC, roomId]);
```

**Cải thiện:**
- ✅ Chờ cleanup hoàn tất trước khi init (avoid race)
- ✅ Không cleanup ngay khi DataChannel close (có thể temporary)
- ✅ Thêm `onerror` handlers
- ✅ Log chi tiết cho debugging

---

### 4. **Smart Game Start Handler**

**Trước:**
```typescript
useEffect(() => {
  const handleGameStartForWebRTC = ({ opponent }: any) => {
    if (!opponent) return;
    
    const isHost = (socket.id || '') < opponent;
    console.log('[WebRTC] Game started, I am', isHost ? 'HOST' : 'PEER');

    // ❌ Cleanup ngay lập tức
    cleanupWebRTC('pre-game-start');
    
    // ❌ Delay cố định 500ms cho cả 2 cases
    setTimeout(() => {
      initWebRTC(isHost);
    }, 500);
  };

  socket.on('game:start', handleGameStartForWebRTC);
  return () => socket.off('game:start', handleGameStartForWebRTC);
}, [initWebRTC, cleanupWebRTC]);
```

**Sau:**
```typescript
useEffect(() => {
  const handleGameStartForWebRTC = ({ opponent }: any) => {
    if (!opponent) {
      console.warn('[WebRTC] No opponent in game:start, skipping WebRTC init');
      return;
    }
    
    const isHost = (socket.id || '') < opponent;
    console.log('[WebRTC] 🎮 Game started!');
    console.log('[WebRTC] My socket.id:', socket.id);
    console.log('[WebRTC] Opponent socket.id:', opponent);
    console.log('[WebRTC] I am', isHost ? '🏠 HOST (will create offer)' : '📡 PEER (will receive offer)');

    // ✅ CHỈ cleanup nếu có connection cũ
    if (pcRef.current || dcRef.current) {
      console.log('[WebRTC] Cleaning up previous connection before starting new one');
      cleanupWebRTC('pre-game-start');
      
      // ✅ Chờ cleanup hoàn tất (300ms)
      setTimeout(() => {
        console.log('[WebRTC] Starting new connection...');
        initWebRTC(isHost);
      }, 300);
    } else {
      // ✅ Không có connection cũ, start ngay với delay nhỏ
      setTimeout(() => {
        console.log('[WebRTC] Starting fresh connection...');
        initWebRTC(isHost);
      }, 500);
    }
  };

  socket.on('game:start', handleGameStartForWebRTC);
  return () => socket.off('game:start', handleGameStartForWebRTC);
}, [initWebRTC, cleanupWebRTC]);
```

**Cải thiện:**
- ✅ Check null opponent
- ✅ Chỉ cleanup NẾU có connection cũ
- ✅ Delay khác nhau cho cleanup vs fresh start
- ✅ Log rõ ràng host vs peer

---

### 5. **Better Signaling Handlers**

**Trước:**
```typescript
const handleICE = async ({ candidate }: any) => {
  try {
    if (pcRef.current && candidate) {
      if (!isUdpCandidate(candidate)) return;
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  } catch (err) {
    console.error('[WebRTC] ICE candidate failed:', err);
    cleanupWebRTC('ice-error'); // ❌ Cleanup khi ICE fail (non-fatal!)
  }
};
```

**Sau:**
```typescript
const handleICE = async ({ candidate }: any) => {
  try {
    if (pcRef.current && candidate) {
      if (!isUdpCandidate(candidate)) {
        console.log('[WebRTC] Ignoring non-UDP remote candidate');
        return;
      }
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[WebRTC] ✅ Added ICE candidate');
    }
  } catch (err) {
    // ✅ KHÔNG cleanup (ICE errors thường non-fatal)
    console.error('[WebRTC] ⚠️ ICE candidate failed (non-fatal):', err);
  }
};
```

**Cải thiện:**
- ✅ Không cleanup khi ICE fail (thường non-fatal)
- ✅ Log success khi add ICE candidate
- ✅ Enhanced logging cho debugging

---

## 📊 **Expected Console Logs**

### **Khi game start thành công:**

**HOST (Player A):**
```
[WebRTC] 🎮 Game started!
[WebRTC] My socket.id: abc123
[WebRTC] Opponent socket.id: def456
[WebRTC] I am 🏠 HOST (will create offer)
[WebRTC] Starting fresh connection...
[WebRTC] Initializing as HOST
[WebRTC] Creating offer...
[WebRTC] Sending offer to room: ROOM123
[WebRTC] Connection state: connecting
[WebRTC] ✅ Added ICE candidate
[WebRTC] Connection state: connected
✅ [WebRTC] Peer connection CONNECTED
✅ [WebRTC] UDP channel OPEN (host)
```

**PEER (Player B):**
```
[WebRTC] 🎮 Game started!
[WebRTC] My socket.id: def456
[WebRTC] Opponent socket.id: abc123
[WebRTC] I am 📡 PEER (will receive offer)
[WebRTC] Starting fresh connection...
[WebRTC] Initializing as PEER
[WebRTC] Waiting for offer from host...
[WebRTC] 📥 Received offer, creating answer...
[WebRTC] 📨 Data channel received (answerer)
[WebRTC] Remote description set
[WebRTC] 📤 Sending answer to room: ROOM123
[WebRTC] Connection state: connecting
[WebRTC] ✅ Added ICE candidate
[WebRTC] Connection state: connected
✅ [WebRTC] Peer connection CONNECTED
✅ [WebRTC] UDP channel OPEN (answerer)
```

### **Khi có vấn đề (non-fatal):**

```
[WebRTC] Connection state: disconnected
⚠️ [WebRTC] Connection disconnected (may reconnect)...
[WebRTC] Connection state: connecting
[WebRTC] Connection state: connected
✅ [WebRTC] Peer connection CONNECTED
```

### **Khi thất bại hoàn toàn:**

```
[WebRTC] Connection state: failed
⚠️ [WebRTC] Connection permanently failed/closed. Cleaning up.
[WebRTC] Cleaning up (state-failed)
[WebRTC] Cleanup complete, ready for new connection
⚡ Skipping UDP sync - UDP active  → ❌ FALSE (fallback to TCP)
📤 [game:state] Sending board via TCP: { roomId: 'ROOM123', hasMatrix: true }
```

---

## 🧪 **Testing Checklist**

### ✅ **Test 1: Normal Connection (Both Players Stay)**

1. Player A creates custom room
2. Player B joins room
3. Both click ready
4. Game starts with countdown
5. **Expected:**
   - ✅ Cả 2 players thấy countdown
   - ✅ WebRTC connection established
   - ✅ Console shows "UDP channel OPEN" cho cả 2
   - ✅ Không ai bị disconnect
   - ✅ Board sync realtime

### ✅ **Test 2: UDP Stats Indicator**

1. Sau khi game start
2. Kiểm tra góc phải trên
3. **Expected:**
   - ✅ Badge hiển thị "⚡ UDP Active" (màu xanh)
   - ✅ Hover thấy stats: Sent/Received/Failed
   - ✅ Sent và Received tăng liên tục
   - ✅ Failed = 0 hoặc rất nhỏ

### ✅ **Test 3: Fallback to TCP**

1. Nếu WebRTC fail (firewall, NAT, etc.)
2. **Expected:**
   - ✅ Badge hiển thị "📶 TCP Mode" (màu vàng)
   - ✅ Console: `⚡ Skipping UDP sync - UDP active` = FALSE
   - ✅ Console: `📤 [game:state] Sending board via TCP`
   - ✅ Game vẫn chơi được (TCP fallback)
   - ✅ Board sync chậm hơn nhưng vẫn work

### ✅ **Test 4: Connection Recovery**

1. Tạm thời mất connection (unplu g LAN cable)
2. Cắm lại sau 2-3 giây
3. **Expected:**
   - ✅ Console: `Connection state: disconnected`
   - ✅ KHÔNG cleanup ngay
   - ✅ Console: `Connection state: connecting`
   - ✅ Console: `Connection state: connected`
   - ✅ Badge quay lại "UDP Active"

### ✅ **Test 5: Multiple Games**

1. Chơi 1 trận, finish
2. Rematch (both ready again)
3. **Expected:**
   - ✅ Console: `Cleaning up previous connection`
   - ✅ Console: `Cleanup complete, ready for new connection`
   - ✅ Console: `Starting new connection...`
   - ✅ WebRTC re-established successfully
   - ✅ Không bị duplicate connections

---

## 🔍 **Debug Commands**

### **Check WebRTC Connection State:**
```javascript
// Paste in browser console during game
console.log({
  pc: pcRef.current,
  dc: dcRef.current,
  pcState: pcRef.current?.connectionState,
  dcState: dcRef.current?.readyState,
  isRtcReady,
  udpStats: udpStatsRef.current
});
```

### **Force TCP Mode (for testing):**
```javascript
// In Versus.tsx, temporarily change:
const sendViaUDP = useCallback((type: string, data: any) => {
  return false; // ⚠️ Force TCP mode for testing
}, [isRtcReady]);
```

### **Monitor WebRTC Stats:**
```javascript
// Paste in console during game
setInterval(() => {
  if (pcRef.current) {
    pcRef.current.getStats().then(stats => {
      stats.forEach(report => {
        if (report.type === 'data-channel') {
          console.log('DataChannel:', report);
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          console.log('Candidate Pair:', report);
        }
      });
    });
  }
}, 5000);
```

---

## 🎯 **Kết Luận**

### ✅ **Đã Fix:**
1. ✅ Aggressive cleanup causing premature disconnections
2. ✅ Race conditions between cleanup and init
3. ✅ Cascade cleanup từ connection state changes
4. ✅ Treating `disconnected` như `failed` (bây giờ cho phép reconnect)
5. ✅ ICE candidate errors causing full cleanup (bây giờ non-fatal)

### ⚠️ **Lưu Ý:**
- UDP có thể bị block bởi firewall/NAT → TCP fallback vẫn hoạt động
- Connection có thể temporary disconnect → System sẽ tự recover
- Nếu thấy "TCP Mode", game vẫn chơi được bình thường (chỉ chậm hơn một chút)

### 📝 **Files Changed:**
- `client/src/components/Versus.tsx` - Enhanced WebRTC logic with safeguards

**Test ngay và báo kết quả!** 🚀
