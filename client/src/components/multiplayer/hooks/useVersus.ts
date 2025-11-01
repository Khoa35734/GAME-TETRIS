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