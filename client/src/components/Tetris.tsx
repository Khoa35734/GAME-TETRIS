import React, { useState, useRef, useEffect } from "react";
import { createStage, checkCollision } from "../gamehelper";

// Styled Components
import { StyledTetris } from "./styles/StyledTetris";
import { StyledTetrisWrapper } from "./styles/StyledTetris";

// Custom Hooks
import { useInterval } from "../hooks/useInterval";
import { usePlayer } from "../hooks/usePlayer";
import { useStage } from "../hooks/useStage";
import { useGameStatus } from "../hooks/useGameStatus";

// Components
import Stage from "./Stage";
import Display from "./Display";
import StartButton from "./StartButton";

const Tetris: React.FC = () => {
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [pendingCollide, setPendingCollide] = useState(false);

  const [player, updatePlayerPos, resetPlayer, playerRotate] = usePlayer();
  const [stage, setStage, rowsCleared] = useStage(player, resetPlayer);
  const [score, setScore, rows, setRows, level, setLevel] = useGameStatus(rowsCleared);

  // 👉 thêm ref để giữ focus ở khu vực chơi
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    wrapperRef.current?.focus();
  }, []);

  const movePlayer = (dir: number) => {
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
    }
  };

  const startGame = (): void => {
    setStage(createStage());
    setDropTime(1000);
    resetPlayer();
    setGameOver(false);
    setScore(0);
    setRows(0);
    setLevel(0);

    // 👉 sau khi bấm Start, focus lại wrapper
    setTimeout(() => wrapperRef.current?.focus(), 0);
  };

  const drop = (): void => {
    if (rows >= (level + 1) * 10) {
      setLevel(prev => {
        const next = prev + 1;
        setDropTime(1000 / next + 200);
        return next;
      });
    }

    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      if (player.pos.y < 1) {
        setGameOver(true);
        setDropTime(null);
      }
      updatePlayerPos({ x: 0, y: 0, collided: true });
    }
  };

  const softDrop = (): void => {
    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      if (player.pos.y < 1) {
        setGameOver(true);
        setDropTime(null);
      }
      updatePlayerPos({ x: 0, y: 0, collided: true });
    }
  };

  const hardDrop = (): void => {
    // 👉 tạm dừng tick để tránh “race” khi nhấn Space đúng lúc interval chạy
    const prev = dropTime;
    setDropTime(null);

    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) {
      dropDistance += 1;
    }
    updatePlayerPos({ x: 0, y: dropDistance, collided: false });
    setPendingCollide(true);

    // khôi phục timer sau khi lock (ở effect phía dưới)
  };

  // Sau hard drop: lock khối rồi khôi phục tốc độ rơi
  useEffect(() => {
    if (pendingCollide) {
      updatePlayerPos({ x: 0, y: 0, collided: true });
      setPendingCollide(false);
      setDropTime(1000 / (level + 1) + 200);
    }
  }, [pendingCollide, updatePlayerPos, level]);

  const keyUp = ({ keyCode }: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!gameOver && keyCode === 40) {
      setDropTime(1000 / (level + 1) + 200);
    }
  };

  const dropPlayer = (): void => {
    softDrop();
  };

  const move = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (gameOver) return;

    // 👉 CHẶN hành vi mặc định để Space/Arrow không “click” nút Start / cuộn trang
    if ([32, 37, 38, 39, 40].includes(e.keyCode)) {
      e.preventDefault();
      e.stopPropagation();
    }

    const { keyCode } = e;
    if (keyCode === 37) {
      movePlayer(-1);
    } else if (keyCode === 39) {
      movePlayer(1);
    } else if (keyCode === 40) {
      dropPlayer(); // hoặc setDropTime(30) nếu muốn mượt hơn
    } else if (keyCode === 38) {
      const currentTetromino = player.tetromino;
      const isOBlock =
        currentTetromino.length === 2 &&
        currentTetromino[0].length === 2 &&
        currentTetromino.every(row => row.every(cell => cell === "O" || cell === 0));

      if (!isOBlock) {
        playerRotate(stage, 1);
      }
    } else if (keyCode === 32) {
      hardDrop(); // 👉 Space = hard drop
    }
  };

  useInterval(() => {
    drop();
  }, dropTime);

  return (
    <StyledTetrisWrapper
      ref={wrapperRef}   // 👉 gắn ref để focus
      role="button"
      tabIndex={0}
      onKeyDown={move}
      onKeyUp={keyUp}
    >
      <StyledTetris>
        <Stage stage={stage} />
        <aside>
          {gameOver ? (
            <Display gameOver={gameOver} text="Game Over" />
          ) : (
            <div>
              <Display text={`Score: ${score}`} />
              <Display text={`Rows: ${rows}`} />
              <Display text={`Level: ${level}`} />
            </div>
          )}
          <StartButton callback={startGame} />
        </aside>
      </StyledTetris>
    </StyledTetrisWrapper>
  );
};

export default Tetris;
