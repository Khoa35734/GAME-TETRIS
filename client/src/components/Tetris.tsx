import React, { useState, useCallback, useEffect } from "react";

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

  // Calculate drop speed based on level
  const calculateDropTime = useCallback((currentLevel: number): number => {
    return 1000 / (currentLevel + 1) + 200;
  }, []);

  const movePlayer = useCallback((dir: number) => {
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
    }
  }, [player, stage, updatePlayerPos]);

  const startGame = useCallback((): void => {
    // Reset everything
    setStage(createStage());
    setDropTime(1000);
    resetPlayer();
    setGameOver(false);
    setScore(0);
    setRows(0);
    setLevel(0);
  }, [resetPlayer, setLevel, setRows, setScore, setStage]);

  const drop = useCallback((): void => {
    // Increase level when player clears ten rows
    if (rows > (level + 1) * 10) {
      const newLevel = level + 1;
      setLevel(newLevel);
      setDropTime(1000 / (newLevel + 1) + 200);
    }

    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      // Game Over if collision at the top
      if (player.pos.y < 1) {
        setGameOver(true);
        setDropTime(null);
      }
      updatePlayerPos({ x: 0, y: 0, collided: true });
    }
  }, [level, player, setLevel, stage, updatePlayerPos, rows]);

  const softDrop = useCallback((): void => {
    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      if (player.pos.y < 1) {
        setGameOver(true);
        setDropTime(null);
      }
      updatePlayerPos({ x: 0, y: 0, collided: true });
    }
  }, [player, stage, updatePlayerPos]);

  const hardDrop = useCallback((): void => {
    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) {
      dropDistance += 1;
    }
    
    if (dropDistance > 0) {
      updatePlayerPos({ x: 0, y: dropDistance, collided: true });
    }
  }, [player, stage, updatePlayerPos]);

  const rotatePlayer = useCallback((): void => {
    // Skip rotation for O block
    const currentTetromino = player.tetromino;
    const isOBlock = currentTetromino.length === 2 && 
                     currentTetromino[0].length === 2 && 
                     currentTetromino.every(row => row.every(cell => cell === 'O' || cell === 0));
    
    if (!isOBlock) {
      playerRotate(stage, 1);
    }
  }, [player.tetromino, playerRotate, stage]);

  const keyUp = useCallback(({ keyCode }: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!gameOver && keyCode === 40) {
      setDropTime(1000 / (level + 1) + 200);
    }
  }, [gameOver, level]);

  const handleKeyDown = useCallback(({ keyCode }: React.KeyboardEvent<HTMLDivElement>): void => {
    if (gameOver) return;

    switch (keyCode) {
      case 37: // Left arrow
        movePlayer(-1);
        break;
      case 39: // Right arrow
        movePlayer(1);
        break;
      case 40: // Down arrow
        softDrop();
        break;
      case 38: // Up arrow
        rotatePlayer();
        break;
      case 32: // Space bar
        hardDrop();
        break;
      default:
        break;
    }
  }, [gameOver, movePlayer, softDrop, rotatePlayer, hardDrop]);

  // Auto-drop interval
  useInterval(() => {
    drop();
  }, dropTime);

  // Focus the game area on mount
  useEffect(() => {
    const gameArea = document.getElementById('tetris-game-area');
    if (gameArea) {
      gameArea.focus();
    }
  }, []);

  return (
    <StyledTetrisWrapper
      id="tetris-game-area"
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
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
