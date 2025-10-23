import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socket from '../../socket';
import { type UDPMessage } from '../../hooks/useReliableUDP'; // Đảm bảo bạn đã export type này

// Import các hook
import { useWebRTC } from './useWebRTC';
import { useGarbageSystem } from './useGarbageSystem';
import { useGameLifecycle } from './useGameLifecycle';
// import { useInputHandler } from './useInputHandler'; // Bỏ comment khi bạn dùng đến

// Import các hook và helper game (THÊM LẠI)
import { usePlayer } from '../../hooks/usePlayer';
import { useStage } from '../../hooks/useStage';
import { createStage, type Stage as StageType } from '../../game/gamehelper';

// Import các component UI
import Stage from '../Stage';
import { HoldPanel, NextPanel } from '../SidePanels';
import GarbageQueueBar from '../GarbageQueueBar';

const Versus: React.FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // ==========================================
  // STATE CỦA BẠN (THÊM LẠI)
  // ==========================================
  const [player, , resetPlayer, , hold, , nextFour, , , setQueueSeed, pushQueue] = usePlayer();
  const [stage, setStage] = useStage(player);

  // ==========================================
  // STATE CỦA ĐỐI PHƯƠNG (THÊM MỚI)
  // ==========================================
  const [oppStage, setOppStage] = useState<StageType>(() => createStage());
  const [oppHold, setOppHold] = useState<any>(null);
  const [oppNextFour, setOppNextFour] = useState<any[]>([]);

  // ==========================================
  // KHỞI TẠO CÁC HOOK
  // ==========================================

  // Callback xử lý tin nhắn UDP (SỬA LẠI)
  const handleUDPMessage = useCallback((msg: UDPMessage) => {
    switch (msg.type) {
      case 'snapshot':
        if (msg.payload?.matrix) setOppStage(msg.payload.matrix);
        if (msg.payload?.hold) setOppHold(msg.payload.hold);
        break;
      // ... bạn có thể thêm case 'garbage', 'topout' ở đây
      default:
        console.log("Received UDP:", msg);
    }
  }, []); // Bỏ [] nếu cần dùng state

  // Hook WebRTC (SỬA LẠI)
  const { isRtcReady, sendUDP, cleanupWebRTC } = useWebRTC(roomId || null, handleUDPMessage);

  // Hook Game Lifecycle
  const { 
    countdown, 
    setCountdown, 
    matchResult, 
    startGame, // Dùng hàm này
    handleGameOver // Dùng hàm này
  } = useGameLifecycle(navigate, cleanupWebRTC); // Truyền hàm cleanup vào

  // Hook Garbage (SỬA LẠI)
  const { 
    incomingGarbage, 
    setIncomingGarbage 
  } = useGarbageSystem(roomId || null, sendUDP, () => {}); // Cần truyền hàm sendTopout vào đây

  // Hook Input (chưa dùng)
  // const { movePlayer, hardDrop } = useInputHandler(player, stage, updatePlayerPos, playerRotate);

  // Ref cho hàm startGame để dùng trong timer
  const startGameRef = useRef(startGame);
  useEffect(() => {
    startGameRef.current = startGame;
  }, [startGame]);

  // ==========================================
  // CÁC TRÌNH LẮNG NGHE SỰ KIỆN (THÊM LẠI)
  // ==========================================

  // 1. Bắt đầu đếm ngược
  useEffect(() => {
    const onGameStart = (payload: { next: any[] }) => {
      console.log('🎮 [Versus] game:start event received!', payload);
      setQueueSeed(payload.next); // Lấy 7 khối gạch đầu tiên
      setCountdown(3);
    };

    socket.on('game:start', onGameStart);
    return () => { socket.off('game:start', onGameStart); };
  }, [setQueueSeed, setCountdown]);

  // 2. Chạy đếm ngược
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      // Bắt đầu game
      startGameRef.current(resetPlayer, setStage); // Gọi hàm từ hook
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(c => (c ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, resetPlayer, setStage]);

  // 3. Nhận khối gạch tiếp theo
  useEffect(() => {
    const onGameNext = (arr: any[]) => {
      pushQueue(arr);
    };
    socket.on('game:next', onGameNext);
    return () => { socket.off('game:next', onGameNext); };
  }, [pushQueue]);

  // 4. Nhận board đối thủ (TCP fallback)
  useEffect(() => {
    const onGameState = (data: any) => {
      if (isRtcReady) return; // Ưu tiên UDP
      console.log('🔵 [game:state] (TCP) Event received:', data);
      if (data && Array.isArray(data.matrix)) setOppStage(data.matrix);
      if (data && data.hold !== undefined) setOppHold(data.hold);
      if (data && Array.isArray(data.next)) setOppNextFour(data.next.slice(0, 4));
    };
    socket.on('game:state', onGameState);
    return () => { socket.off('game:state', onGameState); };
  }, [isRtcReady]); // Thêm isRtcReady để bỏ qua nếu UDP đang chạy

  // 5. Nhận sự kiện Game Over
  useEffect(() => {
    const onGameOver = (data: { winner: string; reason?: string }) => {
      console.log('🏁 [Versus] game:over event received:', data);
      const mySocketId = socket.id;
      if (!mySocketId) return;
      // Gọi hàm từ hook để xử lý
      handleGameOver(mySocketId, data.winner, data.reason);
    };
    socket.on('game:over', onGameOver);
    return () => { socket.off('game:over', onGameOver); };
  }, [handleGameOver]); // Phụ thuộc vào hàm handleGameOver từ hook

  // 6. Nhận rác
  useEffect(() => {
    const onIncomingGarbage = (data: { lines: number }) => {
      setIncomingGarbage(data.lines);
    };
    socket.on('game:incomingGarbage', onIncomingGarbage);
    return () => { socket.off('game:incomingGarbage', onIncomingGarbage); };
  }, [setIncomingGarbage]);


  // Presence:
  useEffect(() => {
    socket.emit('presence:update', { status: 'in_game', mode: 'multi' });
    return () => { socket.emit('presence:update', { status: 'online' }); };
  }, []);
  
  // ==========================================
  // RENDER (SỬA LẠI)
  // ==========================================
  return (
    <div style={{ color: '#fff', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '50px', alignItems: 'flex-start', paddingTop: '50px' }}>
      
      {/* Màn hình đếm ngược */}
      {countdown !== null && (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.3)', zIndex: 100, fontSize: '10rem', fontWeight: 'bold' }}>
          {countdown}
        </div>
      )}

      {/* Màn hình kết quả */}
      {matchResult && (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.7)', zIndex: 100, fontSize: '5rem', fontWeight: 'bold' }}>
          {matchResult.outcome === 'win' ? 'BẠN THẮNG!' : 'BẠN THUA'}
          <div style={{ fontSize: '1rem' }}>{matchResult.reason}</div>
        </div>
      )}

      {/* Board của đối thủ */}
      <div>
        <h3>Đối thủ</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <HoldPanel hold={oppHold} />
          <Stage stage={oppStage} />
          <NextPanel queue={oppNextFour} />
        </div>
      </div>

      {/* Board của bạn */}
      <div>
        <h3>Bạn</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <HoldPanel hold={hold} />
          <div style={{ display: 'flex', gap: '5px' }}> {/* Thêm container cho board và thanh rác */}
            <Stage stage={stage} />
            <GarbageQueueBar count={incomingGarbage} />
          </div>
          <NextPanel queue={nextFour} />
        </div>
      </div>

      {/* Thông tin gỡ lỗi */}
      <div style={{ position: 'absolute', top: 10, right: 10, fontSize: '12px', opacity: 0.7 }}>
        <div>Room ID: {roomId}</div>
        <div>UDP: {isRtcReady ? '✅ Active' : '❌ TCP Fallback'}</div>
      </div>
    </div>
  );
};

export default Versus;
