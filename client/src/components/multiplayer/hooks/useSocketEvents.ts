// File: src/hooks/useVersus/hooks/useSocketEvents.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../../../socket';
import { checkCollision, createStage, isGameOverFromBuffer } from '../../../game/gamehelper';
import * as C from '../game/constants';
import * as U from '../game/utils';
import type { StageType, StageCell, MatchSummary, GameCoreState, GameCoreSetters } from '../game/types';
import type { RoundResult } from './useVersus';

// ... (type SocketEventProps giữ nguyên)
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
  sendPlayerStats: () => void;
  
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

  setRoundResult: (result: RoundResult) => void;
  setSeriesScore: (score: any) => void;
  setSeriesCurrentGame: (game: number) => void;
  setPlayerRole: (role: 'player1' | 'player2' | null) => void;
  setMatchMode: (mode: 'ranked' | 'casual') => void;
  playerRoleRef: React.RefObject<'player1' | 'player2' | null>;
};
export const useSocketEvents = (props: SocketEventProps) => {
  const {
    meId, roomId, urlRoomId, player, core, coreSetters,
  initWebRTC, cleanupWebRTC, sendTopout, sendPlayerStats,
    setMeId, setPlayerName, setOpponentId, setOpponentName, setRoomId, setWaiting, setDebugInfo,
    setOppStage, setNetOppStage, setOppHold, setOppNextFour, setOppGameOver,
    setMatchResult, setCountdown, setElapsedMs, setTimerOn,
    setMyFillWhiteProgress, setOppFillWhiteProgress, setMyStats,
    setIncomingGarbage, setGarbageToSend,
    setRoundResult, setSeriesScore, setSeriesCurrentGame, setPlayerRole, setMatchMode, playerRoleRef
  } = props;  // ... (các state và hàm nội bộ giữ nguyên)
  const navigate = useNavigate();
  const matchTimer = useRef<number | null>(null);
  const readyEmittedRef = useRef(false);
  const playerRef = useRef(player);
  const coreRef = useRef(core);
  
  useEffect(() => {
    playerRef.current = player;
    coreRef.current = core;
  }, [player, core]);

  const afKTimeoutRef = useRef<number | null>(null);
  const resetAFKTimer = useCallback(() => {
    if (!C.AFK_ENABLED) return;
    if (afKTimeoutRef.current) clearTimeout(afKTimeoutRef.current);
    afKTimeoutRef.current = window.setTimeout(() => {
      if (roomId) sendTopout('afk');
    }, C.AFK_TIMEOUT_MS);
  }, [roomId, sendTopout]);

  const [disconnectCountdown, setDisconnectCountdown] = useState<number | null>(null);
  const disconnectTimerRef = useRef<number | null>(null);
  const [autoExitCountdown, setAutoExitCountdown] = useState<number | null>(null);
  const autoExitTimerRef = useRef<number | null>(null);

  const applyGarbageRows = useCallback((count: number): Promise<StageType | null> => {
    // ... (Giữ nguyên code applyGarbageRows)
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

  const startGame = useCallback(() => {
    // ... (Giữ nguyên code startGame)
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
    setRoundResult(null);
    setIncomingGarbage(0);
    setGarbageToSend(() => 0);
    coreSetters.setCombo(0);
    coreSetters.setB2b(0);
    setOppStage(createStage());
    setOppGameOver(false);
    setNetOppStage(null);
    setMyFillWhiteProgress(0);
    setOppFillWhiteProgress(0);
    coreSetters.resetPlayer();
    coreSetters.setRotationState(0);
    if (roomId) setTimeout(() => socket.emit('game:requestNext', roomId, 7), 300);
    resetAFKTimer();
  }, [coreSetters, roomId, setElapsedMs, setTimerOn, setMatchResult, setRoundResult, setIncomingGarbage, setGarbageToSend, setOppStage, setOppGameOver, setNetOppStage, resetAFKTimer]);

  const startGameRef = useRef(startGame);
  useEffect(() => { startGameRef.current = startGame; }, [startGame]);

  const [countdownInternal, setCountdownInternal] = useState<number | null>(null);
  useEffect(() => {
    // ... (Giữ nguyên code countdown)
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
    // ... (Giữ nguyên code matchmaking: run, onFound, onGameStart, onGameStartWebRTC)
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

      if (payload?.mode) {
        const resolvedMode = payload.mode === 'ranked' ? 'ranked' : 'casual';
        setMatchMode(resolvedMode);
        console.log('[DEBUG] 🎯 matchmaking:found mode:', resolvedMode, payload.mode);
      }
    };
    socket.on('ranked:found', onFound);
    socket.on('matchmaking:found', onFound);

    const onGameStart = (payload?: any) => {
      stopMatchmaking();
      if (payload?.roomId) setRoomId(payload.roomId);
      if (payload?.mode) {
        const resolvedMode = payload.mode === 'ranked' ? 'ranked' : 'casual';
        setMatchMode(resolvedMode);
        console.log('[DEBUG] 🎯 game:start mode:', resolvedMode, payload.mode);
      }
      if (payload?.player1 && payload?.player2 && meId) {
        const myInfo = payload.player1.id === meId ? payload.player1 : payload.player2.id === meId ? payload.player2 : null;
        const oppInfo = payload.player1.id === meId ? payload.player2 : payload.player2.id === meId ? payload.player1 : null;
        if (myInfo?.name) setPlayerName(myInfo.name);
        if (oppInfo) {
          setOpponentId(oppInfo.id);
          setOpponentName(oppInfo.name || `Opponent_${oppInfo.id.slice(0,4)}`);
        }

        // 👇 Determine and persist my role as soon as game starts
        let role: 'player1' | 'player2' | null = null;
        if (payload.player1?.id === meId) role = 'player1';
        else if (payload.player2?.id === meId) role = 'player2';
        if (role) {
          setPlayerRole(role);
          playerRoleRef.current = role;
          try {
            localStorage.setItem('tetris:playerRole', role);
          } catch {}
          console.log('[DEBUG] 🏁 game:start → role resolved:', role, '(meId:', meId, ')');
        } else {
          console.warn('[DEBUG] ⚠️ game:start could not resolve role from payload.player1.id/player2.id', { meId, p1: payload.player1?.id, p2: payload.player2?.id });
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

    // ===============================================
    // 🔽 BẮT ĐẦU PHẦN LOG ĐÃ SỬA 🔽
    // ===============================================

    const onBo3MatchStartLegacy = (payload: any) => {
      console.log('[DEBUG] 🏆 bo3:match-start', payload);
      console.log('[DEBUG] 🏆 My socket.id is:', socket.id);
      
      // ⭐ SET MATCH MODE (ranked or casual)
      if (payload?.mode) {
        setMatchMode(payload.mode);
        console.log('[DEBUG] 🏆 Match mode:', payload.mode);
      }
      
      if (payload?.player1?.socketId && payload.player2?.socketId) {
        let role: 'player1' | 'player2' | null = null;
        
        if (socket.id === payload.player1.socketId) {
          console.log('[DEBUG] 🏆 SETTING playerRole: player1');
          role = 'player1';
        } else if (socket.id === payload.player2.socketId) {
          console.log('[DEBUG] 🏆 SETTING playerRole: player2');
          role = 'player2';
        } else {
          console.log('[DEBUG] ⚠️ WARNING: socket.id mismatch!', socket.id, payload.player1.socketId, payload.player2.socketId);
        }
        
        if (role) {
          // ✅ CẬP NHẬT CẢ STATE VÀ REF NGAY LẬP TỨC
          setPlayerRole(role);
          playerRoleRef.current = role; // 👈 CRITICAL: Set ref immediately!
          localStorage.setItem('tetris:playerRole', role);
          console.log('[DEBUG] ✅ playerRole set to:', role, '(ref:', playerRoleRef.current, ')');
        }
      }
      if (payload?.score) setSeriesScore(payload.score);
      if (payload?.currentGame) setSeriesCurrentGame(payload.currentGame);
    };
    socket.on('bo3:match-start', onBo3MatchStartLegacy);//     const onBo3MatchStart = (payload: any) => {
//       // LOG 3: Lắng nghe sự kiện 'matchmaking:start'
//       console.log('[DEBUG] 🏆 matchmaking:start', payload);

//       if (payload?.playerRole) {
//         // LOG 4: Set role
//         console.log('[DEBUG] 🏆 SETTING playerRole from matchmaking:start:', payload.playerRole);
//         setPlayerRole(payload.playerRole);
//       }
//       if (payload?.series?.score) setSeriesScore(payload.series.score);
//       if (payload?.series?.currentGame) setSeriesCurrentGame(payload.series.currentGame);
//    };
//     socket.on('matchmaking:start', onBo3MatchStart);

    // ===============================================
    // 🔼 KẾT THÚC PHẦN LOG ĐÃ SỬA 🔼
    // ===============================================

    if (roomId && !readyEmittedRef.current) {
      socket.emit('game:im_ready', roomId);
      readyEmittedRef.current = true;
    }

    return () => {
      stopMatchmaking();
      socket.off('ranked:found', onFound);
      socket.off('matchmaking:found', onFound);
      socket.off('game:start', onGameStart);
      socket.off('game:start', onGameStartWebRTC);
//       socket.off('matchmaking:start', onBo3MatchStart);
      socket.off('bo3:match-start', onBo3MatchStartLegacy);
    };
  }, [meId, roomId, urlRoomId, initWebRTC, setRoomId, setOpponentId, setOpponentName, setMeId, setPlayerName, setDebugInfo, coreSetters, setNetOppStage, setWaiting, setPlayerRole, setSeriesScore, setSeriesCurrentGame]);
  
  // Game Events
  useEffect(() => {
    const runAnim = (target: 'me' | 'opp') => new Promise<void>((resolve) => {
    // ... (Giữ nguyên code runAnim)
      const setter = target === 'me' ? setMyFillWhiteProgress : setOppFillWhiteProgress;
      setter(0); const start = Date.now(); const dur = 1000;
      const step = () => {
        const p = Math.min(((Date.now() - start) / dur) * 100, 100);
        setter(p);
        if (p < 100) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });

    const onGameNext = (arr: any) => {
    // ... (Giữ nguyên code onGameNext, onGameState, onGameOver, onApplyGarbage)
      if (Array.isArray(arr) && arr.length) {
        coreSetters.pushQueue(arr as any);
      }
    };
    socket.on('game:next', onGameNext);
    
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
      // ... (Code onGameOver cho BO1)
      const winner = data?.winner ?? null;
      const reason = data?.reason;
      setTimerOn(false);
      coreSetters.setDropTime(null);
      cleanupWebRTC('game-over');
      if (afKTimeoutRef.current) clearTimeout(afKTimeoutRef.current);
      if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
      setDisconnectCountdown(null);
      
      setMyStats({ rows: coreRef.current.rows, level: coreRef.current.level, score: coreRef.current.rows * 100 });
      
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
          navigate('/?modes=1');
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

    // ===============================================
    // 🔽 BẮT ĐẦU LOGIC BO3 MỚI (ĐÃ CHÈN LOG) 🔽
    // ===============================================

    // --- 1. Lắng nghe KẾT QUẢ 1 GAME (ví dụ: 1-0) ---
    const onBo3GameResult = (payload: any) => {
      // LOG 5: Lắng nghe 'bo3:game-result'
      console.log('[DEBUG] 🕹️ bo3:game-result', payload);
      console.log('[DEBUG] 🕹️ playerRoleRef.current khi xử lý game-result:', playerRoleRef.current);

      if (!payload?.winner || !payload?.score) return;

      const myRole = playerRoleRef.current;
      const didIWin = (myRole === 'player1' && payload.winner === 'player1') || 
                      (myRole === 'player2' && payload.winner === 'player2');
      
      // LOG 6: Tính toán thắng/thua
      console.log(`[DEBUG] 🕹️ Game Result: MyRole=${myRole}, Winner=${payload.winner}, DidIWin=${didIWin}`);

      // 🔽 NGƯỜI THẮNG CŨNG GỬI STATS (vì họ không gọi sendTopout()) 🔽
      // Chỉ gửi nếu MÌNH THẮNG (người thua đã gửi qua sendTopout rồi)
      if (didIWin && !coreRef.current.gameOver) {
        console.log('[DEBUG] 📊 Winner sending stats via sendTopout');
        sendTopout('opponent_topout');
      }

      const myNewScore = myRole === 'player1' ? payload.score.player1Wins : payload.score.player2Wins;
      const oppNewScore = myRole === 'player1' ? payload.score.player2Wins : payload.score.player1Wins;

      if (didIWin) {
        console.log('[DEBUG] 📊 Winner sending stats via sendPlayerStats');
        sendPlayerStats();
        setOppGameOver(true);
        runAnim('opp');
      } else {
        coreSetters.setGameOver(true);
        runAnim('me');
      }
      setSeriesScore(payload.score);
      setRoundResult({
        outcome: didIWin ? 'win' : 'lose',
        score: { me: myNewScore, opp: oppNewScore }
      });
      
      setTimeout(() => {
         setRoundResult(null);
      }, 4000); 
    };
    socket.on('bo3:game-result', onBo3GameResult);    // --- 2. Lắng nghe sự kiện BẮT ĐẦU GAME MỚI (ví dụ: game 2) ---
    const onBo3NextGame = (payload: any) => {
      // LOG 7: Lắng nghe 'bo3:next-game-start'
      console.log('[DEBUG] 🚀 bo3:next-game-start', payload);
      
      setRoundResult(null);
      setMatchResult(null); 
      if (payload?.gameNumber) setSeriesCurrentGame(payload.gameNumber);
      if (payload?.score) setSeriesScore(payload.score);
      setCountdownInternal(3);
    };
    socket.on('bo3:next-game-start', onBo3NextGame);

    // --- 3. Lắng nghe KẾT THÚC CẢ TRẬN BO3 (ví dụ: 2-0) ---
    const onBo3MatchEnd = (payload: any) => {
      // LOG 8: Lắng nghe 'bo3:match-end'
      console.log('[DEBUG] 🏁 bo3:match-end', payload);
      console.log('[DEBUG] 🏁 playerRoleRef.current khi xử lý match-end:', playerRoleRef.current);

      if (!payload?.winner || !payload?.score) return;

      const myRole = playerRoleRef.current;
      const didIWin = (myRole === 'player1' && payload.winner === 'player1') || 
                      (myRole === 'player2' && payload.winner === 'player2');
      
      // LOG 9: Tính toán thắng/thua
      console.log(`[DEBUG] 🏁 Match End: MyRole=${myRole}, Winner=${payload.winner}, DidIWin=${didIWin}`);

      setSeriesScore(payload.score);
      setTimerOn(false);
      coreSetters.setDropTime(null);
      cleanupWebRTC('game-over-bo3');
      if (afKTimeoutRef.current) clearTimeout(afKTimeoutRef.current);
      if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
      setDisconnectCountdown(null);
  
      setMyStats({ rows: coreRef.current.rows, level: coreRef.current.level, score: coreRef.current.rows * 100 });
      
      const promises: Promise<void>[] = [];
      if (didIWin) {
        setOppGameOver(true); setNetOppStage(null);
        promises.push(runAnim('opp'));
        Promise.all(promises).then(() => setMatchResult({ outcome: 'win', reason: 'Bạn đã thắng trận đấu' }));
      } else {
        coreSetters.setGameOver(true);
        promises.push(runAnim('me'));
        Promise.all(promises).then(() => setMatchResult({ outcome: 'lose', reason: 'Bạn đã thua trận đấu' }));
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
          navigate('/?modes=1');
        }
      }, 1000);
    };
    socket.on('bo3:match-end', onBo3MatchEnd);

    return () => {
      socket.off('game:next', onGameNext);
      socket.off('game:state', onGameState);
      socket.off('game:over', onGameOver);
      socket.off('game:applyGarbage', onApplyGarbage);
      socket.off('bo3:game-result', onBo3GameResult);
      socket.off('bo3:next-game-start', onBo3NextGame);
      socket.off('bo3:match-end', onBo3MatchEnd);
    };
  }, [
    roomId, applyGarbageRows, navigate, meId, setTimerOn, setNetOppStage, 
    setOppStage, setOppHold, setOppNextFour, setOppGameOver, setMatchResult, 
    setMyStats, setMyFillWhiteProgress, setOppFillWhiteProgress, 
    setIncomingGarbage, sendTopout,
    playerRoleRef, setRoundResult, setSeriesScore, setSeriesCurrentGame,
    coreSetters, coreRef
  ]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (meId) socket.emit('ranked:leave', meId);
      if (afKTimeoutRef.current) clearTimeout(afKTimeoutRef.current);
      if (autoExitTimerRef.current) clearInterval(autoExitTimerRef.current);
      if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
      cleanupWebRTC('component-unmount');
    };
  }, [meId, cleanupWebRTC]);

  return {
    resetAFKTimer,
    disconnectCountdown,
    autoExitCountdown,
    autoExitTimerRef,
    countdown: countdownInternal,
  };
};