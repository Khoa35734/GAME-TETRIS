// Import cac panel tu SidePanels
import { HoldPanel, NextPanel } from "./SidePanels";
import React, { useState, useRef, useEffect } from "react";
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
import Display from "./Display";
import StartButton from "./StartButton";

// --- CAI DAT DO NHAY PHIM ---
const DAS_DELAY: number = 120;
const MOVE_INTERVAL: number = 40;
// Tốc độ rơi: fall_speed = initial_speed * (speed_factor^(level))
const INITIAL_SPEED_MS = 1000; // tốc độ Level 1 (level state = 0)
const SPEED_FACTOR = 0.85;     // < 1 → càng về sau càng nhanh
const MIN_SPEED_MS = 60;       // tránh quá nhanh
const getFallSpeed = (lvl: number) => Math.max(MIN_SPEED_MS, Math.round(INITIAL_SPEED_MS * Math.pow(SPEED_FACTOR, lvl)));

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
  // Hold state
  const [hasHeld, setHasHeld] = useState(false);
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [startGameOverSequence, setStartGameOverSequence] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3); // 3-2-1


  // dong bo lock
  const [locking, setLocking] = useState(false);

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
    if (gameOver || startGameOverSequence || locking || countdown !== null) return;

    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
    }
  };

  const movePlayerToSide = (dir: number) => {
    if (gameOver || startGameOverSequence || locking || countdown !== null) return;

    let distance = 0;
    while (!checkCollision(player, stage, { x: dir * (distance + 1), y: 0 })) distance += 1;
    if (distance > 0) updatePlayerPos({ x: dir * distance, y: 0, collided: false });
  };

  const startGame = (): void => {
    setStage(createStage());
  setDropTime(getFallSpeed(0));
    setGameOver(false);
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
    clearHold(); // reset vùng hold về rỗng khi chơi lại
    setHasHeld(false);
    resetPlayer();
    wrapperRef.current?.focus();
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

      // Điều kiện game over mới: có merge trong vùng buffer
      if (isGameOverFromBuffer(stage)) {

        setGameOver(true);
        setDropTime(null);
        setTimerOn(false); // End game → ngừng bấm giờ
        return;
      }
      // tam dung gravity, doi stage merge roi reset
      setDropTime(null);

      // T-Spin detection: khi khối sắp được khoá
      const tspin = (player.type === 'T') && isTSpin(player as any, stage as any);
      if (tspin) {
        // Bạn có thể thay console.log bằng cập nhật điểm/hiệu ứng
        console.log('T-Spin!');
      }

      setLocking(true);
      updatePlayerPos({ x: 0, y: 0, collided: true });
    }
  };

  const hardDrop = (): void => {
    if (gameOver || startGameOverSequence || countdown !== null) return;

    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) dropDistance += 1;
    const finalY = player.pos.y + dropDistance;
    if (finalY <= 0) {
      setGameOver(true);
      setDropTime(null);
      setTimerOn(false); // End game → ngừng bấm giờ
      return;
    }
    setDropTime(null);
    setLocking(true);
    if (dropDistance > 0) updatePlayerPos({ x: 0, y: dropDistance, collided: true });
    else updatePlayerPos({ x: 0, y: 0, collided: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (gameOver || startGameOverSequence || countdown !== null) return;

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
      } else {
        if (player.pos.y <= 0) {
          setGameOver(true);
          setDropTime(null);
          setTimerOn(false); // End game → ngừng bấm giờ
          return;
        }
        setDropTime(null);
        setLocking(true);
        updatePlayerPos({ x: 0, y: 0, collided: true });
      }
    } else if (keyCode === 38) {
      if (!locking) playerRotate(stage, 1);
  } else if (keyCode === 32) {
      hardDrop();
  } else if (keyCode === 16) { // Shift -> Hold
      if (!hasHeld && canHold) {
        holdSwap();
        setHasHeld(true);
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (gameOver || startGameOverSequence || countdown !== null) return;
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) setMoveIntent(null);
  else if (keyCode === 40) setDropTime(getFallSpeed(level));
  };

  // ROI
  useInterval(() => {
    if (!gameOver && !startGameOverSequence && !locking) drop();
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
      resetPlayer();
      setMoveIntent(null);
      setLocking(false);
  setDropTime(getFallSpeed(level));
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
    }
  }, [startGameOverSequence, gameOver, updatePlayerPos]);

  // Game over whiteout animation: sweep from bottom to top over 1s
  useEffect(() => {
    if (!gameOver) return;
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
      if (p < 1) whiteoutRaf.current = requestAnimationFrame(animate);
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
    if (!win && rows >= 150) {
      setWin(true);
      setTimerOn(false);
      setDropTime(null);
    }
  }, [rows, win]);

  return (
    <StyledTetrisWrapper
      ref={wrapperRef}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
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
                <Stage stage={countdown !== null ? createStage() : stage} />

              </div>
            </StyledTetris>

      {/* HOLD (trai tren) */}
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
  <NextPanel queue={nextFour} style={{ background: "rgba(20,20,22,0.35)", padding: 8, borderRadius: 10 }} />
  <div style={{ background: "rgba(20,20,22,0.35)", padding: 8, borderRadius: 10, color: '#fff' }}>
    <div style={{ fontWeight: 700, marginBottom: 6 }}>STATUS</div>
    <div>Rows: {rows} / 150</div>
    <div>Level: {level}</div>
    <div>Time: {(elapsedMs/1000).toFixed(2)}s</div>
  </div>
  {win && (
    <div style={{ padding: 8, borderRadius: 10, background: 'rgba(0,200,0,0.55)', color: '#fff', textAlign: 'center', fontWeight: 800 }}>You Win!</div>
  )}
  {gameOver && (
    <div style={{ marginTop: 4 }}>
      <Display gameOver={gameOver} text="Game Over" />
    </div>
  )}
  <div style={{ marginTop: 4 }}>
    <StartButton callback={startGame} />
  </div>
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

    </StyledTetrisWrapper>
  );
};

export default Tetris;

