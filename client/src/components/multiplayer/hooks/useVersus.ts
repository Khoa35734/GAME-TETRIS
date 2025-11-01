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
  const [matchResult, setMatchResult] = useState<MatchSummary>(null);
  
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
  const series = useSeriesState();
  
  // === 4. NETWORK (WebRTC, UDP, Ping) ===
  const network = useNetwork({
    roomId,
    meId,
    core: coreState,
    nextFour,
    hold,
    onOpponentTopout: (reason) => {
      setOppGameOver(true);
      setMatchResult({ outcome: 'win', reason });
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
  });
  
  // === 6. MECHANICS (Movement, Rotation, Lock) ===
  const mechanics = useMechanics({
    core: coreState,
    setters: coreSetters,
    sendInput: network.sendInput,
    sendGarbage: network.sendGarbage,
    sendTopout: network.sendTopout,
    cancelGarbage: garbage.cancelGarbage,
    triggerGarbageApply: garbage.triggerGarbageApply,
    resetAFKTimer: socketEvents.resetAFKTimer,
    roomId,
    countdown,
    matchResult,
    onOpponentGarbageSent: (lines) => {
      garbage.setOpponentIncomingGarbage(prev => prev + lines);
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
    matchResult,
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
