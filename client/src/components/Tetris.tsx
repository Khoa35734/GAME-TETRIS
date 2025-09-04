import React, { useState, useRef, useEffect } from "react";
import { createStage, checkCollision } from "../gamehelper";
import HoldDisplay from "./HoldDisplay";
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
  // Hold state
  const [holdTetromino, setHoldTetromino] = useState<any>(null); // ô Hold rỗng khi bắt đầu
  const [hasHeld, setHasHeld] = useState(false);
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
  setHoldTetromino(null); // reset hold khi bắt đầu game
  setHasHeld(false);
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
      // Khi khối không thể rơi thêm và bị lock
      if (player.pos.y <= 0) {
        // Khối chạm trần -> Game Over ngay lập tức
        setGameOver(true);
        setDropTime(null);
        return;
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
    // Hard drop: cập nhật vị trí và lock khối
    const finalY = player.pos.y + dropDistance;
    if (finalY <= 0) {
      // Khối sau hard drop chạm trần -> Game Over
      setGameOver(true);
      setDropTime(null);
      return;
    }
    
    if (dropDistance > 0) {
      updatePlayerPos({ x: 0, y: dropDistance, collided: true });
    } else {
      // Nếu không thể drop thêm, chỉ lock tại chỗ
      updatePlayerPos({ x: 0, y: 0, collided: true });
    }
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
      setDropTime(SOFT_DROP_SPEED);
    } else if (keyCode === 38) {
      playerRotate(stage, 1);
    } else if (keyCode === 32) {
      hardDrop();
    } else if (keyCode === 16) { // Phím Shift để Hold
      if (!hasHeld) {
        if (!holdTetromino) {
          // Lần đầu hold: lưu khối hiện tại, spawn khối mới
          setHoldTetromino(player.tetromino);
          resetPlayer();
        } else {
          // Swap khối hiện tại với khối hold, orientation về ban đầu
          setHoldTetromino(player.tetromino);
          updatePlayerPos({ x: 0, y: 0, collided: false });
          setTimeout(() => {
            resetPlayer();
            updatePlayerPos({ x: 0, y: 0, collided: false });
          }, 0);
        }
        setHasHeld(true);
      }
    }
    

    else if (keyCode === 67) { // C
  holdSwap();
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
    if (player.collided && !gameOver) {
      // Kiểm tra chạm trần ngay khi va chạm
      if (player.pos.y <= 0) {
        setGameOver(true);
        setDropTime(null);
        return;
      }
      
      // Cho phép hold lại ở khối tiếp theo
      setHasHeld(false);

      // Dùng setTimeout(..., 0) để đẩy việc reset player sang chu trình sự kiện (event loop) tiếp theo.
      // Mẹo này đảm bảo React có đủ thời gian để cập nhật state `stage` trước khi khối mới được tạo ra.
      const timer = setTimeout(() => {
        resetPlayer();
        setMoveIntent(null);
      }, 0);

      // Cleanup function để tránh lỗi khi component bị unmount
      return () => clearTimeout(timer);
    }
  }, [player.collided, gameOver]); // Chỉ phụ thuộc vào player.collided và gameOver

  // useEffect(() => {
  //   if (waitForStageUpdate) {
  //     resetPlayer();
  //     setMoveIntent(null);
  //     setWaitForStageUpdate(false);
  //   }
  // }, [stage, waitForStageUpdate, resetPlayer]);
  
  // useEffect kiểm tra spawn lỗi
  useEffect(() => {
  // Chỉ kiểm tra game over khi khối mới được spawn (sau khi reset)
  // Không kiểm tra khi đang hard drop hoặc di chuyển khối hiện tại
  const isSpawningNewPlayer = player.pos.x === 5 && player.pos.y === 0 && !player.collided;
  if (isSpawningNewPlayer && checkCollision(player, stage, { x: 0, y: 0 })) {
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
      {/* LEFT: HOLD */}
      <div style={{ display: "grid", gap: 16 }}>
        <HoldPanel hold={hold} />
      </div>

      {/* CENTER: BOARD giữ nguyên StyledTetris + Stage */}
      <StyledTetris>
        <HoldDisplay tetromino={holdTetromino} />
        <Stage stage={stage} />
      </StyledTetris>

      {/* RIGHT: NEXT + STATS + START */}
      <div style={{ display: "grid", gap: 16 }}>
        <NextPanel queue={nextFour as any} />
        {gameOver ? (
          <Display gameOver={gameOver} text="Game Over" />
        ) : (
          <ScorePanel score={score} rows={rows} level={level} />
        )}
        <StartButton callback={startGame} />
      </div>
    </div>
  </StyledTetrisWrapper>
);

};

export default Tetris;