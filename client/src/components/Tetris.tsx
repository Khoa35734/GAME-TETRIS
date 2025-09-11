// Import cac panel tu SidePanels
import { HoldPanel, NextPanel, ScorePanel } from "./SidePanels";
import React, { useState, useRef, useEffect } from "react";
import { createStage, checkCollision } from "../gamehelper";
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

  // dong bo lock
  const [locking, setLocking] = useState(false);

  // DAS/ARR
  const [moveIntent, setMoveIntent] = useState<{ dir: number; startTime: number; dasCharged: boolean } | null>(null);

  // hooks game
  const [player, updatePlayerPos, resetPlayer, playerRotate, hold, nextFour, holdSwap] = usePlayer();
  const [stage, setStage, rowsCleared] = useStage(player);
  const [score, setScore, rows, setRows, level, setLevel] = useGameStatus(rowsCleared);
  // Whiteout sweep for game over
  // progress not exposed to UI; animation drives stage directly
  const whiteoutRaf = useRef<number | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    wrapperRef.current?.focus();
  }, []);

  const movePlayer = (dir: number) => {
    if (gameOver || startGameOverSequence || locking) return;
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
    }
  };

  const movePlayerToSide = (dir: number) => {
    if (gameOver || startGameOverSequence || locking) return;
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
    setScore(0);
    setRows(0);
    setLevel(0);
    setHasHeld(false);
    resetPlayer();
    wrapperRef.current?.focus();
  };

  const drop = (): void => {
    if (rows > (level + 1) * 10) {
      const newLevel = level + 1;
      setLevel((prev) => prev + 1);
      setDropTime(getFallSpeed(newLevel));
    }
    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      if (player.pos.y <= 0) {
        setGameOver(true);
        setDropTime(null);
        return;
      }
      // tam dung gravity, doi stage merge roi reset
      setDropTime(null);
      setLocking(true);
      updatePlayerPos({ x: 0, y: 0, collided: true });
    }
  };

  const hardDrop = (): void => {
    if (gameOver || startGameOverSequence) return;
    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) dropDistance += 1;
    const finalY = player.pos.y + dropDistance;
    if (finalY <= 0) {
      setGameOver(true);
      setDropTime(null);
      return;
    }
    setDropTime(null);
    setLocking(true);
    if (dropDistance > 0) updatePlayerPos({ x: 0, y: dropDistance, collided: true });
    else updatePlayerPos({ x: 0, y: 0, collided: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (gameOver || startGameOverSequence) return;
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
      if (!hasHeld) {
        holdSwap();
        setHasHeld(true);
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (gameOver || startGameOverSequence) return;
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
                <Stage stage={stage} />
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
  <ScorePanel score={score} rows={rows} level={level} style={{ background: "rgba(20,20,22,0.35)", padding: 8, borderRadius: 10 }} />
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
    </StyledTetrisWrapper>
  );
};

export default Tetris;
