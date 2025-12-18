// File: src/hooks/useVersus/hooks/useVersus.ts
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../../../socket';
import { createStage } from '../../../game/gamehelper';
import type { MatchSummary } from '../game/types';

// Import các hook con
import { useGameCore } from './useGameCore';
import { useGarbage } from './useGarbage';
import { useSeriesState } from './useSeriesState';
import { useMechanics } from './useMechanics';
import { useNetwork } from './useNetwork';
import { useSocketEvents } from './useSocketEvents';

/**
 * 🔽 ĐỊNH NGHĨA STATE MỚI CHO ROUND 🔽
 * State này sẽ lưu kết quả của 1 game (ví dụ: 1-0)
 * và sẽ bị xóa (thành null) trước game tiếp theo.
 */
export type RoundResult = {
  outcome: 'win' | 'lose';
  score: { me: number; opp: number };
} | null;

/**
 * Hook tổng hợp cho Versus mode - kết hợp tất cả các hook con
 */
export const useVersus = (urlRoomId: string | undefined) => {
  const navigate = useNavigate();
  const [meId, setMeId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(urlRoomId || null);
  const [waiting, setWaiting] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  const [playerName, setPlayerName] = useState<string>('Bạn');
  const [opponentName, setOpponentName] = useState<string>('Đối thủ');
  
  // Match mode (ranked or casual)
  const [matchMode, setMatchMode] = useState<'ranked' | 'casual'>('casual');
  
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  
  // State cho KẾT QUẢ TRẬN ĐẤU CUỐI CÙNG (BO3)
  const [matchResult, setMatchResult] = useState<MatchSummary>(null);
  // 🔽 STATE MỚI: KẾT QUẢ CỦA 1 GAME (ví dụ: 1-0) 🔽
  const [roundResult, setRoundResult] = useState<RoundResult>(null);
  
  // Game over animation state
  const [myFillWhiteProgress, setMyFillWhiteProgress] = useState(0);
  const [oppFillWhiteProgress, setOppFillWhiteProgress] = useState(0);
  
  // Game stats
  const [myStats, setMyStats] = useState({ rows: 0, level: 1, score: 0 });
  const [oppStats, _setOppStats] = useState({ rows: 0, level: 1, score: 0 });
  // Opponent live performance stats (synced via server)
  const [oppPiecesPlaced, setOppPiecesPlaced] = useState(0);
  const [oppAttacksSent, setOppAttacksSent] = useState(0);
  const [oppElapsedMs, setOppElapsedMs] = useState(0);
  
  // 📊 Live performance stats
  const [piecesPlaced, setPiecesPlaced] = useState(0);
  const [attacksSent, setAttacksSent] = useState(0);

  // ⭐ ELO Rating data (for rank result overlay)
  const [eloData, setEloData] = useState<{
    oldElo: number;
    newElo: number;
    eloChange: number;
  } | null>(null);

  // 🔽 [SỬA LỖI 1A] Tạo refs để lưu giá trị state mới nhất cho interval
  // Điều này ngăn việc interval bị "stale closure" (dùng giá trị cũ)
  const piecesPlacedRef = useRef(piecesPlaced);
  const attacksSentRef = useRef(attacksSent);
  const elapsedMsRef = useRef(elapsedMs);

  // 🔽 [SỬA LỖI 1B] Cập nhật refs mỗi khi state thay đổi
  // Các useEffect này nhẹ hơn nhiều so với việc tạo lại interval
  useEffect(() => { piecesPlacedRef.current = piecesPlaced; }, [piecesPlaced]);
  useEffect(() => { attacksSentRef.current = attacksSent; }, [attacksSent]);
  useEffect(() => { elapsedMsRef.current = elapsedMs; }, [elapsedMs]);
  
  // ⭐ Listen for ELO updates from server
  useEffect(() => {
    const handleEloUpdate = (data: {
      winnerId: number;
      loserId: number;
      winnerOldElo: number;
      winnerNewElo: number;
      loserOldElo: number;
      loserNewElo: number;
      winnerEloChange: number; // positive
      loserEloChange: number; // negative
    }) => {
      console.log('⭐ [ELO] Received ELO update:', data);
      
      // Determine if I'm the winner or loser
      const myAccountId = Number(meId);
      if (myAccountId === data.winnerId) {
        // I won
        setEloData({
          oldElo: data.winnerOldElo,
          newElo: data.winnerNewElo,
          eloChange: data.winnerEloChange, // positive
        });
        console.log(`⭐ [ELO] I WON: ${data.winnerOldElo} → ${data.winnerNewElo} (+${data.winnerEloChange})`);
      } else if (myAccountId === data.loserId) {
        // I lost
        setEloData({
          oldElo: data.loserOldElo,
          newElo: data.loserNewElo,
          eloChange: data.loserEloChange, // negative
        });
        console.log(`⭐ [ELO] I LOST: ${data.loserOldElo} → ${data.loserNewElo} (${data.loserEloChange})`);
      }
    };

    socket.on('elo:updated', handleEloUpdate);

    return () => {
      socket.off('elo:updated', handleEloUpdate);
    };
  }, [meId]);
  
  // Opponent board state
  const [oppStage, setOppStage] = useState<any[][]>(() => createStage());
  const [oppGameOver, setOppGameOver] = useState(false);
  const [netOppStage, setNetOppStage] = useState<any[][] | null>(null);
  const [oppHold, setOppHold] = useState<any>(null);
  const [oppNextFour, setOppNextFour] = useState<any[]>([]);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => { wrapperRef.current?.focus(); }, []);
  
  // Load user identity
  useEffect(() => {
    let resolvedId: string | null = null;
    let resolvedName = 'Bạn';
    try {
      const userStr = localStorage.getItem('tetris:user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.accountId) resolvedId = String(user.accountId);
        if (user?.username) resolvedName = String(user.username);
      }
    } catch (err) { /* ... */ }
    if (!resolvedId) resolvedId = socket.id || `guest_${Date.now().toString(36)}`;
    setMeId(resolvedId);
    setPlayerName(resolvedName);
    console.log(`[Versus] Initial Identity: meId=${resolvedId}, playerName=${resolvedName}`);
  }, []);
  
  // === 1. CORE GAME STATE ===
  const [coreState, coreSetters, hold, , nextFour] = useGameCore();
  
  // === 2. GARBAGE LOGIC ===
  const garbage = useGarbage({
    player: coreState.player,
    setStage: coreSetters.setStage,
    updatePlayerPos: coreSetters.updatePlayerPos,
    setIsApplyingGarbage: coreSetters.setIsApplyingGarbage,
  });
  
  // === 3. SERIES STATE ===
  // 🔽 LẤY TẤT CẢ STATE VÀ SETTERS TỪ HOOK NÀY 🔽
  const series = useSeriesState();
  
  // === 4. NETWORK (WebRTC, UDP, Ping) ===
  const network = useNetwork({
    roomId,
    meId,
    core: coreState,
    nextFour,
    hold,
    // 🔽 TRUYỀN STATS VÀO NETWORK 🔽
    piecesPlaced,
    attacksSent,
    elapsedMs,
    onOpponentTopout: (reason) => {
      // Logic này chỉ dành cho UDP, logic BO3 sẽ do useSocketEvents xử lý
      setOppGameOver(true);
      // setMatchResult({ outcome: 'win', reason }); // 🔽 BỎ COMMENT NÀY NẾU CẦN
    },
    onGarbageReceived: (lines) => {
      garbage.receiveGarbage(lines);
    },
    onOpponentState: (matrix, opponentHold) => {
      if (matrix) {
        setOppStage(matrix);
        setNetOppStage(matrix);
      }
      if (opponentHold !== undefined) setOppHold(opponentHold);
    },
  });
  
  // === 5. SOCKET EVENTS (Game lifecycle, matchmaking) ===
  const socketEvents = useSocketEvents({
    meId,
    opponentId,
    roomId,
    urlRoomId,
    player: coreState.player as any,
    core: coreState,
    coreSetters,
    initWebRTC: network.initWebRTC,
    cleanupWebRTC: network.cleanupWebRTC,
    sendTopout: network.sendTopout,
  sendPlayerStats: network.sendPlayerStats,
    
    setMeId,
    setPlayerName,
    setOpponentId,
    setOpponentName,
    setRoomId,
    setWaiting,
    setDebugInfo,
    
    setOppStage,
    setNetOppStage,
    setOppHold,
    setOppNextFour,
    setOppGameOver,
    
    setMatchResult,
    setCountdown,
    setElapsedMs,
    setTimerOn,
    
    setMyFillWhiteProgress,
    setOppFillWhiteProgress,
    setMyStats,
    
    setIncomingGarbage: garbage.setIncomingGarbage,
    setGarbageToSend: garbage.setGarbageToSend,
    
    // 🔽 TRUYỀN CÁC SETTERS CẦN THIẾT CHO LOGIC BO3 🔽
    setRoundResult,
    setSeriesScore: series.applySeriesScore, // Đổi tên để khớp với hàm trong useSeriesState
    setSeriesCurrentGame: series.setSeriesCurrentGame,
    setPlayerRole: series.setPlayerRole,
    setMatchMode, // ⭐ Truyền setter để cập nhật match mode
    playerRoleRef: series.playerRoleRef, // Truyền ref để listener luôn có giá trị mới nhất
  });
  
  // === 6. MECHANICS (Movement, Rotation, Lock) ===
  const mechanics = useMechanics({
    core: coreState,
    setters: coreSetters,
    sendInput: network.sendInput,
    sendGarbage: network.sendGarbage,
    sendTopout: network.sendTopout, // Hàm này sẽ kích hoạt 'game:topout' -> server xử lý BO3
    cancelGarbage: garbage.cancelGarbage,
    triggerGarbageApply: garbage.triggerGarbageApply,
    resetAFKTimer: socketEvents.resetAFKTimer,
    roomId,
    countdown,
    matchResult,
    onOpponentGarbageSent: (lines) => {
      garbage.setGarbageToSend(prev => prev + lines);
      setTimeout(() => {
        garbage.setOpponentIncomingGarbage(prev => Math.max(0, prev - lines));
      }, 500);
    },
  });
  
  // 📊 Track piece placements (detect via lastPlacement change)
  const lastPlacementRef = useRef(coreState.lastPlacement);
  useEffect(() => {
    if (coreState.lastPlacement !== lastPlacementRef.current && coreState.lastPlacement) {
      lastPlacementRef.current = coreState.lastPlacement;
      setPiecesPlaced(prev => prev + 1);
    }
  }, [coreState.lastPlacement]);
  
  // 📊 Track attacks sent (via garbageToSend increases)
  const prevGarbageSentRef = useRef(0);
  useEffect(() => {
    const current = garbage.garbageToSend;
    if (current > prevGarbageSentRef.current) {
      const delta = current - prevGarbageSentRef.current;
      setAttacksSent(prev => prev + delta);
    }
    prevGarbageSentRef.current = current;
  }, [garbage.garbageToSend]);
  
  // Reset stats on new game
  useEffect(() => {
    if (countdown === 3) {
      setPiecesPlaced(0);
      setAttacksSent(0);
    }
  }, [countdown]);
  
  // Timer for elapsed time
  useEffect(() => {
    if (!timerOn) return;
    let raf = 0; 
    let last = performance.now();
    const tick = (now: number) => { 
      setElapsedMs((prev) => prev + (now - last)); 
      last = now; 
      raf = requestAnimationFrame(tick); 
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timerOn]);

  // 📡 Emit my live stats periodically and receive opponent's live stats
  useEffect(() => {
    // Receive opponent stats
    const onStatsUpdate = (payload: { from: string; piecesPlaced: number; attacksSent: number; elapsedMs: number }) => {
      if (!payload) return;

      // 🔽 [SỬA LỖI 2] Chỉ cập nhật state nếu data đến từ ĐỐI THỦ (opponentId)
      // Điều này ngăn bạn tự cập nhật stats của mình nếu server gửi nhầm
      if (opponentId && payload.from === opponentId) {
        setOppPiecesPlaced(Number(payload.piecesPlaced) || 0);
        setOppAttacksSent(Number(payload.attacksSent) || 0);
        setOppElapsedMs(Number(payload.elapsedMs) || 0);
      }
    };
    socket.on('stats:update', onStatsUpdate);

    return () => {
      socket.off('stats:update', onStatsUpdate);
    };
  }, [socket, opponentId]); // 🔽 [SỬA LỖI 2] Thêm opponentId vào dependency array

  useEffect(() => {
    // 🔽 [SỬA LỖI 1C] Sửa logic gửi stats
    // Chỉ chạy effect này khi timerOn, roomId, hoặc socket thay đổi
    if (!roomId || !timerOn || !socket) return;
    
    // Throttle to ~2 updates per second
    const interval = window.setInterval(() => {
      // Gửi giá trị từ refs (luôn là mới nhất)
      socket.emit('stats:update', roomId, { 
        piecesPlaced: piecesPlacedRef.current, 
        attacksSent: attacksSentRef.current, 
        elapsedMs: elapsedMsRef.current 
      });
    }, 500); // Gửi 2 lần/giây
    
    return () => clearInterval(interval);
  }, [roomId, timerOn, socket]); // 🔽 [SỬA LỖI 1D] XÓA stats khỏi dependency array
  
  // === RETURN ALL STATE & HANDLERS ===
  return {
    // Refs
    wrapperRef,
    udpStatsRef: network.udpStatsRef,
    autoExitTimerRef: socketEvents.autoExitTimerRef,
    
    // Event Handlers
    handleKeyDown: mechanics.handleKeyDown,
    handleKeyUp: mechanics.handleKeyUp,
    
    // State
    waiting,
    roomId,
    meId,
    debugInfo,
    isRtcReady: network.isRtcReady,
    matchResult,       // 🔽 Kết quả CUỐI CÙNG
    roundResult,       // 🔽 Kết quả 1 GAME
    autoExitCountdown: socketEvents.autoExitCountdown,
    countdown,
    disconnectCountdown: socketEvents.disconnectCountdown,
    
    // My Info
    playerName,
    player: coreState.player,
    stage: coreState.stage,
    hold,
    nextFour,
    myFillWhiteProgress,
    incomingGarbage: garbage.garbageQueue,
    lockedGarbageAmount: garbage.lockedGarbageAmount,
    garbageQueueLocked: garbage.garbageQueueLocked,
    rows: coreState.rows,
    level: coreState.level,
    elapsedMs,
    combo: coreState.combo,
    b2b: coreState.b2b,
    myPing: network.myPing,
    isApplyingGarbage: coreState.isApplyingGarbage,
    garbageToSend: garbage.garbageToSend,
    myStats,
    
    // 📊 Live performance stats
    piecesPlaced,
    attacksSent,
    
    // ⭐ ELO Rating
    eloData,
    matchMode, // ⭐ Match mode (ranked or casual)
    
    // Opponent Info
    opponentName,
    opponentId,
    oppStage,
    netOppStage,
    oppHold,
    oppNextFour,
    oppFillWhiteProgress,
    opponentIncomingGarbage: garbage.opponentIncomingGarbage,
    oppGameOver,
    oppPing: network.oppPing,
    oppStats,
  // Opponent live stats
  oppPiecesPlaced,
  oppAttacksSent,
  oppElapsedMs,
    
    // Series Info
    seriesScore: series.seriesScore,
    seriesBestOf: series.seriesBestOf,
    seriesWinsRequired: series.seriesWinsRequired,
    seriesCurrentGame: series.seriesCurrentGame,
    
    // Functions
    sendTopout: network.sendTopout,
    cleanupWebRTC: network.cleanupWebRTC,
    navigate,
    socket,
  };
};