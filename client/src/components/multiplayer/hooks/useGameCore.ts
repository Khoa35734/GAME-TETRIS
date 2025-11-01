import { useState } from 'react';
import { usePlayer } from '../../../hooks/usePlayer';
import { useStage } from '../../../hooks/useStage';
import { useGameStatus } from '../../../hooks/useGameStatus';
import type { GameCoreState, GameCoreSetters } from '../game/types';

/**
 * Quản lý state cốt lõi của game: player, stage, game status, và các state liên quan.
 */
export const useGameCore = (): [GameCoreState, GameCoreSetters, any, any, any] => {
  // Core game hooks
  const [player, updatePlayerPos, resetPlayer, , hold, canHold, nextFour, holdSwap, clearHold, setQueueSeed, pushQueue, setPlayer] = usePlayer();
  const [stage, setStage, rowsCleared, , lastPlacement] = useStage(player);
  const [, , rows, setRows, level, setLevel] = useGameStatus();

  // Game state
  const [gameOver, setGameOver] = useState(false);
  const [locking, setLocking] = useState(false);
  const [hasHeld, setHasHeld] = useState(false);
  const [rotationState, setRotationState] = useState<0 | 1 | 2 | 3>(0);
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [b2b, setB2b] = useState(0);
  const [isApplyingGarbage, setIsApplyingGarbage] = useState(false);

  const state: GameCoreState = {
    player,
    stage,
    rows,
    level,
    gameOver,
    locking,
    hasHeld,
    rotationState,
    dropTime,
    combo,
    b2b,
    lastPlacement,
    rowsCleared,
    isApplyingGarbage,
  };

  const setters: GameCoreSetters = {
    updatePlayerPos,
    resetPlayer,
    holdSwap,
    clearHold,
    setQueueSeed,
    pushQueue,
    setPlayer,
    setStage,
    setRows,
    setLevel,
    setGameOver,
    setLocking,
    setHasHeld,
    setRotationState,
    setDropTime,
    setCombo,
    setB2b,
    setIsApplyingGarbage,
  };

  return [state, setters, hold, canHold, nextFour];
};
