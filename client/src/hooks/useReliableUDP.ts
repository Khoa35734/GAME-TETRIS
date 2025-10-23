'use client'; // Đảm bảo đây là client component

import { useEffect, useRef, useCallback } from 'react';

// =============================================================
// 🧩 UDPMessage Type — chuẩn hóa dữ liệu trao đổi
// =============================================================
export type UDPMessage<T = any> = {
  seq: number;            // sequence ID (auto tăng)
  ack?: number;           // ack ID nếu là gói xác nhận
  type: string;           // loại message (snapshot, garbage, v.v.)
  ts: number;             // timestamp gửi
  reliable?: boolean;     // có cần resend không
  from?: string;          // ID người gửi (socket.id)
  payload?: T;            // nội dung dữ liệu
};

// =============================================================
// ⚙️ Hook cấu hình Reliable UDP cho WebRTC DataChannel
// =============================================================
interface ReliableUDPOptions {
  // SỬA: Nhận giá trị DataChannel trực tiếp thay vì Ref
  dc: RTCDataChannel | null;
  onMessage: (msg: UDPMessage) => void;
  resendLimit?: number;        // số lần gửi lại tối đa
  resendInterval?: number;     // khoảng cách mỗi lần gửi lại (ms)
  lossThreshold?: number;      // ngưỡng cảnh báo tỉ lệ mất gói (%)
  debug?: boolean;             // in log debug
}

export function useReliableUDP({
  // SỬA: Nhận `dc` làm prop
  dc,
  onMessage,
  resendLimit = 3,
  resendInterval = 150,
  lossThreshold = 5,
  debug = false,
}: ReliableUDPOptions) {
  // --- Internal states ---
  const seqCounter = useRef(0);
  const pending = useRef<Map<number, { msg: UDPMessage; retries: number }>>(new Map());
  const lastSeqFrom = useRef<Record<string, number>>({});
  const lostCount = useRef(0);
  const totalCount = useRef(0);

  // =============================================================
  // 📨 Gửi UDP Message
  // =============================================================
  const sendUDP = useCallback(
    (type: string, payload: any = {}, reliable = false): boolean => {
      // SỬA: `dc` đã là prop, không cần `.current`
      if (!dc || dc.readyState !== 'open') return false;

      const msg: UDPMessage = {
        seq: seqCounter.current++,
        type,
        ts: Date.now(),
        reliable,
        payload,
      };

      try {
        dc.send(JSON.stringify(msg));
        totalCount.current++;

        if (reliable) {
          pending.current.set(msg.seq, { msg, retries: 0 });
        }

        if (debug)
          console.log(`📤 [UDP] Sent ${type} seq=${msg.seq} reliable=${reliable}`);

        return true;
      } catch (err) {
        console.warn('[ReliableUDP] Send failed:', err);
        return false;
      }
    },
    // SỬA: Phụ thuộc vào `dc`
    [dc, debug]
  );

  // =============================================================
  // 🔁 Resend loop cho gói reliable chưa được ACK
  // =============================================================
  useEffect(() => {
    const timer = setInterval(() => {
      // SỬA: `dc` đã là prop
      if (!dc || dc.readyState !== 'open') return;

      const now = Date.now();
      for (const [seq, entry] of pending.current.entries()) {
        const { msg, retries } = entry;
        if (retries >= resendLimit) {
          pending.current.delete(seq);
          if (debug) console.warn(`❌ Drop seq=${seq} (max retries)`);
          continue;
        }
        if (now - msg.ts >= resendInterval) {
          try {
            dc.send(JSON.stringify({ ...msg, ts: Date.now() }));
            entry.retries++;
            if (debug) console.log(`🔁 Resent seq=${seq} (${msg.type}) #${entry.retries}`);
          } catch {
            console.warn(`❌ Resend failed seq=${seq}`);
          }
        }
      }
    }, resendInterval);

    return () => clearInterval(timer);
    // SỬA: Phụ thuộc vào `dc`
  }, [dc, resendInterval, resendLimit, debug]);

  // =============================================================
  // 📥 Handle message nhận được
  // =============================================================
  const handleMessage = useCallback(
    (event: MessageEvent<string>) => {
      try {
        const msg: UDPMessage = JSON.parse(event.data);
        if (!msg || typeof msg.seq !== 'number') return;

        // ✅ Nếu là ACK → remove pending
        if (msg.ack !== undefined) {
          pending.current.delete(msg.ack);
          if (debug) console.log(`✅ ACK received for seq=${msg.ack}`);
          return;
        }

        // 🧩 Kiểm tra mất gói
        const from = msg.from ?? 'unknown';
        const last = lastSeqFrom.current[from] ?? -1;
        if (last !== -1 && msg.seq !== last + 1) {
          lostCount.current++;
          if (debug)
            console.warn(`⚠️ Packet loss detected from ${from}: expected ${last + 1}, got ${msg.seq}`);
        }
        lastSeqFrom.current[from] = msg.seq;

        // 📤 Gửi ACK nếu gói reliable
        // SỬA: `dc` đã là prop
        if (msg.reliable && dc?.readyState === 'open') {
          const ack: UDPMessage = {
            seq: seqCounter.current++,
            ack: msg.seq,
            type: 'ack',
            ts: Date.now(),
          };
          try {
            // SỬA: `dc` đã là prop
            dc.send(JSON.stringify(ack));
          } catch {
            console.warn(`❌ Failed to send ACK for seq=${msg.seq}`);
          }
        }

        // 🔄 Callback xử lý gói hợp lệ
        onMessage(msg);

        // 📊 Tính tỉ lệ mất gói
        const lossRate = (lostCount.current / totalCount.current) * 100;
        if (lossRate > lossThreshold) {
          console.warn(`📉 UDP packet loss: ${lossRate.toFixed(2)}%`);
          lostCount.current = 0;
          totalCount.current = 0;
        }
      } catch (err) {
        console.warn('❌ [ReliableUDP] Parse error:', err);
      }
    },
    // SỬA: Phụ thuộc vào `dc`
    [onMessage, dc, lossThreshold, debug]
  );

  // =============================================================
  // 🔗 Gắn listener vào DataChannel (SỬA LỖI CHÍNH)
  // =============================================================
  useEffect(() => {
    // SỬA: `dc` là prop, không phải `dcRef.current`
    if (!dc) return;

    // Gán listener `onmessage` khi `dc` tồn tại
    dc.onmessage = handleMessage;
    if (debug) console.log('🧩 ReliableUDP attached to DataChannel');

    // Cleanup: gỡ listener khi `dc` thay đổi hoặc component unmount
    return () => {
      if (dc) dc.onmessage = null;
    };
    // SỬA: Chạy lại effect này khi `dc` thay đổi (từ null -> object)
  }, [dc, handleMessage, debug]);

  // =============================================================
  // 🧮 Optional: Hàm lấy thống kê loss
  // =============================================================
  const getStats = useCallback(() => {
    return {
      totalSent: totalCount.current,
      lostPackets: lostCount.current,
      pendingCount: pending.current.size,
    };
  }, []);

  return { sendUDP, getStats };
}