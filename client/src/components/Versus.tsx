import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import socket, { SERVER_URL } from '../socket.ts';
import Stage from './Stage';
import { HoldPanel, NextPanel } from './SidePanels';
import { checkCollision, createStage, getTSpinType, isGameOverFromBuffer } from '../gamehelper';
import type { Stage as StageType, Cell as StageCell, TSpinType } from '../gamehelper';
import { usePlayer } from '../hooks/usePlayer';
import { useStage } from '../hooks/useStage';
import { useGameStatus } from '../hooks/useGameStatus';
import { useInterval } from '../hooks/useInterval';

// --- DAS/ARR Movement Settings ---
const DAS_DELAY: number = 120; // Delayed Auto Shift: thời gian giữ phím trước khi tự động lặp (ms)
const MOVE_INTERVAL: number = 40; // Auto Repeat Rate: khoảng cách giữa các lần di chuyển tự động (ms)

// --- Gravity/Speed Settings ---
// Tốc độ rơi: Bắt đầu 800ms ở level 1, giảm dần đến ~16ms ở level 22
const MAX_LEVEL = 22; // Level tối đa

const getFallSpeed = (lvl: number): number => {
  // Cap level tại 22
  const L = Math.min(lvl, MAX_LEVEL - 1); // lvl từ 0-21, map sang level 1-22
  
  // Level 0 (hiển thị level 1): 800ms
  // Level 21 (hiển thị level 22): ~16ms
  const START_SPEED = 800; // 0.8 giây ở level 1
  const END_SPEED = 16.67;  // ~16.67ms ở level 22 (instant)
  
  if (L >= MAX_LEVEL - 1) {
    return END_SPEED;
  }
  
  // Giảm dần theo hàm mũ để có độ chuyển tiếp mượt
  const progress = L / (MAX_LEVEL - 1); // 0 → 1
  const speed = START_SPEED * Math.pow(END_SPEED / START_SPEED, progress);
  
  return Math.max(END_SPEED, speed);
};

// --- Lock Delay Settings ---
const INACTIVITY_LOCK_MS = 750; // Không thao tác trong 0.75s → lock
const HARD_CAP_MS = 3000; // Sau 3s từ lúc chạm đất đầu tiên → lock ngay

type MatchOutcome = 'win' | 'lose' | 'draw';
type MatchSummary = { outcome: MatchOutcome; reason?: string } | null;

const cloneStageForNetwork = (stage: StageType): StageType =>
  stage.map(row => row.map(cell => [cell[0], cell[1]] as StageCell));

const createGarbageRow = (width: number, hole: number): StageCell[] =>
  Array.from({ length: width }, (_, x) => (x === hole ? [0, 'clear'] : ['garbage', 'merged'])) as StageCell[];

const isPerfectClearBoard = (stage: StageType): boolean =>
  stage.every(row => row.every(([value]) =>
    value === 0 || value === '0' || (typeof value === 'string' && value.startsWith('ghost'))
  ));

// Calculate garbage lines from clear action
const calculateGarbageLines = (
  lines: number, 
  tspinType: TSpinType, 
  pc: boolean,
  combo: number,
  b2b: number
): number => {
  if (lines === 0) return 0;

  let garbage = 0;

  // Perfect Clear bonus
  if (pc) {
    garbage = 10;
  } else if (tspinType !== 'none' && lines > 0) {
    // T-Spin clears
    if (tspinType === 'mini' && lines === 1) {
      garbage = 0;
    } else {
      const tspinBase = [0, 2, 4, 6];
      garbage = tspinBase[lines] ?? 0;
    }
  } else {
    // Standard clears
    const standardBase = [0, 0, 1, 2, 4];
    garbage = standardBase[lines] ?? 0;
  }

  // B2B bonus (Back-to-Back Tetris or T-Spin)
  const isTetris = tspinType === 'none' && lines === 4;
  const isTSpinClear = tspinType !== 'none' && lines > 0;
  if (b2b >= 1 && (isTetris || isTSpinClear)) {
    garbage += 1;
  }

  // Combo bonus (combo >= 2)
  if (combo >= 9) garbage += 5;
  else if (combo >= 7) garbage += 4;
  else if (combo >= 5) garbage += 3;
  else if (combo >= 3) garbage += 2;
  else if (combo >= 2) garbage += 1;

  return garbage;
};

const Versus: React.FC = () => {
  const navigate = useNavigate();
  const [meId, setMeId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  // Your (Right side) board state
  const [player, updatePlayerPos, resetPlayer, playerRotate, hold, canHold, nextFour, holdSwap, clearHold, setQueueSeed, pushQueue] = usePlayer();
  const [stage, setStage, rowsCleared, , lastPlacement] = useStage(player);
  const [, , rows, setRows, level, setLevel] = useGameStatus();
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [locking, setLocking] = useState(false);
  const [hasHeld, setHasHeld] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  const [pendingGarbageLeft, setPendingGarbageLeft] = useState(0);
  const [matchResult, setMatchResult] = useState<MatchSummary>(null);
  
  // NEW: Garbage queue and combo/b2b tracking
  const [incomingGarbage, setIncomingGarbage] = useState(0); // Garbage queued from opponent
  const [combo, setCombo] = useState(0);
  const [b2b, setB2b] = useState(0);
  
  // DAS/ARR movement state
  const [moveIntent, setMoveIntent] = useState<{ dir: number; startTime: number; dasCharged: boolean } | null>(null);
  
  // Lock delay state
  const [isGrounded, setIsGrounded] = useState(false);
  const inactivityTimeoutRef = useRef<number | null>(null);
  const capTimeoutRef = useRef<number | null>(null);
  const capExpiredRef = useRef<boolean>(false);
  const groundedSinceRef = useRef<number | null>(null);
  const lastGroundActionRef = useRef<number | null>(null);
  
  // AFK Detection - DISABLED FOR TESTING
  const afkTimeoutRef = useRef<number | null>(null);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const matchTimer = useRef<number | null>(null);
  useEffect(() => { wrapperRef.current?.focus(); }, []);

  // Opponent (Left side) board state - using separate simple state
  const [oppStage, setOppStage] = useState<any[][]>(() => createStage());
  const [oppGameOver, setOppGameOver] = useState(false);
  const [netOppStage, setNetOppStage] = useState<any[][] | null>(null);
  const [oppHold, setOppHold] = useState<any>(null);
  const [oppNextFour, setOppNextFour] = useState<any[]>([]);
  const [garbageToSend, setGarbageToSend] = useState(0);

  const pendingGarbageRef = useRef(0);
  const pendingLockRef = useRef(false);
  useEffect(() => { pendingGarbageRef.current = pendingGarbageLeft; }, [pendingGarbageLeft]);

  const applyGarbageRows = useCallback((count: number): StageType | null => {
    if (count <= 0) return null;
    console.log(`[applyGarbageRows] Applying ${count} garbage rows...`);
    let updated: StageType | null = null;
    setStage(prev => {
      if (!prev.length) {
        updated = prev;
        return prev;
      }
      const width = prev[0].length;
      const cloned = prev.map(row => row.map(cell => [cell[0], cell[1]] as StageCell)) as StageType;
      for (let i = 0; i < count; i++) {
        const hole = Math.floor(Math.random() * width);
        cloned.shift(); // Remove top row
        cloned.push(createGarbageRow(width, hole)); // Add garbage row at bottom
      }
      updated = cloned;
      console.log(`[applyGarbageRows] Applied! Result has ${cloned.filter(row => row.some(cell => cell[0] === 'garbage')).length} garbage rows`);
      return cloned;
    });
    return updated;
  }, [setStage]);

  // --- Lock Delay & Movement Helpers ---
  const clearInactivity = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  const clearCap = useCallback(() => {
    if (capTimeoutRef.current) {
      clearTimeout(capTimeoutRef.current);
      capTimeoutRef.current = null;
    }
  }, []);

  const doLock = useCallback(() => {
    clearInactivity();
    clearCap();
    groundedSinceRef.current = null;
    lastGroundActionRef.current = null;
    capExpiredRef.current = false;
    setIsGrounded(false);
    setLocking(true);
  }, [clearInactivity, clearCap]);

  const startGroundTimers = useCallback(() => {
    if (capExpiredRef.current) {
      doLock();
      return;
    }

    clearInactivity();
    inactivityTimeoutRef.current = setTimeout(() => {
      doLock();
    }, INACTIVITY_LOCK_MS);

    if (!groundedSinceRef.current) {
      groundedSinceRef.current = Date.now();
      capTimeoutRef.current = setTimeout(() => {
        capExpiredRef.current = true;
        doLock();
      }, HARD_CAP_MS);
    }
  }, [doLock, clearInactivity]);

  const onGroundAction = useCallback(() => {
    lastGroundActionRef.current = Date.now();
    clearInactivity();
    if (capExpiredRef.current) {
      doLock();
      return;
    }
    inactivityTimeoutRef.current = setTimeout(() => {
      doLock();
    }, INACTIVITY_LOCK_MS);
  }, [doLock, clearInactivity]);

  // --- Core Game Logic ---
  const startGame = useCallback(() => {
    setStage(createStage());
    setDropTime(getFallSpeed(0));
    setGameOver(false);
    setRows(0);
    setLevel(0);
    setElapsedMs(0);
    setTimerOn(true);
    clearHold();
    setHasHeld(false);
    setLocking(false);
    setPendingGarbageLeft(0);
    pendingGarbageRef.current = 0;
    setGarbageToSend(0);
    setMatchResult(null);
    
    // Reset NEW garbage system
    setIncomingGarbage(0);
    setCombo(0);
    setB2b(0);
    
    // Reset movement state
    setMoveIntent(null);
    
    // Reset lock delay state
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    if (capTimeoutRef.current) clearTimeout(capTimeoutRef.current);
    inactivityTimeoutRef.current = null;
    capTimeoutRef.current = null;
    capExpiredRef.current = false;
    groundedSinceRef.current = null;
    lastGroundActionRef.current = null;
    setIsGrounded(false);

    setOppStage(createStage());
    setOppGameOver(false);
    setNetOppStage(null);
    
    // Ensure first piece spawns
    resetPlayer();
    
    pieceCountRef.current = 0;
    if (roomId) {
      setTimeout(() => socket.emit('game:requestNext', roomId, 7), 300);
    }
  }, [roomId, clearHold, setLevel, setRows, setStage, resetPlayer, setMatchResult]);

  const startGameRef = useRef(startGame);
  useEffect(() => {
    startGameRef.current = startGame;
  });

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;
  
    if (countdown <= 0) {
      startGameRef.current(); 
      setCountdown(null);
      return;
    }
  
    const timerId = setTimeout(() => {
      setCountdown(c => (c ? c - 1 : null));
    }, 1000);
  
    return () => clearTimeout(timerId);
  }, [countdown]);

  // --- Socket Listeners ---
  useEffect(() => {
    const stopMatchmaking = () => {
      if (matchTimer.current) {
        clearInterval(matchTimer.current);
        matchTimer.current = null;
      }
    };

    const run = async () => {
      try {
        // Lấy accountId từ localStorage thay vì IP
        const userStr = localStorage.getItem('tetris:user');
        if (!userStr) {
          console.error('No user found in localStorage');
          setDebugInfo(prev => [...prev, 'ERROR: Not logged in']);
          return;
        }
        
        const user = JSON.parse(userStr);
        const accountId = user.accountId?.toString() || socket.id;
        
        setMeId(accountId);
        setDebugInfo(prev => [...prev, `Account ID: ${accountId} (${user.username})`]);
        
        const elo = 1000;
        socket.emit('ranked:enter', accountId, elo);
        socket.emit('ranked:match', accountId, elo);
        setDebugInfo(prev => [...prev, "Matchmaking started"]);
        
        matchTimer.current = window.setInterval(() => {
          socket.emit('ranked:match', accountId, elo);
        }, 2000);

      } catch (error) {
        console.error("Failed to start matchmaking:", error);
        setDebugInfo(prev => [...prev, `Error: ${error}`]);
      }
    };
    run();

    const onFound = (payload: any) => {
      stopMatchmaking();
      setRoomId(payload.roomId);
      setOpponentId(payload.opponent);
    };
    socket.on('ranked:found', onFound);

    const onGameStart = (payload?: any) => {
      stopMatchmaking();
      // Shield: Only start countdown if we are actually waiting for one.
      if (waiting) {
        if (payload?.roomId) setRoomId(payload.roomId);
        if (payload?.next && Array.isArray(payload.next)) {
            setQueueSeed(payload.next);
            setOppNextFour(payload.next.slice(0, 4));
        }
        setNetOppStage(null);
        setWaiting(false);
        setCountdown(3);
      }
    };
    socket.on('game:start', onGameStart);

    const onGameNext = (arr: any) => {
      if (Array.isArray(arr) && arr.length) {
        pushQueue(arr as any); 
        setOppNextFour((prev: any[]) => [...prev.slice(arr.length), ...arr].slice(0, 4));
      }
    };
    socket.on('game:next', onGameNext);

    const onGameOver = (data: any) => {
      const winner = data?.winner ?? null;
      const reason = data?.reason;
      setTimerOn(false);
      setDropTime(null);
      if (winner === socket.id) {
        setOppGameOver(true);
        setMatchResult({ outcome: 'win', reason });
      } else if (winner) {
        setGameOver(true);
        setMatchResult({ outcome: 'lose', reason });
      } else {
        setGameOver(true);
        setOppGameOver(true);
        setMatchResult({ outcome: 'draw', reason });
      }
    };
    socket.on('game:over', onGameOver);

    // NEW: Incoming garbage notification (queued, not applied yet)
    const onIncomingGarbage = (data: { lines: number }) => {
      console.log('� Incoming garbage queued:', data.lines);
      setIncomingGarbage(data.lines);
    };
    socket.on('game:incomingGarbage', onIncomingGarbage);

    // NEW: Garbage cancelled by counter-attack
    const onGarbageCancelled = (data: { cancelled: number; remaining: number }) => {
      console.log('🛡️ Garbage cancelled:', data.cancelled, 'remaining:', data.remaining);
      setIncomingGarbage(data.remaining);
    };
    socket.on('game:garbageCancelled', onGarbageCancelled);

    // NEW: Apply garbage (after delay from server)
    const onApplyGarbage = (data: { lines: number }) => {
      console.log('💥 Applying garbage:', data.lines);
      if (data.lines > 0 && !gameOver) {
        const updated = applyGarbageRows(data.lines);

        // ✅ Xóa hàng rác chờ sau khi đã nhận
        setIncomingGarbage(0);

        if (updated && isGameOverFromBuffer(updated)) {
          console.log('⚠️ Game over from garbage!');
          setGameOver(true);
          setDropTime(null);
          setTimerOn(false);
          if (roomId) socket.emit('game:topout', roomId);
        }
      }
    };
    socket.on('game:applyGarbage', onApplyGarbage);

    // OLD: Keep for backward compatibility
    const onGarbage = (g: number) => {
      console.log('🗑️ [LEGACY] Received garbage:', g);
      if (g > 0 && !gameOver) {
        const updated = applyGarbageRows(g);
        if (updated && isGameOverFromBuffer(updated)) {
          setGameOver(true);
          setDropTime(null);
          setTimerOn(false);
          if (roomId) socket.emit('game:topout', roomId);
        }
      }
    };
    socket.on('game:garbage', onGarbage);
    
    const onGameState = (data: any) => {
      if (data && Array.isArray(data.matrix)) {
        const incoming = (data.matrix as StageType).map(row =>
          Array.isArray(row) ? row.map(cell => {
            if (Array.isArray(cell) && cell.length >= 2) {
              return [cell[0], cell[1]] as StageCell;
            }
            return [0, 'clear'] as StageCell;
          }) : row
        ) as StageType;
        
        // Debug: Check for garbage in received board
        const garbageRows = incoming.filter(row => row.some(cell => cell[0] === 'garbage')).length;
        console.log('📥 Received opponent board - Garbage rows:', garbageRows);
        
        setOppStage(incoming);
        setNetOppStage(incoming);
      }
      if (data && data.hold !== undefined) {
        setOppHold(data.hold);
      }
      if (data && Array.isArray(data.next)) {
        setOppNextFour(data.next.slice(0, 4));
      }
    };
    socket.on('game:state', onGameState);

    // Player disconnect handler (opponent disconnected)
    const onPlayerDisconnect = (data: any) => {
      if (data?.playerId === opponentId) {
        // Opponent disconnected → auto win
        setTimerOn(false);
        setDropTime(null);
        setOppGameOver(true);
        setMatchResult({ outcome: 'win', reason: 'Đối thủ đã ngắt kết nối' });
      }
    };
    socket.on('player:disconnect', onPlayerDisconnect);

    // [THÊM MỚI] Lắng nghe sự kiện xác nhận đã gửi rác từ server
    const onAttackSent = (data: { amount: number }) => {
        if (data && typeof data.amount === 'number' && data.amount > 0) {
            setGarbageToSend(prev => prev + data.amount);
        }
    };
    socket.on('game:attack_sent', onAttackSent);


    return () => {
      stopMatchmaking();
      socket.off('ranked:found', onFound);
      socket.off('game:start', onGameStart);
      socket.off('game:next', onGameNext);
      socket.off('game:over', onGameOver);
      socket.off('game:incomingGarbage', onIncomingGarbage);
      socket.off('game:garbageCancelled', onGarbageCancelled);
      socket.off('game:applyGarbage', onApplyGarbage);
      socket.off('game:garbage', onGarbage);
      socket.off('game:state', onGameState);
      socket.off('player:disconnect', onPlayerDisconnect);
      socket.off('game:attack_sent', onAttackSent);
    };
  }, [
    meId, 
    waiting, 
    opponentId, 
    gameOver, 
    roomId, 
    applyGarbageRows, 
    isGameOverFromBuffer, 
    setGameOver, 
    setDropTime, 
    setTimerOn,
    setIncomingGarbage
  ]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (meId) socket.emit('ranked:leave', meId);
      if (afkTimeoutRef.current) clearTimeout(afkTimeoutRef.current);
    };
  }, [meId]);
  
  const pieceCountRef = useRef(0);

  const movePlayer = useCallback((dir: number) => {
    if (gameOver || countdown !== null || matchResult !== null) return false;
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
      return true;
    }
    return false;
  }, [gameOver, countdown, matchResult, player, stage, updatePlayerPos]);

  const hardDrop = () => {
    if (gameOver || countdown !== null || matchResult !== null) return;
    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) dropDistance += 1;
    updatePlayerPos({ x: 0, y: dropDistance, collided: true });
    setLocking(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (gameOver || countdown !== null || matchResult !== null) return;
    if ([32, 37, 38, 39, 40, 16, 67].includes(e.keyCode)) e.preventDefault();
  
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) { // Left / Right
      const dir = keyCode === 37 ? -1 : 1;
      if (e.repeat) return;
      setMoveIntent({ dir, startTime: Date.now(), dasCharged: false });
      movePlayer(dir);
      if (isGrounded) {
        onGroundAction();
      }
    } else if (keyCode === 40) { // Down
      if (!e.repeat) {
        setDropTime(MOVE_INTERVAL);
      }
    } else if (keyCode === 38) { // Up (Rotate)
      playerRotate(stage, 1);
      if (isGrounded) {
        onGroundAction();
      }
    } else if (keyCode === 32) { // Space (Hard Drop)
      hardDrop();
    } else if (keyCode === 67) { // C (Hold)
      if (!hasHeld && canHold) {
        holdSwap();
        setHasHeld(true);
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) { // Left / Right
      const dir = keyCode === 37 ? -1 : 1;
      if (moveIntent?.dir === dir) {
        setMoveIntent(null);
      }
    } else if (keyCode === 40) { // Down
      setDropTime(getFallSpeed(level));
    }
  };

  useInterval(() => { // Gravity
    if (gameOver || locking || countdown !== null || matchResult !== null) return;
    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      setLocking(true);
    }
  }, dropTime);

  // DAS Charging
  useInterval(() => {
    if (!moveIntent || moveIntent.dasCharged || gameOver || countdown !== null || matchResult !== null) return;
    const elapsed = Date.now() - moveIntent.startTime;
    if (elapsed >= DAS_DELAY) {
      setMoveIntent(prev => prev ? { ...prev, dasCharged: true } : null);
    }
  }, moveIntent && !moveIntent.dasCharged ? 16 : null);

  // ARR Movement
  useInterval(() => {
    if (!moveIntent || !moveIntent.dasCharged || gameOver || countdown !== null || matchResult !== null) return;
    const moved = movePlayer(moveIntent.dir);
    if (moved && isGrounded) {
      onGroundAction();
    }
  }, moveIntent?.dasCharged ? MOVE_INTERVAL : null);


  useEffect(() => {
    if (locking) {
      updatePlayerPos({x: 0, y: 0, collided: true});
    }
  }, [locking, updatePlayerPos]);
  
  useEffect(() => {
    if (rowsCleared > 0) {
      setRows(prev => {
        const next = prev + rowsCleared;
        setLevel(Math.floor(next / 10));
        return next;
      });
    }
  }, [rowsCleared, setRows, setLevel]);

  // Lock Delay Tracking
  useEffect(() => {
    if (gameOver || countdown !== null || matchResult !== null || locking) {
      setIsGrounded(false);
      clearInactivity();
      clearCap();
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      capExpiredRef.current = false;
      return;
    }

    const grounded = checkCollision(player, stage, { x: 0, y: 1 });
    setIsGrounded(grounded);

    if (grounded) {
      startGroundTimers();
    } else {
      clearInactivity();
      clearCap();
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      capExpiredRef.current = false;
    }
  }, [player, stage, gameOver, countdown, matchResult, locking, startGroundTimers, clearInactivity, clearCap]);

    useEffect(() => {
      if (!player.collided) return;
      pendingLockRef.current = true;
    }, [player.collided]);

    useEffect(() => {
    if (!pendingLockRef.current) return;

    pendingLockRef.current = false;
    setLocking(false);

    const lines = lastPlacement.cleared;
    const mergedStage = lastPlacement.mergedStage;
    const tspinType: TSpinType = getTSpinType(player as any, mergedStage as any, lines);
    const pc = lines > 0 && isPerfectClearBoard(stage);

    console.log('🔒 LOCK - Lines:', lines, '(rowsCleared:', rowsCleared, ') T-Spin:', tspinType, 'PC:', pc, 'Combo:', combo, 'B2B:', b2b);

    // --- LOGIC ĐÃ SỬA ---

    // 1. TÍNH TOÁN newCombo VÀ newB2b TRƯỚC TIÊN
    const isTetris = tspinType === 'none' && lines === 4;
    const isTSpinClear = tspinType !== 'none' && lines > 0;

    let newB2b = b2b;
    let newCombo = combo;

    if (lines > 0) {
        // Combo tăng lên với mỗi lần xóa dòng liên tiếp
        newCombo = combo + 1;
        // B2B tăng nếu là Tetris hoặc T-Spin, nếu không thì reset
        if (isTetris || isTSpinClear) {
            newB2b = b2b + 1;
        } else {
            newB2b = 0;
        }
    } else {
        // Reset combo nếu không xóa dòng nào
        newCombo = 0;
    }

    // 2. SỬ DỤNG CÁC GIÁ TRỊ MỚI ĐỂ TÍNH TOÁN GARBAGE
    if (lines > 0 && roomId) {
        // Truyền newCombo và newB2b vào hàm tính toán
        const garbageLines = calculateGarbageLines(lines, tspinType, pc, newCombo, newB2b);
        console.log('💣 Calculated garbage:', garbageLines, '(lines:', lines, 'newCombo:', newCombo, 'newB2b:', newB2b, ')');

        if (garbageLines > 0) {
            console.log('📤 Emitting game:attack with', garbageLines, 'lines');
            socket.emit('game:attack', roomId, { lines: garbageLines });
            // Lưu ý: State garbageToSend chỉ để hiển thị. Logic gửi đã xong.
            // setGarbageToSend(prev => prev + garbageLines); // Dòng này có thể không cần thiết nếu server xác nhận lại
        } else {
            console.log('⚠️ No garbage to send (calculated 0)');
        }
    }

    // 3. CẬP NHẬT STATE SAU KHI TÍNH TOÁN XONG
    console.log('📊 Updating state: combo', combo, '→', newCombo, '| b2b', b2b, '→', newB2b);
    setCombo(newCombo);
    setB2b(newB2b);

    // 4. TIẾP TỤC LOGIC GAME CÒN LẠI
    if (isGameOverFromBuffer(stage)) {
        setGameOver(true);
        setDropTime(null);
        setTimerOn(false);
        if (roomId) socket.emit('game:topout', roomId);
        return;
    }

    resetPlayer();
    setHasHeld(false);
    setDropTime(getFallSpeed(level));
    pieceCountRef.current += 1;
    if (roomId && pieceCountRef.current % 7 === 0) {
        socket.emit('game:requestNext', roomId, 7);
    }
}, [lastPlacement, stage, roomId, level, combo, b2b, rowsCleared, resetPlayer, player]);


  // Send your state to opponent
  const lastSyncTime = useRef<number>(0);
  const lastSyncedStage = useRef<StageType | null>(null);
  
  useEffect(() => {
    if (!roomId || waiting || gameOver || countdown !== null) return;
    
    const stageChanged = JSON.stringify(lastSyncedStage.current) !== JSON.stringify(stage);
    if (!stageChanged) return;
    
    const now = Date.now();
    if (now - lastSyncTime.current < 100) return;
    lastSyncTime.current = now;
    lastSyncedStage.current = stage;
    
    const gameState = {
      matrix: cloneStageForNetwork(stage),
      hold,
      next: nextFour
    };
    socket.emit('game:state', roomId, gameState);
    
    const garbageCount = stage.filter(row => row.some(cell => cell[0] === 'garbage')).length;
    console.log('📤 Normal sync - Stage has', garbageCount, 'garbage rows');
  }, [stage, hold, nextFour, roomId, waiting, gameOver, countdown]);

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

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{ 
        width: '100vw',
        height: '100vh',
        background: `url('/img/bg.jpg') center/cover, #000`,
        overflow: 'hidden',
        display: 'grid', 
        placeItems: 'center' 
      }}
    >
      <button
        onClick={() => {
          if (roomId && matchResult === null) {
            socket.emit('game:topout', roomId);
          }
          if (meId) socket.emit('ranked:leave', meId);
          navigate('/');
        }}
        style={{ position: 'fixed', top: 12, left: 12, zIndex: 999, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}
      >
        ← Thoát
      </button>
      {matchResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 800,
            pointerEvents: 'none',
            color: '#fff',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 56, fontWeight: 800, textShadow: '0 8px 30px rgba(0,0,0,0.5)', lineHeight: 1.2 }}>
            {matchResult.outcome === 'win' ? 'Bạn thắng!' : matchResult.outcome === 'lose' ? 'Bạn thua!' : 'Hòa trận!'}
          </div>
          {matchResult.reason && (
            <div style={{ marginTop: 12, fontSize: 18, opacity: 0.75 }}>
              Lý do: {matchResult.reason}
            </div>
          )}
        </div>
      )}
      {waiting && !roomId ? (
        <div style={{ color: '#fff', fontSize: 20, textAlign: 'center', padding: 20 }}>
          <div>🔍 Đang tìm trận...</div>
          <div style={{ fontSize: 12, marginTop: 10, opacity: 0.7 }}>
            <div>SERVER_URL: {SERVER_URL}</div>
            <div>Socket connected: {socket.connected ? '✅ Yes' : '❌ No'}</div>
            <div>Me ID: {meId || 'Loading...'}</div>
            {debugInfo.length > 0 && debugInfo.map((info, i) => (
              <div key={i}>• {info}</div>
            ))}
          </div>
          <div style={{ marginTop: 20, fontSize: 14, color: '#aaa' }}>
            💡 Đang kết nối đến server và tìm đối thủ...
          </div>
        </div>
      ) : roomId && waiting ? (
        <div style={{ color: '#fff', fontSize: 20, textAlign: 'center', padding: 20 }}>
          <div>🎮 Đã tìm thấy trận!</div>
          <div style={{ fontSize: 14, marginTop: 10, color: '#aaa' }}>
            Đang chuẩn bị trận đấu với {opponentId}...
          </div>
        </div>
      ) : countdown !== null ? (
        // Show countdown during game start
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(1px)', color: '#fff', fontSize: 80, fontWeight: 800, textShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
          {countdown}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'start', position: 'relative' }}>
          
          {/* 🧪 TEST BUTTON - Test new attack system */}
          <button 
            onClick={() => {
              console.log('🧪 TEST: Sending 2-line attack');
              socket.emit('game:attack', roomId, { lines: 2 });
            }}
            style={{
              position: 'fixed',
              top: 10,
              right: 10,
              zIndex: 9999,
              padding: '8px 16px',
              background: '#ff6b6b',
              color: 'white',
              border: '2px solid #ff5252',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
              boxShadow: '0 2px 8px rgba(255, 107, 107, 0.5)'
            }}
          >
            🧪 TEST ATTACK (2 lines)
          </button>

          {/* Left side: YOU (ĐÃ ĐỔI - Board của bạn bên TRÁI với viền xanh lá) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', alignItems: 'start', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1', color: '#4ecdc4', marginBottom: 4, fontWeight: 700, fontSize: '1.1rem' }}>
              {meId ? `🎮 Bạn: ${meId}` : '🎮 Bạn'}
            </div>
            <HoldPanel hold={hold as any} />
            <div style={{ 
              border: '4px solid #4ecdc4', 
              borderRadius: '8px',
              boxShadow: '0 0 20px rgba(78, 205, 196, 0.5), inset 0 0 10px rgba(78, 205, 196, 0.1)',
              padding: '4px',
              background: 'rgba(78, 205, 196, 0.05)'
            }}>
              <Stage stage={stage} />
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <NextPanel queue={nextFour as any} />
              <div style={{ background: 'rgba(20,20,22,0.35)', padding: 8, borderRadius: 10, color: '#fff' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>STATUS</div>
                <div>Rows: {rows}</div>
                <div>Level: {level}</div>
                <div>Time: {(elapsedMs/1000).toFixed(2)}s</div>
                <div>Combo: {combo}</div>
                <div>B2B: {b2b}</div>
                <div style={{ color: incomingGarbage > 0 ? '#ff6b6b' : '#888' }}>
                  ⚠️ Incoming: {incomingGarbage}
                </div>
                <div style={{ color: '#4ecdc4' }}>💣 Sent: {garbageToSend}</div>
              </div>
            </div>
          </div>

          {/* Right side: OPPONENT (ĐÃ ĐỔI - Board đối thủ bên PHẢI với viền đỏ) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', alignItems: 'start', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1', color: '#ff6b6b', marginBottom: 4, fontWeight: 700, fontSize: '1.1rem' }}>
              {opponentId ? `⚔️ Đối thủ: ${opponentId}` : '⚔️ Đối thủ'}
            </div>
            <HoldPanel hold={oppHold} />
            <div style={{ 
              border: '4px solid #ff6b6b', 
              borderRadius: '8px',
              boxShadow: '0 0 20px rgba(255, 107, 107, 0.5), inset 0 0 10px rgba(255, 107, 107, 0.1)',
              padding: '4px',
              background: 'rgba(255, 107, 107, 0.05)'
            }}>
              <Stage stage={(netOppStage as any) ?? oppStage} />
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {countdown === null && <NextPanel queue={oppNextFour as any} />}
              <div style={{ background: 'rgba(20,20,22,0.35)', padding: 8, borderRadius: 10, color: '#fff' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>OPP STATUS</div>
                <div>GameOver: {oppGameOver ? 'YES' : 'NO'}</div>
                <div>Hold: {oppHold ? oppHold.shape || 'None' : 'None'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {matchResult && (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.55)', color: '#fff', textAlign: 'center', zIndex: 998 }}>
          <div style={{ background: 'rgba(20,20,22,0.8)', padding: '32px 48px', borderRadius: 16, boxShadow: '0 12px 32px rgba(0,0,0,0.45)', minWidth: 320 }}>
            <div style={{ fontSize: 42, fontWeight: 800, marginBottom: 12 }}>
              {matchResult.outcome === 'win' ? '🎉 Bạn đã thắng!' : matchResult.outcome === 'lose' ? '😢 Bạn đã thua' : '🤝 Hòa trận'}
            </div>
            {matchResult.reason && (
              <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 16 }}>Lý do: {matchResult.reason}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button
                onClick={() => {
                  if (meId) socket.emit('ranked:leave', meId);
                  navigate('/');
                }}
                style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                Trở về menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Versus;