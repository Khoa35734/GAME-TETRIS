import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../../../socket';
import { checkCollision, createStage, isGameOverFromBuffer } from '../../../game/gamehelper';
import * as C from '../game/constants';
import * as U from '../game/utils';
import type { StageType, StageCell, MatchSummary, GameCoreState, GameCoreSetters } from '../game/types';

type SocketEventProps = {
  meId: string | null;
  opponentId: string | null;
  roomId: string | null;
  urlRoomId: string | undefined;
  player: any;
  core: GameCoreState;
  coreSetters: GameCoreSetters;
  initWebRTC: (isHost: boolean) => void;
  cleanupWebRTC: (reason?: string) => void;
  sendTopout: (reason?: string) => void;
  
  setMeId: (id: string | null) => void;
  setPlayerName: (name: string) => void;
  setOpponentId: (id: string | null) => void;
  setOpponentName: (name: string) => void;
  setRoomId: (id: string | null) => void;
  setWaiting: (wait: boolean) => void;
  setDebugInfo: (fn: (prev: string[]) => string[]) => void;
  
  setOppStage: (stage: StageType) => void;
  setNetOppStage: (stage: StageType | null) => void;
  setOppHold: (hold: any) => void;
  setOppNextFour: (queue: any[]) => void;
  setOppGameOver: (over: boolean) => void;
  
  setMatchResult: (result: MatchSummary | null) => void;
  setCountdown: (count: number | null) => void;
  setElapsedMs: (ms: number) => void;
  setTimerOn: (on: boolean) => void;
  
  setMyFillWhiteProgress: (p: number) => void;
  setOppFillWhiteProgress: (p: number) => void;
  setMyStats: (stats: { rows: number, level: number, score: number }) => void;
  
  setIncomingGarbage: (g: number | ((prev: number) => number)) => void;
  setGarbageToSend: (g: number | ((prev: number) => number)) => void;
};

/**
 * Quản lý tất cả Socket listeners, lifecycle, AFK, Disconnect
 */
export const useSocketEvents = (props: SocketEventProps) => {
  const {
    meId, roomId, urlRoomId, player, core, coreSetters,
    initWebRTC, cleanupWebRTC, sendTopout,
    setMeId, setPlayerName, setOpponentId, setOpponentName, setRoomId, setWaiting, setDebugInfo,
    setOppStage, setNetOppStage, setOppHold, setOppNextFour, setOppGameOver,
    setMatchResult, setCountdown, setElapsedMs, setTimerOn,
    setMyFillWhiteProgress, setOppFillWhiteProgress, setMyStats,
    setIncomingGarbage, setGarbageToSend,
  } = props;

  const navigate = useNavigate();
  const matchTimer = useRef<number | null>(null);
  const readyEmittedRef = useRef(false);
  
  // Refs to avoid stale closures in event handlers
  const playerRef = useRef(player);
  const coreRef = useRef(core);
  
  // Update refs when props change
  useEffect(() => {
    playerRef.current = player;
    coreRef.current = core;
  }, [player, core]);

  // AFK
  const afkTimeoutRef = useRef<number | null>(null);
  const resetAFKTimer = useCallback(() => {
    if (!C.AFK_ENABLED) return;
    if (afkTimeoutRef.current) clearTimeout(afkTimeoutRef.current);
    afkTimeoutRef.current = window.setTimeout(() => {
      if (roomId) sendTopout('afk');
    }, C.AFK_TIMEOUT_MS);
  }, [roomId, sendTopout]);

  // Disconnect
  const [disconnectCountdown, setDisconnectCountdown] = useState<number | null>(null);
  const disconnectTimerRef = useRef<number | null>(null);
  
  // Auto-exit
  const [autoExitCountdown, setAutoExitCountdown] = useState<number | null>(null);
  const autoExitTimerRef = useRef<number | null>(null);

  // Apply Garbage Animation
  const applyGarbageRows = useCallback((count: number): Promise<StageType | null> => {
    if (count <= 0) return Promise.resolve(null);
    coreSetters.setIsApplyingGarbage(true);
    return new Promise((resolve) => {
      let currentRow = 0;
      let finalStage: StageType | null = null;
      let collisionDetected = false;
      
      const applyNextRow = () => {
        if (collisionDetected) {
          coreSetters.setIsApplyingGarbage(false);
          coreSetters.updatePlayerPos({ x: 0, y: 0, collided: true });
          resolve(finalStage);
          return;
        }
        if (currentRow >= count) {
          coreSetters.setIsApplyingGarbage(false);
          resolve(finalStage);
          return;
        }
        coreSetters.setStage(prev => {
          if (!prev.length) { finalStage = prev; return prev; }
          const width = prev[0].length;
          const cloned = prev.map(row => row.map(cell => [cell[0], cell[1]] as StageCell)) as StageType;
          const hole = Math.floor(Math.random() * width);
          cloned.shift();
          cloned.push(U.createGarbageRow(width, hole));
          if (checkCollision(player, cloned, { x: 0, y: 0 })) {
            collisionDetected = true;
          }
          finalStage = cloned;
          return cloned;
        });
        currentRow++;
        setTimeout(applyNextRow, collisionDetected ? 0 : 100);
      };
      applyNextRow();
    });
  }, [coreSetters, player]);

  // Game Start
  const startGame = useCallback(() => {
    coreSetters.setStage(createStage());
    coreSetters.setDropTime(U.getFallSpeed(0));
    coreSetters.setGameOver(false);
    coreSetters.setRows(0);
    coreSetters.setLevel(0);
    setElapsedMs(0);
    setTimerOn(true);
    coreSetters.clearHold();
    coreSetters.setHasHeld(false);
    coreSetters.setLocking(false);
    setMatchResult(null);
    setIncomingGarbage(0);
    setGarbageToSend(() => 0);
    coreSetters.setCombo(0);
    coreSetters.setB2b(0);
    setOppStage(createStage());
    setOppGameOver(false);
    setNetOppStage(null);
    coreSetters.resetPlayer();
    coreSetters.setRotationState(0);
    if (roomId) setTimeout(() => socket.emit('game:requestNext', roomId, 7), 300);
    resetAFKTimer();
  }, [coreSetters, roomId, setElapsedMs, setTimerOn, setMatchResult, setIncomingGarbage, setGarbageToSend, setOppStage, setOppGameOver, setNetOppStage, resetAFKTimer]);

  const startGameRef = useRef(startGame);
  useEffect(() => { startGameRef.current = startGame; }, [startGame]);

  // Countdown - internal state
  const [countdownInternal, setCountdownInternal] = useState<number | null>(null);
  useEffect(() => {
    if (countdownInternal === null) return;
    if (countdownInternal <= 0) {
      startGameRef.current(); 
      setCountdownInternal(null);
      setCountdown(null);
      return;
    }
    setCountdown(countdownInternal);
    const timerId = setTimeout(() => setCountdownInternal(c => (c ? c - 1 : null)), 1000);
    return () => clearTimeout(timerId);
  }, [countdownInternal, setCountdown]);

  // Matchmaking & Game Start
  useEffect(() => {
    const stopMatchmaking = () => {
      if (matchTimer.current) clearInterval(matchTimer.current);
      matchTimer.current = null;
    };

    const run = async () => {
      if (urlRoomId) {
        setRoomId(urlRoomId);
        try {
          const userStr = localStorage.getItem('tetris:user');
          if (userStr) {
            const user = JSON.parse(userStr);
            const id = user.accountId?.toString() || socket.id || 'unknown';
            const name = (user.username || id).trim();
            setMeId(id); setPlayerName(name);
          } else {
            const id = socket.id || 'unknown';
            setMeId(id); setPlayerName(id);
          }
        } catch (err) { const id = socket.id || 'unknown'; setMeId(id); setPlayerName(id); }
        return;
      }
      
      try {
        const userStr = localStorage.getItem('tetris:user');
        if (!userStr) { setDebugInfo(p => [...p, 'ERROR: Not logged in']); return; }
        const user = JSON.parse(userStr);
        const accountId = user.accountId?.toString() || socket.id;
        const resolvedName = (user.username || accountId).trim();
        setMeId(accountId); setPlayerName(resolvedName);
        setDebugInfo(p => [...p, `Account ID: ${accountId} (${resolvedName})`]);
        socket.emit('ranked:enter', accountId, 1000);
        socket.emit('ranked:match', accountId, 1000);
        setDebugInfo(p => [...p, "Matchmaking started"]);
        matchTimer.current = window.setInterval(() => socket.emit('ranked:match', accountId, 1000), 2000);
      } catch (error) { setDebugInfo(p => [...p, `Error: ${String(error)}`]); }
    };
    run();

    const onFound = (payload: any) => {
      stopMatchmaking();
      setRoomId(payload.roomId);
      setOpponentId(payload.opponent);
      if (payload?.opponent?.username) setOpponentName(String(payload.opponent.username));
      else if (payload?.opponentUsername) setOpponentName(payload.opponentUsername);
      else if (payload?.opponent) setOpponentName(String(payload.opponent));
    };
    socket.on('ranked:found', onFound);

    const onGameStart = (payload?: any) => {
      stopMatchmaking();
      if (payload?.roomId) setRoomId(payload.roomId);
      if (payload?.player1 && payload?.player2 && meId) {
        const myInfo = payload.player1.id === meId ? payload.player1 : payload.player2.id === meId ? payload.player2 : null;
        const oppInfo = payload.player1.id === meId ? payload.player2 : payload.player2.id === meId ? payload.player1 : null;
        if (myInfo?.name) setPlayerName(myInfo.name);
        if (oppInfo) {
          setOpponentId(oppInfo.id);
          setOpponentName(oppInfo.name || `Opponent_${oppInfo.id.slice(0,4)}`);
        }
      }
      if (payload?.next) coreSetters.setQueueSeed(payload.next);
      setNetOppStage(null);
      setWaiting(false);
      setCountdownInternal(3);
    };
    socket.on('game:start', onGameStart);
    
    const onGameStartWebRTC = ({ opponent }: any) => {
      if (opponent) initWebRTC((socket.id || '') < opponent);
    };
    socket.on('game:start', onGameStartWebRTC);

    if (roomId && !readyEmittedRef.current) {
      socket.emit('game:im_ready', roomId);
      readyEmittedRef.current = true;
    }

    return () => {
      stopMatchmaking();
      socket.off('ranked:found', onFound);
      socket.off('game:start', onGameStart);
      socket.off('game:start', onGameStartWebRTC);
    };
  }, [meId, roomId, urlRoomId, initWebRTC, setRoomId, setOpponentId, setOpponentName, setMeId, setPlayerName, setDebugInfo, coreSetters, setNetOppStage, setWaiting]);
  
  // Game Events (abbreviated - only key ones)
  useEffect(() => {
    console.log('[SocketEvents] 🔄 Game events effect re-run (this should NOT happen on piece lock)');
    
    const onGameNext = (arr: any) => {
      if (Array.isArray(arr) && arr.length) {
        coreSetters.pushQueue(arr as any);
      }
    };
    socket.on('game:next', onGameNext);
    
    // Listen for opponent state updates via TCP
    const onGameState = (data: any) => {
      if (data?.matrix) {
        setOppStage(data.matrix);
        setNetOppStage(data.matrix);
      }
      if (data?.hold !== undefined) setOppHold(data.hold);
      if (data?.next && Array.isArray(data.next)) {
        setOppNextFour(data.next.slice(0, 4));
      }
    };
    socket.on('game:state', onGameState);

    const onGameOver = (data: any) => {
      const winner = data?.winner ?? null;
      const reason = data?.reason;
      setTimerOn(false);
      coreSetters.setDropTime(null);
      cleanupWebRTC('game-over');
      if (afkTimeoutRef.current) clearTimeout(afkTimeoutRef.current);
      if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
      setDisconnectCountdown(null);
      
      setMyStats({ rows: coreRef.current.rows, level: coreRef.current.level, score: coreRef.current.rows * 100 });
      
      const runAnim = (target: 'me' | 'opp') => new Promise<void>((resolve) => {
        const setter = target === 'me' ? setMyFillWhiteProgress : setOppFillWhiteProgress;
        setter(0); const start = Date.now(); const dur = 1000;
        const step = () => {
          const p = Math.min(((Date.now() - start) / dur) * 100, 100);
          setter(p);
          if (p < 100) requestAnimationFrame(step); else resolve();
        };
        requestAnimationFrame(step);
      });

      const promises: Promise<void>[] = [];
      if (winner === socket.id) {
        setOppGameOver(true); setNetOppStage(null);
        promises.push(runAnim('opp'));
        Promise.all(promises).then(() => setMatchResult({ outcome: 'win', reason }));
      } else if (winner) {
        coreSetters.setGameOver(true);
        promises.push(runAnim('me'));
        Promise.all(promises).then(() => setMatchResult({ outcome: 'lose', reason }));
      } else {
        coreSetters.setGameOver(true); setOppGameOver(true); setNetOppStage(null);
        promises.push(runAnim('me')); promises.push(runAnim('opp'));
        Promise.all(promises).then(() => setMatchResult({ outcome: 'draw', reason }));
      }
      
      setAutoExitCountdown(60);
      let remaining = 60;
      autoExitTimerRef.current = window.setInterval(() => {
        remaining--;
        setAutoExitCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(autoExitTimerRef.current!);
          autoExitTimerRef.current = null;
          setAutoExitCountdown(null);
          if (meId) socket.emit('ranked:leave', meId);
          cleanupWebRTC('auto-exit');
          navigate('/');
        }
      }, 1000);
    };
    socket.on('game:over', onGameOver);

    const onApplyGarbage = async (data: { lines: number }) => {
      if (data.lines > 0 && !coreRef.current.gameOver) {
        const updated = await applyGarbageRows(data.lines);
        setIncomingGarbage(0);
        if (updated && !coreRef.current.gameOver) {
          if (checkCollision(playerRef.current, updated, { x: 0, y: 0 })) {
            let adjustY = 1;
            while (checkCollision(playerRef.current, updated, { x: 0, y: adjustY }) && adjustY < 10) adjustY++;
            if (!checkCollision(playerRef.current, updated, { x: 0, y: adjustY })) {
              coreSetters.updatePlayerPos({ x: 0, y: adjustY, collided: false });
            } else {
              coreSetters.setLocking(true);
            }
          }
        }
        if (updated && isGameOverFromBuffer(updated)) {
          coreSetters.setGameOver(true);
          coreSetters.setDropTime(null);
          setTimerOn(false);
          if (roomId) sendTopout('garbage');
        }
      }
    };
    socket.on('game:applyGarbage', onApplyGarbage);

    return () => {
      socket.off('game:next', onGameNext);
      socket.off('game:state', onGameState);
      socket.off('game:over', onGameOver);
      socket.off('game:applyGarbage', onApplyGarbage);
    };
  }, [roomId, applyGarbageRows, navigate, meId, setTimerOn, setNetOppStage, setOppStage, setOppHold, setOppNextFour, setOppGameOver, setMatchResult, setMyStats, setMyFillWhiteProgress, setOppFillWhiteProgress, setIncomingGarbage, sendTopout]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (meId) socket.emit('ranked:leave', meId);
      if (afkTimeoutRef.current) clearTimeout(afkTimeoutRef.current);
      if (autoExitTimerRef.current) clearInterval(autoExitTimerRef.current);
      if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
      cleanupWebRTC('component-unmount');
    };
  }, [meId]);

  return {
    resetAFKTimer,
    disconnectCountdown,
    autoExitCountdown,
    autoExitTimerRef,
    countdown: countdownInternal,
  };
};
