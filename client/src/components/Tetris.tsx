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

  // State để quản lý chuỗi hiệu ứng "đè khối" khi spawn lỗi
  const [startGameOverSequence, setStartGameOverSequence] = useState(false);


  const [player, updatePlayerPos, resetPlayer, playerRotate] = usePlayer();
  const [stage, setStage, rowsCleared] = useStage(player);
  const [score, setScore, rows, setRows, level, setLevel] = useGameStatus(rowsCleared);

  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    wrapperRef.current?.focus();
  }, []);

  const movePlayer = (dir: number) => {
    if (gameOver || startGameOverSequence) return;
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
    }
  };

  const startGame = (): void => {
    setStage(createStage());
    setDropTime(1000);
    setGameOver(false);
    setStartGameOverSequence(false);
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

      // Logic 1: Game over ngay lập tức do "chạm đỉnh"
      if (player.pos.y < 1) {

        setGameOver(true);
        setDropTime(null);
      }
      updatePlayerPos({ x: 0, y: 0, collided: true });
    }
  };

  const keyUp = ({ keyCode }: React.KeyboardEvent<HTMLDivElement>): void => {

    if (!gameOver && !startGameOverSequence && keyCode === 40) {

      setDropTime(1000 / (level + 1) + 200);
    }
  };

  const softDrop = (): void => {

    if (gameOver || startGameOverSequence) return;

    setDropTime(null);
    drop();
  };
  
  const hardDrop = (): void => {
    if (gameOver || startGameOverSequence) return;
    let dropDistance = 0;
    // Tìm vị trí thấp nhất mà khối có thể rơi tới
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) {
      dropDistance += 1;
    }

    updatePlayerPos({ x: 0, y: dropDistance, collided: true });
  };

  const move = (e: React.KeyboardEvent<HTMLDivElement>): void => {

    if (gameOver || startGameOverSequence) return;

    if ([32, 37, 38, 39, 40].includes(e.keyCode)) {
      e.preventDefault();
      e.stopPropagation();
    }

    const { keyCode } = e;
    if (keyCode === 37) movePlayer(-1);
    else if (keyCode === 39) movePlayer(1);
    else if (keyCode === 40) softDrop();
    else if (keyCode === 38) playerRotate(stage, 1);
    else if (keyCode === 32) hardDrop();
  };

  useInterval(() => {
    if (!gameOver && !startGameOverSequence) {
        drop();
    }
  }, dropTime);

  // useEffect 1: Điều phối việc tạo khối mới sau khi va chạm
useEffect(() => {
  // Chỉ tạo khối mới khi khối cũ đã va chạm VÀ game chưa kết thúc
  if (player.collided && !gameOver) {
    resetPlayer();
  }
}, [player.collided, gameOver, resetPlayer]);
  
  // useEffect 2: Kiểm tra spawn lỗi để bắt đầu hiệu ứng "đè khối"
  useEffect(() => {
    const isNewPlayer = !player.collided;
    if (isNewPlayer && checkCollision(player, stage, { x: 0, y: 0 })) {
        setDropTime(null);
        setStartGameOverSequence(true);

    }
  }, [player, stage]);

  // useEffect 3: Thực hiện hiệu ứng "đè khối" và kết thúc game
  useEffect(() => {
      if (startGameOverSequence && !gameOver) {
          updatePlayerPos({ x: 0, y: 0, collided: true });
          setGameOver(true);
      }
  }, [startGameOverSequence, gameOver, updatePlayerPos]);

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