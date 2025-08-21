import React, { useState } from "react";

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

  const movePlayer = (dir: number) => {
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
    }
  };

  const startGame = (): void => {
    // Reset everything
    setStage(createStage());
    setDropTime(1000);
    resetPlayer();
    setGameOver(false);
    setScore(0);
    setRows(0);
    setLevel(0);
  };

  const drop = (): void => {
    // Increase level when player clears ten rows
    if (rows > (level + 1) * 10) {
      setLevel((prev) => prev + 1);
      // Also increase speed
      setDropTime(1000 / (level + 1) + 200);
    }

    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      // Khi va chạm, ngừng di chuyển và đánh dấu collided
      if (player.pos.y < 1) {
        // Game Over
        setGameOver(true);
        setDropTime(null);
      }
      updatePlayerPos({ x: 0, y: 0, collided: true });
    }
  };

  // Hàm soft drop - tăng tốc độ rơi khi nhấn phím xuống
  const softDrop = (): void => {
    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      // Khi chạm đáy hoặc khối khác, drop ngay lập tức
      if (player.pos.y < 1) {
        setGameOver(true);
        setDropTime(null);
      }
      updatePlayerPos({ x: 0, y: 0, collided: true });
    }
  };

  // Hàm hard drop - thả khối xuống ngay lập tức
  const hardDrop = (): void => {
    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) {
      dropDistance += 1;
    }
    if (dropDistance > 0) {
      updatePlayerPos({ x: 0, y: dropDistance, collided: false });
      setPendingCollide(true);
    }
  };
  // Effect để set collided sau khi hard drop
  React.useEffect(() => {
    if (pendingCollide) {
      // Nếu đã ở đáy, set collided cho player
      updatePlayerPos({ x: 0, y: 0, collided: true });
      setPendingCollide(false);
    }
  }, [pendingCollide, updatePlayerPos]);

  const keyUp = ({ keyCode }: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!gameOver) {
      if (keyCode === 40) { // Down arrow key
        setDropTime(1000 / (level + 1) + 200);
      }
    }
  };

  const dropPlayer = (): void => {
    // Sử dụng soft drop thay vì drop thông thường để xử lý va chạm tốt hơn
    softDrop();
  };

  const move = ({ keyCode }: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!gameOver) {
      if (keyCode === 37) { // Left arrow key - Di chuyển trái
        movePlayer(-1);
      } else if (keyCode === 39) { // Right arrow key - Di chuyển phải
        movePlayer(1);
      } else if (keyCode === 40) { // Down arrow key - Tăng tốc độ rơi
        dropPlayer();
      } else if (keyCode === 38) { // Up arrow key - Xoay khối (trừ khối O)
        // Kiểm tra nếu không phải khối O thì mới cho xoay
        const currentTetromino = player.tetromino;
        const isOBlock = currentTetromino.length === 2 && currentTetromino[0].length === 2 && 
                        currentTetromino.every(row => row.every(cell => cell === 'O' || cell === 0));
        
        if (!isOBlock) {
          playerRotate(stage, 1);
        }
      } else if (keyCode === 32) { // Space bar - Hard drop
        hardDrop();
      }
    }
  };

  useInterval(() => {
    drop();
  }, dropTime);

  return (
    <StyledTetrisWrapper
      role="button"
      tabIndex={0}
      onKeyDown={move}
      onKeyUp={keyUp}
    >
      <StyledTetris>
        {/* The 'as StageType' assertion is no longer needed as 'stage' is correctly typed by the useStage hook */}
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