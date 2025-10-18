// Import cac panel tu SidePanels
import { HoldPanel, NextPanel } from "./SidePanels";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { createStage, checkCollision, isGameOverFromBuffer, isTSpin } from "../gamehelper";
// Styled Components
import { StyledTetris, StyledTetrisWrapper } from "./styles/StyledTetris";

// Custom Hooks
import { useInterval } from "../hooks/useInterval";
import { usePlayer } from "../hooks/usePlayer";
import { useStage } from "../hooks/useStage";
import { useGameStatus } from "../hooks/useGameStatus";

// Components
import Stage from "./Stage";
import StartButton from "./StartButton";

// --- CAI DAT DO NHAY PHIM ---
const DAS_DELAY: number = 120;
const MOVE_INTERVAL: number = 40;

// Tốc độ rơi: Bắt đầu 800ms ở level 1, giảm dần đến ~16ms ở level 22
const MAX_LEVEL = 22; // Level tối đa, không tăng thêm

const getFallSpeed = (lvl: number): number => {
  // Cap level tại 22
  const L = Math.min(lvl, MAX_LEVEL - 1); // lvl từ 0-21, map sang level 1-22
  
  // Level 0 (hiển thị level 1): 800ms
  // Level 21 (hiển thị level 22): ~16ms
  // Công thức giảm dần tuyến tính theo logarit
  const START_SPEED = 800; // 0.8 giây ở level 1
  const END_SPEED = 16.67;  // ~16.67ms ở level 22 (instant)
  
  if (L >= MAX_LEVEL - 1) {
    return END_SPEED;
  }
  
  // Giảm dần theo hàm mũ để có độ chuyển tiếp mượt
  // Từ level 0→21: speed giảm từ 800ms → 16.67ms
  const progress = L / (MAX_LEVEL - 1); // 0 → 1
  const speed = START_SPEED * Math.pow(END_SPEED / START_SPEED, progress);
  
  return Math.max(END_SPEED, speed);
};

// Dual-timer lock logic
const INACTIVITY_LOCK_MS = 750; // Không thao tác trong 0.75s kể từ lần thao tác cuối khi đang chạm đất → lock
const HARD_CAP_MS = 3000;        // Sau 3s kể từ lúc chạm đất đầu tiên: mọi thao tác khi vẫn chạm → lock ngay

// --- THAM SO VI TRI PANEL (chinh tai day) ---
const PANEL_WIDTH = 120;     // do rong khung preview
const PANEL_OFFSET_Y = -8;   // am = nho len khoi mep tren board
const SIDE_GAP = 14;         // khoang cach panel so voi mep board
const HOLD_OFFSET_X = PANEL_WIDTH + SIDE_GAP; // lech trai
const NEXT_OFFSET_X = PANEL_WIDTH + SIDE_GAP; // lech phai

// Dich chuyen RIÊNG board (không ảnh hưởng HOLD/NEXT)
// Đổi các giá trị này để dời board theo trục X/Y (px)
const BOARD_SHIFT_X = 0;
const BOARD_SHIFT_Y = -30;

// Dich chuyen RIÊNG panel HOLD/NEXT (px) — độc lập với board
const HOLD_SHIFT_X = 30;
const HOLD_SHIFT_Y = 0;
const NEXT_SHIFT_X = 50;
const NEXT_SHIFT_Y = 0;

const Tetris: React.FC = () => {
  const navigate = useNavigate();
  
  // Load settings from localStorage
  const [gameSettings] = useState(() => {
    const saved = localStorage.getItem('tetris:singleSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          linesToClear: 40,
          showGhost: true,
          enableHardDrop: true,
          showNext: true,
          showHold: true,
        };
      }
    }
    return {
      linesToClear: 40,
      showGhost: true,
      enableHardDrop: true,
      showNext: true,
      showHold: true,
    };
  });

  // Hold state
  const [hasHeld, setHasHeld] = useState(false);
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [startGameOverSequence, setStartGameOverSequence] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3); // 3-2-1
  const [showGameOverOverlay, setShowGameOverOverlay] = useState(false); // Show after whiteout

  // dong bo lock
  const [locking, setLocking] = useState(false);
  // trạng thái chạm đất + timers
  const [isGrounded, setIsGrounded] = useState(false);
  const inactivityTimeoutRef = useRef<number | null>(null);
  const capTimeoutRef = useRef<number | null>(null);
  const capExpiredRef = useRef<boolean>(false);
  const groundedSinceRef = useRef<number | null>(null);
  const lastGroundActionRef = useRef<number | null>(null);
  const prevPlayerRef = useRef<{ x: number; y: number; rotKey: string } | null>(null);

  // DAS/ARR
  const [moveIntent, setMoveIntent] = useState<{ dir: number; startTime: number; dasCharged: boolean } | null>(null);

  // hooks game
  const [player, updatePlayerPos, resetPlayer, playerRotate, hold, canHold, nextFour, holdSwap, clearHold] = usePlayer();
  const [stage, setStage, rowsCleared, clearEventId] = useStage(player);
  const [, , rows, setRows, level, setLevel] = useGameStatus();
  const [win, setWin] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  // Whiteout sweep for game over
  // progress not exposed to UI; animation drives stage directly
  const whiteoutRaf = useRef<number | null>(null);

  // Real-time stats
  const [piecesPlaced, setPiecesPlaced] = useState(0);
  const [inputs, setInputs] = useState(0);
  const [holds, setHolds] = useState(0);

  // Hard drop repeat delay (hold Space to spam)
  const hardDropLastTimeRef = useRef<number>(0);
  const HARD_DROP_DELAY = 100; // ms between hard drops when holding Space

  // AFK Warning System - DISABLED FOR TESTING (removed unused state)
  const afkTimeoutRef = useRef<number | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    wrapperRef.current?.focus();
  }, []);

  // Đếm ngược khi vào màn single
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      // tự động bắt đầu trò chơi sau đếm ngược
      startGame();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const movePlayer = (dir: number) => {
    if (gameOver || startGameOverSequence || locking || countdown !== null || win) return;
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
      setInputs(prev => prev + 1); // Count input
    }
  };

  const movePlayerToSide = (dir: number) => {
    if (gameOver || startGameOverSequence || locking || countdown !== null || win) return;
    let distance = 0;
    while (!checkCollision(player, stage, { x: dir * (distance + 1), y: 0 })) distance += 1;
    if (distance > 0) {
      updatePlayerPos({ x: dir * distance, y: 0, collided: false });
      setInputs(prev => prev + 1); // Count input
    }
  };

  const startGame = (): void => {
    setStage(createStage());
    setDropTime(getFallSpeed(0));
    setGameOver(false);
    setShowGameOverOverlay(false); // Reset overlay
    setStartGameOverSequence(false);
  // reset whiteout
  if (whiteoutRaf.current) cancelAnimationFrame(whiteoutRaf.current);
    setMoveIntent(null);
  // score removed
    setRows(0);
    setLevel(0);
    setWin(false);
    setElapsedMs(0);
    setTimerOn(true);
    setPiecesPlaced(0);
    setInputs(0);
    setHolds(0);
    hardDropLastTimeRef.current = 0; // Reset hard drop timer
    clearHold(); // reset vùng hold về rỗng khi chơi lại
    setHasHeld(false);
    // clear lock timers + grounded
    if (inactivityTimeoutRef.current) { clearTimeout(inactivityTimeoutRef.current); inactivityTimeoutRef.current = null; }
    if (capTimeoutRef.current) { clearTimeout(capTimeoutRef.current); capTimeoutRef.current = null; }
    capExpiredRef.current = false;
    groundedSinceRef.current = null;
    lastGroundActionRef.current = null;
    setIsGrounded(false);
    resetPlayer();
    wrapperRef.current?.focus();
  };

  // Helpers cho lock delay
  const clearInactivity = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  };
  const clearCap = () => {
    if (capTimeoutRef.current) {
      clearTimeout(capTimeoutRef.current);
      capTimeoutRef.current = null;
    }
  };

  const doLock = () => {
    // Khóa khối sau delay: kiểm tra game over và T-Spin, rồi cập nhật collided
    if (isGameOverFromBuffer(stage)) {
      setGameOver(true);
      setDropTime(null);
      setTimerOn(false);
      clearInactivity();
      clearCap();
      capExpiredRef.current = false;
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      setIsGrounded(false);
      return;
    }
    const tspin = (player.type === 'T') && isTSpin(player as any, stage as any);
    if (tspin) console.log('T-Spin!');
    setLocking(true);
    clearInactivity();
    clearCap();
    capExpiredRef.current = false;
    groundedSinceRef.current = null;
    lastGroundActionRef.current = null;
    setIsGrounded(false);
    updatePlayerPos({ x: 0, y: 0, collided: true });
  };

  const startGroundTimers = () => {
    setIsGrounded(true);
    const now = Date.now();
    const firstTouch = groundedSinceRef.current == null;
    groundedSinceRef.current = groundedSinceRef.current ?? now; // set once
    lastGroundActionRef.current = now;
    // reset inactivity each time ground is (re)entered
    clearInactivity();
    inactivityTimeoutRef.current = window.setTimeout(() => {
      doLock(); // không thao tác 2s → lock
    }, INACTIVITY_LOCK_MS);
    // start hard cap only once at first touch
    if (firstTouch && !capTimeoutRef.current) {
      capExpiredRef.current = false;
      capTimeoutRef.current = window.setTimeout(() => {
        capExpiredRef.current = true; // sau 3s từ lúc chạm đất đầu tiên
      }, HARD_CAP_MS);
    }
  };

  const onGroundAction = () => {
    // gọi khi có di chuyển/rotate mà vẫn đang chạm đất
    if (capExpiredRef.current) {
      doLock();
      return;
    }
    lastGroundActionRef.current = Date.now();
    // reset inactivity timer
    clearInactivity();
    inactivityTimeoutRef.current = window.setTimeout(() => doLock(), INACTIVITY_LOCK_MS);
  };

  // AFK Timer Management - DISABLED FOR TESTING (removed)
  const clearAFKTimer = () => {
    if (afkTimeoutRef.current) {
      clearTimeout(afkTimeoutRef.current);
      afkTimeoutRef.current = null;
    }
  };

  const drop = (): void => {
    if (countdown !== null) return;
    if (rows > (level + 1) * 10) {
      const newLevel = level + 1;
      setLevel((prev) => prev + 1);
      setDropTime(getFallSpeed(newLevel));
    }
    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      // Chạm đất: tạm dừng gravity và (re)start timers
      setDropTime(null);
      startGroundTimers();
    }
  };

  const hardDrop = (): void => {
    if (gameOver || startGameOverSequence || countdown !== null) return;
    
    // Throttle hard drop to allow spam but with delay
    const now = Date.now();
    if (now - hardDropLastTimeRef.current < HARD_DROP_DELAY) return;
    hardDropLastTimeRef.current = now;
    
    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) dropDistance += 1;
    const finalY = player.pos.y + dropDistance;
    if (finalY <= 0) {
      setGameOver(true);
      setDropTime(null);
      setTimerOn(false); // End game → ngừng bấm giờ
      return;
    }
    // Hard drop: khóa ngay, bỏ qua delay
    setDropTime(null);
    setLocking(true);
    clearInactivity();
    clearCap();
    capExpiredRef.current = false;
    groundedSinceRef.current = null;
    lastGroundActionRef.current = null;
    setIsGrounded(false);
    if (dropDistance > 0) updatePlayerPos({ x: 0, y: dropDistance, collided: true });
    else updatePlayerPos({ x: 0, y: 0, collided: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    // AFK warning system disabled for testing
    
    if (gameOver || startGameOverSequence || countdown !== null || win) return;
  if ([32, 37, 38, 39, 40, 16].includes(e.keyCode)) {
      e.preventDefault();
      e.stopPropagation();
    }
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) {
      const dir = keyCode === 37 ? -1 : 1;
      if (!moveIntent || moveIntent.dir !== dir) {
        movePlayer(dir);
        setMoveIntent({ dir, startTime: Date.now(), dasCharged: false });
      }
    } else if (keyCode === 40) {
      if (!checkCollision(player, stage, { x: 0, y: 1 })) {
        updatePlayerPos({ x: 0, y: 1, collided: false });
        setInputs(prev => prev + 1); // Count input
      } else {
        // Soft drop nhưng đã chạm đất → áp dụng timers, không khóa ngay
        startGroundTimers();
      }
    } else if (keyCode === 38) {
      if (!locking) {
        playerRotate(stage, 1);
        setInputs(prev => prev + 1); // Count input
        // nếu vẫn chạm đất sau xoay → coi như 1 thao tác trên đất
        if (checkCollision(player, stage, { x: 0, y: 1 })) onGroundAction();
      }
  } else if (keyCode === 32) {
      // Hard drop only if enabled in settings
      if (gameSettings.enableHardDrop) {
        hardDrop();
        setInputs(prev => prev + 1); // Count input
      }
  } else if (keyCode === 16) { // Shift -> Hold
      // Hold only if enabled in settings
      if (gameSettings.showHold && !hasHeld && canHold) {
        holdSwap();
        setHasHeld(true);
        setHolds(prev => prev + 1); // Count hold
        setInputs(prev => prev + 1); // Count input
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (gameOver || startGameOverSequence || countdown !== null || win) return;
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) setMoveIntent(null);
    else if (keyCode === 40) setDropTime(isGrounded ? null : getFallSpeed(level));
  };

  // ROI
  useInterval(() => {
    if (!gameOver && !startGameOverSequence && !locking && !win) drop();
  }, dropTime !== undefined ? dropTime : null);

  // DAS
  useInterval(() => {
    if (moveIntent && !locking) {
      const { dir, startTime, dasCharged } = moveIntent;
      const now = Date.now();
      if (now - startTime > DAS_DELAY && !dasCharged) {
        if (MOVE_INTERVAL === 0) movePlayerToSide(dir);
        setMoveIntent((prev) => (prev ? { ...prev, dasCharged: true } : null));
      }
    }
  }, MOVE_INTERVAL > 0 ? MOVE_INTERVAL : 16);

  // ARR > 0
  useInterval(() => {
    if (moveIntent && moveIntent.dasCharged && MOVE_INTERVAL > 0 && !locking) {
      movePlayer(moveIntent.dir);
    }
  }, MOVE_INTERVAL > 0 ? MOVE_INTERVAL : null);

  // reset hold cho khoi tiep theo
  useEffect(() => {
    if (player.collided && !gameOver) setHasHeld(false);
  }, [player.collided, gameOver]);

  // reset sau khi merge
  useEffect(() => {
    if (locking && player.collided && !gameOver) {
      setPiecesPlaced(prev => {
        const newCount = prev + 1;
        console.log('Piece placed! Total:', newCount);
        return newCount;
      });
      resetPlayer();
      setMoveIntent(null);
      setLocking(false);
  setDropTime(getFallSpeed(level));
      clearInactivity();
      clearCap();
      capExpiredRef.current = false;
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      setIsGrounded(false);
    }
  }, [stage, locking, player.collided, gameOver, level, resetPlayer]);

  // spawn overlap -> game over (giu logic cu)
  useEffect(() => {
    const isSpawningNewPlayer = player.pos.x === 5 && player.pos.y === 0 && !player.collided;
    if (isSpawningNewPlayer && checkCollision(player, stage, { x: 0, y: 0 })) {
      setDropTime(null);
      setStartGameOverSequence(true);
    }
  }, [player, stage]);

  useEffect(() => {
    if (startGameOverSequence && !gameOver) {
      updatePlayerPos({ x: 0, y: 0, collided: true });
      setGameOver(true);
      setTimerOn(false);
      clearInactivity();
      clearCap();
      capExpiredRef.current = false;
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      setIsGrounded(false);
    }
  }, [startGameOverSequence, gameOver, updatePlayerPos]);

  // Game over whiteout animation: sweep from bottom to top over 1s
  useEffect(() => {
    if (!gameOver) {
      setShowGameOverOverlay(false); // Reset overlay flag
      return;
    }
    
    const duration = 1000;
    const height = stage.length;
    const start = performance.now();

  const animate = (t: number) => {
      const elapsed = t - start;
      const p = Math.min(1, elapsed / duration);
      const rowsToWhite = Math.floor(p * height);
      setStage(prev => {
        const copy = prev.map(r => r.slice()) as any[];
        for (let i = 0; i < rowsToWhite; i++) {
          const rowIdx = copy.length - 1 - i;
          if (rowIdx >= 0) {
            copy[rowIdx] = (copy[rowIdx] as any[]).map((cell: any) => {
              const occupied = cell && cell[0] !== 0 && cell[0] !== '0';
              return occupied ? ['W', 'merged'] : cell;
            });
          }
        }
        return copy as any;
      });
      if (p < 1) {
        whiteoutRaf.current = requestAnimationFrame(animate);
      } else {
        // Animation complete, show overlay after brief delay
        setTimeout(() => setShowGameOverOverlay(true), 200);
      }
    };

    whiteoutRaf.current = requestAnimationFrame(animate);
    return () => {
      if (whiteoutRaf.current) cancelAnimationFrame(whiteoutRaf.current);
    };
  }, [gameOver, stage.length, setStage]);

  // Đếm thời gian chơi (ms)
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

  // Cộng rows đúng 1 lần theo sự kiện clear và kiểm tra thắng 150
  useEffect(() => {
    if (rowsCleared > 0) {
      setRows((prev) => prev + rowsCleared);
    }
  }, [clearEventId]);

  useEffect(() => {
    if (!win && rows >= gameSettings.linesToClear) {
      setWin(true);
      setTimerOn(false);
      setDropTime(null);
    }
  }, [rows, win, gameSettings.linesToClear]);

  // Theo dõi thay đổi player/stage để (re)start/cancel lock delay dựa trên trạng thái chạm đất
  useEffect(() => {
    // detect player changes
    const currKey = JSON.stringify(player.tetromino);
    const prev = prevPlayerRef.current;
    prevPlayerRef.current = { x: player.pos.x, y: player.pos.y, rotKey: currKey };

    if (gameOver || startGameOverSequence || countdown !== null) {
      clearInactivity();
      clearCap();
      capExpiredRef.current = false;
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      setIsGrounded(false);
      return;
    }
    if (player.collided) return; // đã khóa rồi, đợi reset
    const touching = checkCollision(player, stage, { x: 0, y: 1 });
    if (touching) {
      // bắt đầu timers nếu mới chạm
      if (!isGrounded) startGroundTimers();
      else {
        // nếu đã chạm: kiểm tra xem có thao tác (di chuyển/rotate) hay không
        if (
          prev && (prev.x !== player.pos.x || prev.y !== player.pos.y || prev.rotKey !== currKey)
        ) {
          onGroundAction();
        }
      }
    } else {
      // Nhấc khỏi đất: hủy timers và tiếp tục gravity
      if (isGrounded) {
        clearInactivity();
        clearCap();
        capExpiredRef.current = false;
        groundedSinceRef.current = null;
        lastGroundActionRef.current = null;
        setIsGrounded(false);
        setDropTime(getFallSpeed(level));
      }
    }
  }, [player, stage, gameOver, startGameOverSequence, countdown, level, isGrounded]);

  // Dọn dẹp khi unmount
  useEffect(() => () => { clearInactivity(); clearCap(); clearAFKTimer(); }, []);

  // AFK Timer cleanup on unmount - DISABLED FOR TESTING
  useEffect(() => {
    // Cleanup on unmount or state change
    return () => clearAFKTimer();
  }, [countdown, gameOver, startGameOverSequence]);

  return (
    <StyledTetrisWrapper
      ref={wrapperRef}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{
        background: `url('/img/bg2.gif') center/cover, #000`,
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Nút Thoát về menu */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 999,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 8,
          cursor: 'pointer'
        }}
      >
        ← Thoát
      </button>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          width: "100vw",
          height: "100vh",
          paddingTop: 24,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr", // chi hien board o giua
            gap: 0,
            alignItems: "center",
            background: "rgba(255,255,255,0.0)",
            justifyItems: "center",
          }}
        >
          {/* BOARD + overlay HOLD / NEXT+STATS */}
          <div
            style={{
              position: "relative",
            }}
          >
            <StyledTetris>
              <div style={{ transform: `translate(${BOARD_SHIFT_X}px, ${BOARD_SHIFT_Y}px)` }}>
                {/* Trong đếm ngược vẫn hiển thị board nhưng không có khối */}
                <Stage stage={countdown !== null ? createStage() : stage} showGhost={gameSettings.showGhost} />
              </div>
            </StyledTetris>

      {/* HOLD (trai tren) - Only show if enabled */}
      {gameSettings.showHold && (
<HoldPanel
  hold={hold}
  style={{
    position: "absolute",
    top: PANEL_OFFSET_Y + HOLD_SHIFT_Y,
    left: -HOLD_OFFSET_X + HOLD_SHIFT_X,
    width: PANEL_WIDTH,
    padding: 8,
    borderRadius: 10,
    background: "rgba(20,20,22,0.35)",
    backdropFilter: "blur(6px)",
  }}
/>
      )}

{/* NEXT + STATS phai tren */}
<div
  style={{
    position: "absolute",
  top: PANEL_OFFSET_Y + NEXT_SHIFT_Y,
  right: -NEXT_OFFSET_X + NEXT_SHIFT_X,
    width: PANEL_WIDTH,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  }}
>
  {/* Next queue - Only show if enabled */}
  {gameSettings.showNext && (
    <NextPanel queue={nextFour} style={{ background: "rgba(20,20,22,0.35)", padding: 8, borderRadius: 10 }} />
  )}
  <div style={{ background: "rgba(20,20,22,0.35)", padding: 8, borderRadius: 10, color: '#fff', fontSize: 13 }}>
    <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>STATUS</div>
    <div style={{ marginBottom: 4 }}>
      <span style={{ color: '#888' }}>Lines:</span>{' '}
      <span style={{ fontWeight: 600 }}>{rows}</span>
      <span style={{ color: '#666' }}> / {gameSettings.linesToClear}</span>
    </div>
    <div style={{ marginBottom: 4 }}>
      <span style={{ color: '#888' }}>Level:</span> <span style={{ fontWeight: 600 }}>{level + 1}</span>
    </div>
    <div style={{ marginBottom: 4 }}>
      <span style={{ color: '#888' }}>Time:</span> <span style={{ fontWeight: 600 }}>{(elapsedMs/1000).toFixed(2)}s</span>
    </div>
    <div style={{ marginBottom: 4 }}>
      <span style={{ color: '#888' }}>PPS:</span>{' '}
      <span style={{ fontWeight: 600 }} title={`Pieces: ${piecesPlaced}, Time: ${(elapsedMs/1000).toFixed(2)}s`}>
        {elapsedMs > 0 ? ((piecesPlaced / (elapsedMs / 1000))).toFixed(2) : '0.00'}
      </span>
    </div>
    <div style={{ marginBottom: 4 }}>
      <span style={{ color: '#888' }}>Pieces:</span> <span style={{ fontWeight: 600 }}>{piecesPlaced}</span>
    </div>
    <div style={{ marginBottom: 4 }}>
      <span style={{ color: '#888' }}>Inputs:</span> <span style={{ fontWeight: 600 }}>{inputs}</span>
    </div>
    <div style={{ marginBottom: 4 }}>
      <span style={{ color: '#888' }}>Holds:</span> <span style={{ fontWeight: 600 }}>{holds}</span>
    </div>
    <div style={{ marginBottom: 4 }}>
      <span style={{ color: '#888' }}>Finesse:</span>{' '}
      <span style={{ fontWeight: 600 }}>
        {piecesPlaced > 0 ? ((inputs / piecesPlaced)).toFixed(2) : '0.00'}
      </span>
    </div>
  </div>
  {/* Only show Start button when game is not running */}
  {(gameOver || countdown === null && !timerOn) && (
    <div style={{ marginTop: 4 }}>
      <StartButton callback={startGame} />
    </div>
  )}
</div>
          </div>

          {/* Start/Game Over moved under the right panel */}
        </div>
      </div>

      {/* Overlay countdown */}
      {countdown !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
            background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(1px)',
            color: '#fff', fontSize: 80, fontWeight: 800,
            textShadow: '0 6px 24px rgba(0,0,0,0.4)'
          }}
        >
          {countdown}
        </div>
      )}

      {/* Win overlay with stats */}
      {win && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'rgba(40,40,45,0.95)',
              padding: '32px 48px',
              borderRadius: 16,
              border: '2px solid rgba(0,200,100,0.5)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              color: '#fff',
              textAlign: 'center',
              minWidth: 320,
            }}
          >
            <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 24, color: '#00ff88' }}>
              🎉 YOU WIN! 🎉
            </div>
            <div style={{ fontSize: 14, textAlign: 'left', lineHeight: 1.8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>Time:</span>
                <span style={{ fontWeight: 600 }}>{(elapsedMs / 1000).toFixed(2)}s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>Lines Cleared:</span>
                <span style={{ fontWeight: 600 }}>{rows}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>Level:</span>
                <span style={{ fontWeight: 600 }}>{level + 1}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>Pieces Placed:</span>
                <span style={{ fontWeight: 600 }}>{piecesPlaced}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>PPS (Pieces/sec):</span>
                <span style={{ fontWeight: 600 }}>
                  {elapsedMs > 0 ? (piecesPlaced / (elapsedMs / 1000)).toFixed(2) : '0.00'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>Total Inputs:</span>
                <span style={{ fontWeight: 600 }}>{inputs}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>Holds Used:</span>
                <span style={{ fontWeight: 600 }}>{holds}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>Finesse (Inputs/Piece):</span>
                <span style={{ fontWeight: 600 }}>
                  {piecesPlaced > 0 ? (inputs / piecesPlaced).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => {
                  setWin(false);
                  setCountdown(3); // Start countdown before game
                }}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  color: '#fff',
                  padding: '12px 32px',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginRight: 12,
                }}
              >
                Play Again
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#fff',
                  padding: '12px 32px',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over overlay with stats */}
      {showGameOverOverlay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'rgba(40,40,45,0.95)',
              padding: '32px 48px',
              borderRadius: 16,
              border: '2px solid rgba(200,50,50,0.5)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              color: '#fff',
              textAlign: 'center',
              minWidth: 320,
            }}
          >
            <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 24, color: '#ff5555' }}>
              💀 GAME OVER 💀
            </div>
            <div style={{ fontSize: 14, textAlign: 'left', lineHeight: 1.8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>Time:</span>
                <span style={{ fontWeight: 600 }}>{(elapsedMs / 1000).toFixed(2)}s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>Lines Cleared:</span>
                <span style={{ fontWeight: 600 }}>{rows}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>Level:</span>
                <span style={{ fontWeight: 600 }}>{level + 1}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>Pieces Placed:</span>
                <span style={{ fontWeight: 600 }}>{piecesPlaced}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>PPS (Pieces/sec):</span>
                <span style={{ fontWeight: 600 }}>
                  {elapsedMs > 0 ? (piecesPlaced / (elapsedMs / 1000)).toFixed(2) : '0.00'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>Total Inputs:</span>
                <span style={{ fontWeight: 600 }}>{inputs}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>Holds Used:</span>
                <span style={{ fontWeight: 600 }}>{holds}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aaa' }}>Finesse (Inputs/Piece):</span>
                <span style={{ fontWeight: 600 }}>
                  {piecesPlaced > 0 ? (inputs / piecesPlaced).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => {
                  setGameOver(false);
                  setShowGameOverOverlay(false);
                  setCountdown(3); // Start countdown before game
                }}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  color: '#fff',
                  padding: '12px 32px',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginRight: 12,
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#fff',
                  padding: '12px 32px',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </StyledTetrisWrapper>
  );
};

export default Tetris;