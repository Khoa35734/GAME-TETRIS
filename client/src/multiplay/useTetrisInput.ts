import { useState, useEffect, useRef, useCallback } from 'react';
import { checkCollision } from '../gamehelper';
import { tryRotate } from '../srsRotation';
import type { Stage as StageType } from '../gamehelper';

/**
 * ============================================
 * ⚙️ CÁC THAM SỐ CƠ BẢN
 * ============================================
 */
const DAS_DELAY = 120; // ms (Delayed Auto Shift)
const ARR: number = 40;        // ms (Auto Repeat Rate)
const HARD_DROP_SPAM_INTERVAL = 200; // ms giữa 2 hard drop liên tục
const ENABLE_180_ROTATION = true;

/**
 * ============================================
 * 🎮 useTetrisInput Hook
 * ============================================
 */
export function useTetrisInput({
  player,
  stage,
  isGrounded,
  locking,
  gameOver,
  countdown,
  matchResult,
  updatePlayerPos,
  setPlayer,
  holdSwap,
  canHold,
  startGroundTimers,
  onGroundAction,
  setLocking,
}: {
  player: any;
  stage: StageType;
  isGrounded: boolean;
  locking: boolean;
  gameOver: boolean;
  countdown: number | null;
  matchResult: any;
  updatePlayerPos: (pos: any) => void;
  setPlayer: (fn: any) => void;
  holdSwap: () => void;
  canHold: boolean;
  startGroundTimers: () => void;
  onGroundAction: () => void;
  setLocking: (v: boolean) => void;
}) {
  const [moveIntent, setMoveIntent] = useState<{ dir: number; start: number; das: boolean } | null>(null);
  const lastHardDrop = useRef(0);
  const [rotationState, setRotationState] = useState<0 | 1 | 2 | 3>(0);
  const [hasHeld, setHasHeld] = useState(false);

  const movePlayer = useCallback(
    (dir: number) => {
      if (gameOver || countdown !== null || matchResult) return false;
      if (!checkCollision(player, stage, { x: dir, y: 0 })) {
        updatePlayerPos({ x: dir, y: 0, collided: false });
        return true;
      }
      return false;
    },
    [player, stage, updatePlayerPos, gameOver, countdown, matchResult]
  );

  const movePlayerToSide = useCallback(
    (dir: number) => {
      if (gameOver || countdown !== null || matchResult) return;
      let dist = 0;
      while (!checkCollision(player, stage, { x: dir * (dist + 1), y: 0 })) dist++;
      if (dist > 0) updatePlayerPos({ x: dir * dist, y: 0, collided: false });
    },
    [player, stage, updatePlayerPos, gameOver, countdown, matchResult]
  );

  const hardDrop = useCallback(() => {
    if (gameOver || countdown !== null || matchResult) return;
    let dropDist = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDist + 1 })) dropDist++;
    updatePlayerPos({ x: 0, y: dropDist, collided: true });
    setLocking(true);
  }, [player, stage, updatePlayerPos, gameOver, countdown, matchResult, setLocking]);

  const playerRotateSRS = useCallback(
    (dir: 1 | -1 | 2) => {
      if (gameOver || countdown !== null || matchResult) return;
      if (player.type === 'O') return;
      const result = tryRotate({ ...player, rotationState }, stage, dir, rotationState);
      if (result.success) {
        setPlayer((prev: any) => ({
          ...prev,
          tetromino: result.newMatrix,
          pos: { x: result.newX, y: result.newY },
        }));
        setRotationState(result.newRotationState);
        if (checkCollision(player, stage, { x: 0, y: 1 })) onGroundAction();
      }
    },
    [player, stage, rotationState, setPlayer, gameOver, countdown, matchResult, onGroundAction]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (gameOver || countdown !== null || matchResult) return;
      if ([32, 37, 38, 39, 40, 16, 67, 65, 88, 90].includes(e.keyCode)) {
        e.preventDefault();
        e.stopPropagation();
      }

      const { keyCode } = e;

      // LEFT / RIGHT
      if (keyCode === 37 || keyCode === 39) {
        const dir = keyCode === 37 ? -1 : 1;
        if (!moveIntent || moveIntent.dir !== dir) {
          const moved = movePlayer(dir);
          setMoveIntent({ dir, start: Date.now(), das: false });
          if (moved && isGrounded) onGroundAction();
        }
      }

      // SOFT DROP
      else if (keyCode === 40) {
        if (!checkCollision(player, stage, { x: 0, y: 1 })) {
          updatePlayerPos({ x: 0, y: 1, collided: false });
        } else startGroundTimers();
      }

      // ROTATION
      else if (keyCode === 38 || keyCode === 88) playerRotateSRS(1); // CW
      else if (keyCode === 90 || keyCode === 17) playerRotateSRS(-1); // CCW
      else if (ENABLE_180_ROTATION && keyCode === 65) playerRotateSRS(2); // 180

      // HARD DROP
      else if (keyCode === 32) {
        const now = Date.now();
        if (!e.repeat || now - lastHardDrop.current >= HARD_DROP_SPAM_INTERVAL) {
          hardDrop();
          lastHardDrop.current = now;
        }
      }

      // HOLD
      else if (keyCode === 67 && !hasHeld && canHold) {
        holdSwap();
        setHasHeld(true);
        setRotationState(0);
      }
    },
    [
      moveIntent,
      movePlayer,
      isGrounded,
      player,
      stage,
      playerRotateSRS,
      updatePlayerPos,
      startGroundTimers,
      hardDrop,
      holdSwap,
      canHold,
      hasHeld,
      gameOver,
      countdown,
      matchResult,
      onGroundAction,
    ]
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (gameOver || countdown !== null || matchResult) return;
      const { keyCode } = e;
      if (keyCode === 37 || keyCode === 39) setMoveIntent(null);
    },
    [gameOver, countdown, matchResult]
  );

  // DAS / ARR Auto movement
  useEffect(() => {
    if (!moveIntent || locking || gameOver || countdown !== null || matchResult) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const { dir, start, das } = moveIntent;
      if (!das && now - start >= DAS_DELAY) {
        if (ARR === 0) movePlayerToSide(dir);
        setMoveIntent(prev => (prev ? { ...prev, das: true } : prev));
      } else if (das && ARR > 0) {
        const moved = movePlayer(dir);
        if (moved && isGrounded) onGroundAction();
      }
    }, ARR > 0 ? ARR : 16);
    return () => clearInterval(interval);
  }, [moveIntent, locking, gameOver, countdown, matchResult, movePlayer, movePlayerToSide, isGrounded, onGroundAction]);

  return { handleKeyDown, handleKeyUp };
}
