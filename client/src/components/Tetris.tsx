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

// --- CÀI ĐẶT ĐỘ NHẠY PHÍM ---
// Kiểu Tetr.io: Đặt MOVE_INTERVAL = 0, chỉnh DAS_DELAY theo ý muốn (ví dụ: 120)
// Kiểu cổ điển: Đặt MOVE_INTERVAL > 0 (ví dụ: 40)
const DAS_DELAY: number = 120; // Độ trễ trước khi auto-repeat (ms)
const MOVE_INTERVAL: number = 40; // Tốc độ lặp lại di chuyển (ms). Đặt 0 để di chuyển tức thời!
const SOFT_DROP_SPEED: number = 30; // Tốc độ rơi nhanh khi giữ phím xuống (ms)

const Tetris: React.FC = () => {
  // Đảm bảo khối cũ được merge vào stage trước khi spawn khối mới
  const [waitForStageUpdate, setWaitForStageUpdate] = useState(false);
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [startGameOverSequence, setStartGameOverSequence] = useState(false);
  
  // State để lưu ý định di chuyển của người chơi, hỗ trợ DAS/ARR
  const [moveIntent, setMoveIntent] = useState<{ dir: number, startTime: number, dasCharged: boolean } | null>(null);

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
  
  // Hàm di chuyển tức thời sang cạnh (dành cho ARR = 0)
  const movePlayerToSide = (dir: number) => {
    if (gameOver || startGameOverSequence) return;
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
    resetPlayer();
    setTimeout(() => wrapperRef.current?.focus(), 0);
  };

  const drop = (): void => {
    if (rows > (level + 1) * 10) {
      setLevel(prev => prev + 1);
      setDropTime(1000 / (level + 1) + 200);
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
  
  const hardDrop = (): void => {
    if (gameOver || startGameOverSequence) return;
    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) {
      dropDistance += 1;
    }
    updatePlayerPos({ x: 0, y: dropDistance, collided: true });
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (gameOver || startGameOverSequence || e.repeat) return;
    if ([32, 37, 38, 39, 40].includes(e.keyCode)) {
      e.preventDefault();
      e.stopPropagation();
    }

    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) {
      const dir = keyCode === 37 ? -1 : 1;
      movePlayer(dir);
      setMoveIntent({ dir, startTime: Date.now(), dasCharged: false });
    } else if (keyCode === 40) {
      setDropTime(SOFT_DROP_SPEED);
    } else if (keyCode === 38) {
      playerRotate(stage, 1);
    } else if (keyCode === 32) {
      hardDrop();
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

  // Vòng lặp game cho việc RƠI
  useInterval(() => {
    if (!gameOver && !startGameOverSequence) {
        drop();
    }
  }, dropTime);

  // Vòng lặp game cho việc DI CHUYỂN NGANG (xử lý DAS)
  useInterval(() => {
    if (moveIntent) {
      const { dir, startTime, dasCharged } = moveIntent;
      const now = Date.now();

      if (now - startTime > DAS_DELAY && !dasCharged) {
        if (MOVE_INTERVAL === 0) {
          movePlayerToSide(dir);
        }
        setMoveIntent(prev => prev ? { ...prev, dasCharged: true } : null);
      }
    }
  }, MOVE_INTERVAL > 0 ? MOVE_INTERVAL : 16);

  // Vòng lặp game cho việc DI CHUYỂN NGANG (xử lý ARR > 0)
  useInterval(() => {
      if(moveIntent && moveIntent.dasCharged && MOVE_INTERVAL > 0) {
          movePlayer(moveIntent.dir);
      }
  }, MOVE_INTERVAL > 0 ? MOVE_INTERVAL : null);

  // useEffect điều phối việc tạo khối mới
  useEffect(() => {
    if (player.collided && !gameOver && !waitForStageUpdate) {
      setWaitForStageUpdate(true);
    }
  }, [player.collided, gameOver, waitForStageUpdate]);

  useEffect(() => {
    if (waitForStageUpdate) {
      resetPlayer();
      setMoveIntent(null);
      setWaitForStageUpdate(false);
    }
  }, [stage, waitForStageUpdate, resetPlayer]);
  
  // useEffect kiểm tra spawn lỗi
  useEffect(() => {
    const isNewPlayer = !player.collided;
    if (isNewPlayer && checkCollision(player, stage, { x: 0, y: 0 })) {
        setDropTime(null);
        setStartGameOverSequence(true);
    }
  }, [player, stage]);

  // useEffect thực hiện hiệu ứng "đè khối"
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