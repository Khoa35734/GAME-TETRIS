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
// Kieu Tetr.io: Dat MOVE_INTERVAL = 0, chinh DAS_DELAY theo y muon (vi du: 120)
// Kieu co dien: Dat MOVE_INTERVAL > 0 (vi du: 40)
const DAS_DELAY: number = 120; // Do tre truoc khi auto-repeat (ms)
const MOVE_INTERVAL: number = 40; // Toc do lap lai di chuyen (ms). Dat 0 de di chuyen tuc thoi!
const SOFT_DROP_SPEED: number = 30; // Toc do roi nhanh khi giu phim xuong (ms)

const Tetris: React.FC = () => {
  // Hold state
  const [holdTetromino, setHoldTetromino] = useState<any>(null); // o Hold rong khi bat dau
  const [hasHeld, setHasHeld] = useState(false);
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [startGameOverSequence, setStartGameOverSequence] = useState(false);

  // them state dong bo lock
  const [locking, setLocking] = useState(false);

  // State de luu y dinh di chuyen cua nguoi choi, ho tro DAS/ARR
  const [moveIntent, setMoveIntent] = useState<{ dir: number; startTime: number; dasCharged: boolean } | null>(null);

  // usePlayer tra ve cac bien can thiet cho HoldPanel va NextPanel
  const [player, updatePlayerPos, resetPlayer, playerRotate, hold, nextFour, holdSwap] = usePlayer();
  const [stage, setStage, rowsCleared] = useStage(player);
  const [score, setScore, rows, setRows, level, setLevel] = useGameStatus(rowsCleared);

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

  // Ham di chuyen tuc thoi sang canh (danh cho ARR = 0)
  const movePlayerToSide = (dir: number) => {
    if (gameOver || startGameOverSequence || locking) return;
    let distance = 0;
    while (!checkCollision(player, stage, { x: dir * (distance + 1), y: 0 })) {
      distance += 1;
    }
    if (distance > 0) {
      updatePlayerPos({ x: dir * distance, y: 0, collided: false });
    }
  };

  const startGame = (): void => {
    setStage(createStage());
    setDropTime(1000);
    setGameOver(false);
    setStartGameOverSequence(false);
    setMoveIntent(null);
    setScore(0);
    setRows(0);
    setLevel(0);
    setHoldTetromino(null); // reset hold khi bat dau game
    setHasHeld(false);
    resetPlayer();
    // BO force drop frame 0 de tranh lech frame
    wrapperRef.current?.focus();
  };

  const drop = (): void => {
    if (rows > (level + 1) * 10) {
      setLevel((prev) => prev + 1);
      setDropTime(1000 / (level + 1) + 200);
    }
    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      if (player.pos.y <= 0) {
        setGameOver(true);
        setDropTime(null);
        return;
      }
      // Lock: tam dung gravity, doi stage merge xong roi reset
      setDropTime(null);
      setLocking(true);
      updatePlayerPos({ x: 0, y: 0, collided: true });
    }
  };

  const hardDrop = (): void => {
    if (gameOver || startGameOverSequence) return;
    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) {
      dropDistance += 1;
    }
    const finalY = player.pos.y + dropDistance;
    if (finalY <= 0) {
      setGameOver(true);
      setDropTime(null);
      return;
    }
    // Lock va tam dung gravity (khong reset ngay tai day)
    setDropTime(null);
    setLocking(true);
    if (dropDistance > 0) {
      updatePlayerPos({ x: 0, y: dropDistance, collided: true });
    } else {
      updatePlayerPos({ x: 0, y: 0, collided: true });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (gameOver || startGameOverSequence) return;
    if ([32, 37, 38, 39, 40, 16, 67].includes(e.keyCode)) {
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
      // Soft drop
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
    } else if (keyCode === 67) {
      // C - Hold
      if (!hasHeld) {
        holdSwap();
        setHasHeld(true);
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (gameOver || startGameOverSequence) return;
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) {
      setMoveIntent(null);
    } else if (keyCode === 40) {
      setDropTime(1000 / (level + 1) + 200);
    }
  };

  // Vong lap game cho viec ROI
  useInterval(
    () => {
      if (!gameOver && !startGameOverSequence && !locking) {
        drop();
      }
    },
    dropTime
  );

  // Vong lap game cho viec DI CHUYEN NGANG (xu ly DAS)
  useInterval(() => {
    if (moveIntent && !locking) {
      const { dir, startTime, dasCharged } = moveIntent;
      const now = Date.now();

      if (now - startTime > DAS_DELAY && !dasCharged) {
        if (MOVE_INTERVAL === 0) {
          movePlayerToSide(dir);
        }
        setMoveIntent((prev) => (prev ? { ...prev, dasCharged: true } : null));
      }
    }
  }, MOVE_INTERVAL > 0 ? MOVE_INTERVAL : 16);

  // Vong lap game cho viec DI CHUYEN NGANG (xu ly ARR > 0)
  useInterval(() => {
    if (moveIntent && moveIntent.dasCharged && MOVE_INTERVAL > 0 && !locking) {
      movePlayer(moveIntent.dir);
    }
  }, MOVE_INTERVAL > 0 ? MOVE_INTERVAL : null);

  // Cho phep hold lai o khoi tiep theo sau khi lock
  useEffect(() => {
    if (player.collided && !gameOver) {
      setHasHeld(false);
    }
  }, [player.collided, gameOver]);

  // Reset player CHI sau khi stage cap nhat xong va dang locking
  useEffect(() => {
    if (locking && player.collided && !gameOver) {
      // luc nay stage da merge khoi vua lock
      resetPlayer(); // giu nguyen logic game over/sinh khoi cua ban
      setMoveIntent(null);
      setLocking(false);
      setDropTime(1000 / (level + 1) + 200); // khoi phuc gravity
    }
  }, [stage, locking, player.collided, gameOver, level, resetPlayer]);

  // Kiem tra spawn loi (giu nguyen logic hien co cua ban)
  useEffect(() => {
    const isSpawningNewPlayer = player.pos.x === 5 && player.pos.y === 0 && !player.collided;
    if (isSpawningNewPlayer && checkCollision(player, stage, { x: 0, y: 0 })) {
      setDropTime(null);
      setStartGameOverSequence(true);
    }
  }, [player, stage]);

  // Hieu ung "de khoi" -> game over
  useEffect(() => {
    if (startGameOverSequence && !gameOver) {
      updatePlayerPos({ x: 0, y: 0, collided: true });
      setGameOver(true);
    }
  }, [startGameOverSequence, gameOver, updatePlayerPos]);

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
          alignItems: "center",
          width: "100vw",
          height: "100vh",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr 260px",
            gap: 48,
            alignItems: "center",
            background: "rgba(255,255,255,0.0)",
          }}
        >
          {/* LEFT: HOLD */}
          <div style={{ display: "grid", gap: 24, alignItems: "center" }}>
            <HoldPanel hold={hold} />
            {!hold && (
              <button
                style={{
                  marginTop: 8,
                  padding: "6px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#222",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
                onClick={() => {
                  if (!hasHeld) {
                    holdSwap();
                    setHasHeld(true);
                  }
                }}
              >
                Hold
              </button>
            )}
          </div>

          {/* CENTER: BOARD giu nguyen StyledTetris + Stage */}
          <StyledTetris style={{ display: "flex", justifyContent: "center", alignItems: "center", minWidth: 400, minHeight: 720 }}>
            <Stage stage={stage} />
          </StyledTetris>

          {/* RIGHT: NEXT + STATS + START */}
          <div style={{ display: "grid", gap: 24, justifyItems: "end" }}>
            <NextPanel queue={nextFour} />
            {gameOver ? <Display gameOver={gameOver} text="Game Over" /> : <ScorePanel score={score} rows={rows} level={level} />}
            <StartButton callback={startGame} />
          </div>
        </div>
      </div>
    </StyledTetrisWrapper>
  );
};

export default Tetris;
