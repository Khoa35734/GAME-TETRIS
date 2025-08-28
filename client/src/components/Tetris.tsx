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

const Tetris: React.FC = () => {
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const [player, updatePlayerPos, resetPlayer, playerRotate] = usePlayer();
  const [stage, setStage, rowsCleared] = useStage(player, resetPlayer);
  const [score, setScore, rows, setRows, level, setLevel] = useGameStatus(rowsCleared);

  // Ref để giữ focus ở khu vực chơi
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
    setGameOver(false);
    setScore(0);
    setRows(0);
    setLevel(0);
    resetPlayer();
    setTimeout(() => wrapperRef.current?.focus(), 0);
  };
  
  const drop = (): void => {
    // Tăng level khi đủ hàng
    if (rows > (level + 1) * 10) {
      setLevel(prev => prev + 1);
      // Tăng tốc độ rơi
      setDropTime(1000 / (level + 1) + 200);
    }

    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      // Nếu va chạm, khóa khối lại
      if (player.pos.y < 1) {
        // Nếu va chạm xảy ra ở trên cùng (y < 1), game over
        setGameOver(true);
        setDropTime(null);
      }
      updatePlayerPos({ x: 0, y: 0, collided: true });
    }
  };

  const keyUp = ({ keyCode }: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!gameOver && keyCode === 40) { // Phím mũi tên xuống
      // Khôi phục tốc độ rơi bình thường khi nhả phím
      setDropTime(1000 / (level + 1) + 200);
    }
  };

  const softDrop = (): void => {
    // Tạm dừng auto drop để soft drop mượt hơn
    setDropTime(null);
    drop();
  };
  
  const hardDrop = (): void => {
    let dropDistance = 0;
    // Tìm vị trí thấp nhất mà khối có thể rơi tới
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) {
      dropDistance += 1;
    }
    
    // Kiểm tra nếu hard drop sẽ gây game over (khối vượt quá đỉnh)
    if (player.pos.y + dropDistance < 1) {
      setGameOver(true);
      setDropTime(null);
    }
    
    // Cập nhật vị trí và khóa khối ngay lập tức
    updatePlayerPos({ x: 0, y: dropDistance, collided: true });
  };

  const move = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (gameOver) return;
    
    // Chặn hành vi mặc định của các phím điều khiển
    if ([32, 37, 38, 39, 40].includes(e.keyCode)) {
      e.preventDefault();
      e.stopPropagation();
    }

    const { keyCode } = e;
    if (keyCode === 37) { // Trái
      movePlayer(-1);
    } else if (keyCode === 39) { // Phải
      movePlayer(1);
    } else if (keyCode === 40) { // Xuống (soft drop)
      softDrop();
    } else if (keyCode === 38) { // Lên (xoay)
      playerRotate(stage, 1);
    } else if (keyCode === 32) { // Space (hard drop)
      hardDrop();
    }
  };

  useInterval(() => {
    drop();
  }, dropTime);

  // Kiểm tra game over khi một khối mới được tạo
  useEffect(() => {
    if (player.collided && !gameOver) {
      // Kiểm tra xem khối mới có bị va chạm ngay tại vị trí xuất hiện không
      const newPlayer = { ...player, pos: { ...player.pos } };
      if (checkCollision(newPlayer, stage, { x: 0, y: 0 })) {
        setGameOver(true);
        setDropTime(null);
      }
    }
  }, [player, stage, gameOver]);

  return (
    <StyledTetrisWrapper
      ref={wrapperRef}
      role="button"
      tabIndex={0}
      onKeyDown={move}
      onKeyUp={keyUp} // Thêm onKeyUp để xử lý việc nhả phím soft drop
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