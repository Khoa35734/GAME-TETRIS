import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useInterval } from '../../../hooks/useInterval';
import { checkCollision, getTSpinType, isGameOverFromBuffer } from '../../../game/gamehelper';
import { tryRotate } from '../../../game/srsRotation';
import socket from '../../../socket';
import * as C from '../game/constants';
import * as U from '../game/utils';
import type { GameCoreState, GameCoreSetters } from '../game/types';

type MechanicsProps = {
  core: GameCoreState;
  setters: GameCoreSetters;
  sendInput: (action: string, data?: any) => void;
  sendGarbage: (lines: number) => void;
  sendTopout: (reason?: string) => void;
  cancelGarbage: (amount: number) => number;
  triggerGarbageApply: () => Promise<any>;
  resetAFKTimer: () => void;
  roomId: string | null;
  countdown: number | null;
  matchResult: any;
  onOpponentGarbageSent: (lines: number) => void;
};

/**
 * Quản lý cơ chế vật lý của game: Di chuyển, Xoay, Khóa, Rơi.
 */
export const useMechanics = ({
  core,
  setters,
  sendInput,
  sendGarbage,
  sendTopout,
  cancelGarbage,
  triggerGarbageApply,
  resetAFKTimer,
  roomId,
  countdown,
  matchResult,
  onOpponentGarbageSent,
}: MechanicsProps) => {
  const { player, stage, gameOver, locking, hasHeld, level, combo, b2b, lastPlacement, rowsCleared, isApplyingGarbage, dropTime, rotationState } = core;
  const { updatePlayerPos, setPlayer, setRotationState, setDropTime, setLocking, setGameOver, setHasHeld, setCombo, setB2b, resetPlayer, setLevel, setRows, holdSwap } = setters;

  // === 1. Lock Delay ===
  const [isGrounded, setIsGrounded] = useState(false);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const capTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const capExpiredRef = useRef<boolean>(false);
  const groundedSinceRef = useRef<number | null>(null);
  const lastGroundActionRef = useRef<number | null>(null);
  const pendingLockRef = useRef(false);

  const clearInactivity = useCallback(() => {
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    inactivityTimeoutRef.current = null;
  }, []);
  const clearCap = useCallback(() => {
    if (capTimeoutRef.current) clearTimeout(capTimeoutRef.current);
    capTimeoutRef.current = null;
  }, []);

  const doLock = useCallback(() => {
    if (isApplyingGarbage) {
      clearInactivity(); clearCap();
      groundedSinceRef.current = null; lastGroundActionRef.current = null;
      capExpiredRef.current = false; setIsGrounded(false);
      return;
    }
    clearInactivity(); clearCap();
    groundedSinceRef.current = null; lastGroundActionRef.current = null;
    capExpiredRef.current = false; setIsGrounded(false);
    setLocking(true);
  }, [clearInactivity, clearCap, isApplyingGarbage, setLocking]);

  const startGroundTimers = useCallback(() => {
    if (isApplyingGarbage) { clearInactivity(); clearCap(); return; }
    if (capExpiredRef.current) { doLock(); return; }
    clearInactivity();
    inactivityTimeoutRef.current = setTimeout(doLock, C.INACTIVITY_LOCK_MS);
    if (!groundedSinceRef.current) {
      groundedSinceRef.current = Date.now();
      capTimeoutRef.current = setTimeout(() => {
        capExpiredRef.current = true;
        doLock();
      }, C.HARD_CAP_MS);
    }
  }, [doLock, clearInactivity, clearCap, isApplyingGarbage]);

  const onGroundAction = useCallback(() => {
    if (isApplyingGarbage) { clearInactivity(); clearCap(); return; }
    lastGroundActionRef.current = Date.now();
    clearInactivity();
    if (capExpiredRef.current) { doLock(); return; }
    inactivityTimeoutRef.current = setTimeout(doLock, C.INACTIVITY_LOCK_MS);
  }, [doLock, clearInactivity, clearCap, isApplyingGarbage]);

  useEffect(() => {
    if (isApplyingGarbage) {
      clearInactivity(); clearCap();
      groundedSinceRef.current = null; lastGroundActionRef.current = null;
      capExpiredRef.current = false; setIsGrounded(false);
    }
  }, [isApplyingGarbage, clearInactivity, clearCap]);

  // Check grounded
  useEffect(() => {
    if (gameOver || countdown !== null || matchResult !== null || locking || isApplyingGarbage) {
      setIsGrounded(false); clearInactivity(); clearCap();
      groundedSinceRef.current = null; lastGroundActionRef.current = null;
      capExpiredRef.current = false;
      return;
    }
    const grounded = checkCollision(player, stage, { x: 0, y: 1 });
    setIsGrounded(grounded);
    if (grounded) {
      startGroundTimers();
    } else {
      clearInactivity(); clearCap();
      groundedSinceRef.current = null; lastGroundActionRef.current = null;
      capExpiredRef.current = false;
    }
  }, [player, stage, gameOver, countdown, matchResult, locking, isApplyingGarbage, startGroundTimers, clearInactivity, clearCap]);

  // === 2. Movement & Input ===
  const [moveIntent, setMoveIntent] = useState<{ dir: number; startTime: number; dasCharged: boolean } | null>(null);
  const [_isSpaceHeld, setIsSpaceHeld] = useState(false);
  const lastHardDropTimeRef = useRef<number>(0);
  const pieceCountRef = useRef(0);

  const movePlayer = useCallback((dir: number) => {
    if (gameOver || countdown !== null || matchResult !== null) return false;
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
      return true;
    }
    return false;
  }, [gameOver, countdown, matchResult, player, stage, updatePlayerPos]);

  const movePlayerToSide = useCallback((dir: number) => {
    if (gameOver || countdown !== null || matchResult !== null) return;
    let distance = 0;
    while (!checkCollision(player, stage, { x: dir * (distance + 1), y: 0 })) distance += 1;
    if (distance > 0) updatePlayerPos({ x: dir * distance, y: 0, collided: false });
  }, [gameOver, countdown, matchResult, player, stage, updatePlayerPos]);

  const hardDrop = () => {
    if (gameOver || countdown !== null || matchResult !== null || isApplyingGarbage) return;
    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) dropDistance += 1;
    updatePlayerPos({ x: 0, y: dropDistance, collided: true });
    setLocking(true);
  };

  const playerRotateSRS = useCallback((direction: 1 | -1 | 2) => {
    if (gameOver || countdown !== null || matchResult !== null || player.type === 'O') return;
    const result = tryRotate(
      { ...player, type: player.type, rotationState },
      stage, direction, rotationState
    );
    if (result.success) {
      setPlayer(prev => ({ ...prev, tetromino: result.newMatrix, pos: { x: result.newX, y: result.newY } }));
      setRotationState(result.newRotationState);
    }
  }, [player, stage, rotationState, gameOver, countdown, matchResult, setPlayer, setRotationState]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (gameOver || countdown !== null || matchResult !== null) return;
    if ([32, 37, 38, 39, 40, 16, 67].includes(e.keyCode)) e.preventDefault();
    resetAFKTimer();
  
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) { // Left / Right
      const dir = keyCode === 37 ? -1 : 1;
      if (!moveIntent || moveIntent.dir !== dir) {
        sendInput('move', { direction: dir });
        const moved = movePlayer(dir);
        setMoveIntent({ dir, startTime: Date.now(), dasCharged: false });
        if (moved && isGrounded) onGroundAction();
      }
    } else if (keyCode === 40) { // Down
      if (!checkCollision(player, stage, { x: 0, y: 1 })) {
        updatePlayerPos({ x: 0, y: 1, collided: false });
      } else {
        startGroundTimers();
      }
    } else if (keyCode === 38 || keyCode === 88) { // Rotate CW
      if (!locking) {
        sendInput('rotate', { direction: 1 });
        playerRotateSRS(1);
        if (checkCollision(player, stage, { x: 0, y: 1 })) onGroundAction();
      }
    } else if (keyCode === 90 || keyCode === 17) { // Rotate CCW
      if (!locking) {
        sendInput('rotate', { direction: -1 });
        playerRotateSRS(-1);
        if (checkCollision(player, stage, { x: 0, y: 1 })) onGroundAction();
      }
    } else if (C.ENABLE_180_ROTATION && keyCode === 65) { // Rotate 180°
      if (!locking) {
        sendInput('rotate', { direction: 2 });
        playerRotateSRS(2);
        if (checkCollision(player, stage, { x: 0, y: 1 })) onGroundAction();
      }
    } else if (keyCode === 32) { // Hard Drop
      if (!e.repeat) {
        sendInput('hard_drop');
        hardDrop();
        lastHardDropTimeRef.current = Date.now();
        setIsSpaceHeld(true);
      } else {
        const now = Date.now();
        if (now - lastHardDropTimeRef.current >= C.HARD_DROP_SPAM_INTERVAL) {
          sendInput('hard_drop');
          hardDrop();
          lastHardDropTimeRef.current = now;
        }
      }
    } else if (keyCode === 67) { // Hold
      if (!hasHeld) {
        sendInput('hold');
        holdSwap();
        setHasHeld(true);
        setRotationState(0);
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (gameOver || countdown !== null || matchResult !== null) return;
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) setMoveIntent(null);
    else if (keyCode === 40) setDropTime(isGrounded ? null : U.getFallSpeed(level));
    else if (keyCode === 32) setIsSpaceHeld(false);
  };

  // === 3. Game Intervals ===
  useInterval(() => { // Gravity
    if (gameOver || locking || countdown !== null || matchResult !== null || isApplyingGarbage) return;
    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      setLocking(true);
    }
  }, dropTime);

  useInterval(() => { // DAS
    if (!moveIntent || locking || gameOver || countdown !== null || matchResult !== null) return;
    const { dir, startTime, dasCharged } = moveIntent;
    const now = Date.now();
    if (now - startTime > C.DAS_DELAY && !dasCharged) {
      if (C.MOVE_INTERVAL === 0) movePlayerToSide(dir);
      setMoveIntent(prev => prev ? { ...prev, dasCharged: true } : null);
    }
  }, C.MOVE_INTERVAL > 0 ? C.MOVE_INTERVAL : 16);

  useInterval(() => { // ARR
    if (!moveIntent || !moveIntent.dasCharged || C.MOVE_INTERVAL === 0 || locking || gameOver || countdown !== null || matchResult !== null) return;
    const moved = movePlayer(moveIntent.dir);
    if (moved && isGrounded) onGroundAction();
  }, C.MOVE_INTERVAL > 0 ? C.MOVE_INTERVAL : null);

  // === 4. Logic Chain (useEffect) ===
  
  // `locking` -> `collided`
  useEffect(() => {
    if (locking) updatePlayerPos({x: 0, y: 0, collided: true});
  }, [locking, updatePlayerPos]);
  
  // `rowsCleared` -> update stats
  useEffect(() => {
    if (rowsCleared > 0) {
      setRows(prev => {
        const next = prev + rowsCleared;
        setLevel(Math.floor(next / 10));
        return next;
      });
    }
  }, [rowsCleared, setRows, setLevel]);

  // `player.collided` -> `pendingLockRef`
  useEffect(() => {
    if (!player.collided) return;
    pendingLockRef.current = true;
  }, [player.collided]);

  // `lastPlacement` + `pendingLockRef` -> XỬ LÝ LOCK
  useEffect(() => {
    if (!pendingLockRef.current) return;
    pendingLockRef.current = false;
    setLocking(false);

    const lines = lastPlacement.cleared;
    const tspinType = getTSpinType(player as any, lastPlacement.mergedStage as any, lines);
    const pc = lines > 0 && U.isPerfectClearBoard(stage);

    const isTetris = tspinType === 'none' && lines === 4;
    const isTSpinClear = tspinType !== 'none' && lines > 0;
    let newB2b = b2b;
    let newCombo = combo;
    if (lines > 0) {
        newCombo = combo + 1;
        newB2b = (isTetris || isTSpinClear) ? b2b + 1 : 0;
    } else {
        newCombo = 0;
    }

    if (lines > 0 && roomId) {
        const garbageLines = U.calculateGarbageLines(lines, tspinType, pc, newCombo, newB2b);
        if (garbageLines > 0) {
            console.log(`[Mechanics] 💥 Attack power: ${garbageLines} lines (Cleared: ${lines}, T-Spin: ${tspinType}, PC: ${pc}, Combo: ${newCombo}, B2B: ${newB2b})`);
            
            // Cancel incoming garbage FROM opponent first
            const canceled = cancelGarbage(garbageLines);
            
            // Always send the FULL attack power (not just remaining)
            // The opponent will handle canceling on their side
            console.log(`[Mechanics] 📤 Sending ${garbageLines} garbage lines (canceled ${canceled} incoming)`);
            sendGarbage(garbageLines);
            onOpponentGarbageSent(garbageLines);
        }
    }
    setCombo(newCombo);
    setB2b(newB2b);

    if (isGameOverFromBuffer(stage)) {
        setGameOver(true);
        setDropTime(null);
        if (roomId) sendTopout('topout');
        return;
    }

    resetPlayer();
    setHasHeld(false);
    setRotationState(0);
    setDropTime(U.getFallSpeed(level));
    pieceCountRef.current += 1;
    
    // Trigger garbage apply sau khi lock (nếu không clear lines)
    if (lines === 0) {
      triggerGarbageApply().catch(err => console.error('[Mechanics] Error applying garbage:', err));
    }
    
    if (roomId && pieceCountRef.current % 7 === 0) {
        socket.emit('game:requestNext', roomId, 7);
    }
  }, [lastPlacement, stage, roomId, level, combo, b2b, rowsCleared, resetPlayer, player, sendGarbage, sendTopout, onOpponentGarbageSent, cancelGarbage, triggerGarbageApply, setLocking, setCombo, setB2b, setGameOver, setDropTime, setHasHeld, setRotationState]);

  // `player` (spawn) -> check block-out
  useEffect(() => {
    if (
      player.pos.y === 0 && !player.collided && !locking &&
      countdown === null && !gameOver && matchResult === null
    ) {
      if (checkCollision(player, stage, { x: 0, y: 0 })) {
        setGameOver(true);
        setDropTime(null);
        if (roomId) sendTopout('spawn_blockout');
      }
    }
  }, [player, stage, locking, countdown, gameOver, matchResult, roomId, sendTopout, setGameOver, setDropTime]);
  
  return {
    handleKeyDown,
    handleKeyUp,
    moveIntent,
    setMoveIntent,
    isGrounded,
  };
};
