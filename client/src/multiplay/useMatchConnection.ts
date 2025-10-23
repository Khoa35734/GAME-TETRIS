import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../socket';
import { useReliableUDP, type UDPMessage } from '../hooks/useReliableUDP';
import { createStage } from '../gamehelper';
import type { Stage as StageType } from '../gamehelper';

/**
 * ============================================
 * 🌐 useMatchConnection Hook
 * ============================================
 * - Quản lý Socket.IO và WebRTC (Reliable UDP)
 * - Theo dõi trạng thái trận đấu: countdown, BO3, match result
 * - Lưu và cập nhật trạng thái đối thủ
 * - Quản lý rác pending
 */
export function useMatchConnection(roomId: string) {
  /**
   * ==============================
   * 🧠 State
   * ==============================
   */
  const [opponentStage, setOpponentStage] = useState<StageType>(() => createStage());
  const [opponentHold, setOpponentHold] = useState<any>(null);
  const [opponentNextQueue, setOpponentNextQueue] = useState<any[]>([]);
  const [opponentName, setOpponentName] = useState<string>('Đối thủ');

  const [countdown, setCountdown] = useState<number | null>(null);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [seriesScore, setSeriesScore] = useState({ me: 0, opponent: 0 });

  const [pendingGarbage, setPendingGarbage] = useState(0);

  /**
   * ==============================
   * 🔗 WebRTC + Reliable UDP
   * ==============================
   */
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  const { sendUDP } = useReliableUDP({
    dcRef,
    onMessage: (msg: UDPMessage) => {
      switch (msg.type) {
        case 'snapshot':
          if (msg.payload?.matrix) setOpponentStage(msg.payload.matrix);
          if (msg.payload?.hold) setOpponentHold(msg.payload.hold);
          if (msg.payload?.next) setOpponentNextQueue(msg.payload.next);
          break;
        case 'garbage':
          if (msg.payload?.lines)
            setPendingGarbage(prev => prev + msg.payload.lines);
          break;
        case 'meta':
          if (msg.payload?.name) setOpponentName(msg.payload.name);
          break;
      }
    },
  });

  /**
   * ==============================
   * 📡 Socket.IO Events
   * ==============================
   */
  useEffect(() => {
    if (!roomId) return;

    // Khi vào phòng
    socket.emit('match:join', { roomId });

    // Nhận thông tin đối thủ
    socket.on('match:opponentInfo', (data: { name: string }) => {
      if (data?.name) setOpponentName(data.name);
    });

    // Nhận trạng thái countdown
    socket.on('match:countdown', (sec: number) => {
      setCountdown(sec);
    });

    // Nhận rác từ server (khi server xử lý attack)
    socket.on('match:garbage', (data: { lines: number }) => {
      if (data?.lines) setPendingGarbage(prev => prev + data.lines);
    });

    // Nhận cập nhật stage từ server (dự phòng)
    socket.on('match:opponentStage', (data: StageType) => {
      setOpponentStage(data);
    });

    // Nhận kết quả BO3
    socket.on('match:result', (data: { winner: string; series: { me: number; opponent: number } }) => {
      setMatchResult(data.winner);
      if (data.series) setSeriesScore(data.series);
    });

    // Khi trận mới bắt đầu
    socket.on('match:reset', () => {
      setMatchResult(null);
      setPendingGarbage(0);
      setCountdown(null);
    });

    return () => {
      socket.off('match:opponentInfo');
      socket.off('match:countdown');
      socket.off('match:garbage');
      socket.off('match:opponentStage');
      socket.off('match:result');
      socket.off('match:reset');
    };
  }, [roomId]);

  /**
   * ==============================
   * 📤 Gửi thông tin sang đối thủ
   * ==============================
   */
  const sendMyBoardUpdate = useCallback(
    (stage: StageType, hold: any, next?: any[]) => {
      sendUDP('snapshot', { matrix: stage, hold, next }, true);
      socket.emit('match:updateBoard', { roomId, stage, hold, next });
    },
    [roomId, sendUDP]
  );

  const sendGarbageAttack = useCallback(
    (lines: number) => {
      sendUDP('garbage', { lines }, true);
      socket.emit('match:attack', { roomId, lines });
    },
    [roomId, sendUDP]
  );

  const sendTopout = useCallback(
    (reason: string) => {
      sendUDP('topout', { reason }, true);
      socket.emit('match:topout', { roomId, reason });
    },
    [roomId, sendUDP]
  );

  const sendHold = useCallback(
    (holdPiece: any) => {
      sendUDP('hold', { hold: holdPiece }, false);
    },
    [sendUDP]
  );

  /**
   * ==============================
   * 📦 Return API
   * ==============================
   */
  return {
    opponentStage,
    opponentHold,
    opponentNextQueue,
    opponentName,

    countdown,
    matchResult,
    seriesScore,

    pendingGarbage,
    setPendingGarbage,

    sendMyBoardUpdate,
    sendGarbageAttack,
    sendTopout,
    sendHold,
  };
}
