import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useStage } from '../hooks/useStage';
import { useGameStatus } from '../hooks/useGameStatus';
import { useInterval } from '../hooks/useInterval';
import { checkCollision, createStage, getTSpinType } from '../gamehelper';
import { tryRotate } from '../srsRotation';
import type { Stage as StageType, Cell as StageCell, TSpinType } from '../gamehelper';

/**
 * ============================================
 * ⚙️ CÁC THAM SỐ CƠ BẢN
 * ============================================
 */
const INACTIVITY_LOCK_MS = 750;  // Khoảng thời gian không thao tác -> lock
const HARD_CAP_MS = 3000;        // Sau 3s chạm đất -> lock
const MAX_LEVEL = 22;

const getFallSpeed = (lvl: number): number => {
  const START = 800; // ms
  const END = 16.67;
  const L = Math.min(lvl, MAX_LEVEL - 1);
  const progress = L / (MAX_LEVEL - 1);
  return Math.max(END, START * Math.pow(END / START, progress));
};

const isPerfectClear = (stage: StageType): boolean =>
  stage.every(row => row.every(([v]) => v === 0 || v === '0' || (typeof v === 'string' && v.startsWith('ghost'))));

const calculateGarbageLines = (
  lines: number,
  tspin: TSpinType,
  pc: boolean,
  combo: number,
  b2b: number
): number => {
  if (lines === 0) return 0;

  let g = 0;
  if (pc) g = 10;
  else if (tspin !== 'none' && lines > 0) {
    const tspinBase = [0, 2, 4, 6];
    g = tspinBase[lines] ?? 0;
  } else {
    const stdBase = [0, 0, 1, 2, 4];
    g = stdBase[lines] ?? 0;
  }

  const isTetris = tspin === 'none' && lines === 4;
  const isTSpinClear = tspin !== 'none' && lines > 0;
  if (b2b >= 1 && (isTetris || isTSpinClear)) g += 1;

  if (combo >= 9) g += 5;
  else if (combo >= 7) g += 4;
  else if (combo >= 5) g += 3;
  else if (combo >= 3) g += 2;
  else if (combo >= 2) g += 1;

  return g;
};

/**
 * ============================================
 * 🎮 useTetrisGame Hook
 * ============================================
 */
export interface UseTetrisGameProps {
  onLinesCleared: (garbage: number) => void;
  onGameOver: (reason: string) => void;
  onBoardChange: (stage: StageType, hold: any) => void;
}

export function useTetrisGame({
  onLinesCleared,
  onGameOver,
  onBoardChange,
}: UseTetrisGameProps) {
  const [
    player,
    updatePlayerPos,
    resetPlayer,
    ,
    hold,
    canHold,
    nextQueue,
    holdSwap,
    clearHold,
    setQueueSeed,
    pushQueue,
    setPlayer,
  ] = usePlayer();

  const [stage, setStage, rowsCleared, , lastPlacement] = useStage(player);
  const [, , totalRows, setTotalRows, level, setLevel] = useGameStatus();

  // Core states
  const [dropTime, setDropTime] = useState<number | null>(getFallSpeed(0));
  const [gameOver, setGameOver] = useState(false);
  const [combo, setCombo] = useState(0);
  const [b2b, setB2b] = useState(0);
  const [locking, setLocking] = useState(false);
  const [isGrounded, setIsGrounded] = useState(false);

  // Lock delay refs
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);
  const hardCapTimeout = useRef<NodeJS.Timeout | null>(null);
  const groundedSince = useRef<number | null>(null);
  const capExpired = useRef(false);

  /**
   * ==============================
   * 🧹 Các hàm tiện ích lock delay
   * ==============================
   */
  const clearTimers = useCallback(() => {
    if (inactivityTimeout.current) clearTimeout(inactivityTimeout.current);
    if (hardCapTimeout.current) clearTimeout(hardCapTimeout.current);
    inactivityTimeout.current = null;
    hardCapTimeout.current = null;
  }, []);

  const startGroundTimers = useCallback(() => {
    clearTimers();
    if (capExpired.current) {
      setLocking(true);
      return;
    }
    inactivityTimeout.current = setTimeout(() => setLocking(true), INACTIVITY_LOCK_MS);
    if (!groundedSince.current) {
      groundedSince.current = Date.now();
      hardCapTimeout.current = setTimeout(() => {
        capExpired.current = true;
        setLocking(true);
      }, HARD_CAP_MS);
    }
  }, [clearTimers]);

  const onGroundAction = useCallback(() => {
    clearTimers();
    if (capExpired.current) setLocking(true);
    else inactivityTimeout.current = setTimeout(() => setLocking(true), INACTIVITY_LOCK_MS);
  }, [clearTimers]);

  /**
   * ==============================
   * ⚡ Gravity
   * ==============================
   */
  useInterval(() => {
    if (gameOver || locking) return;
    if (!checkCollision(player, stage, { x: 0, y: 1 }))
      updatePlayerPos({ x: 0, y: 1, collided: false });
    else setLocking(true);
  }, dropTime);

  /**
   * ==============================
   * 💥 Khi piece lock
   * ==============================
   */
  useEffect(() => {
    if (!player.collided) return;
    if (gameOver) return;

    setLocking(false);

    const lines = lastPlacement.cleared;
    const mergedStage = lastPlacement.mergedStage;
    const tspinType = getTSpinType(player as any, mergedStage as any, lines);
    const pc = lines > 0 && isPerfectClear(mergedStage);

    // Tính combo/b2b
    const isTetris = tspinType === 'none' && lines === 4;
    const isTSpinClear = tspinType !== 'none' && lines > 0;
    const newB2b = (isTetris || isTSpinClear) ? b2b + 1 : 0;
    const newCombo = lines > 0 ? combo + 1 : 0;
    setB2b(newB2b);
    setCombo(newCombo);

    // Tính rác
    const garbage = calculateGarbageLines(lines, tspinType, pc, newCombo, newB2b);
    if (garbage > 0) onLinesCleared(garbage);

    // Cập nhật điểm và level
    if (lines > 0) {
      setTotalRows(prev => {
        const next = prev + lines;
        setLevel(Math.floor(next / 10));
        setDropTime(getFallSpeed(Math.floor(next / 10)));
        return next;
      });
    }

    // Gửi snapshot
    onBoardChange(stage, hold);

    // Kiểm tra game over (spawn-out)
    if (stage[0].some(c => c[0] !== 0)) {
      setGameOver(true);
      onGameOver('lockout');
    }
  }, [player.collided]);

  /**
   * ==============================
   * 🔻 Locking logic
   * ==============================
   */
  useEffect(() => {
    if (locking) {
      updatePlayerPos({ x: 0, y: 0, collided: true });
    }
  }, [locking]);

  /**
   * ==============================
   * 📈 Rows cleared cập nhật level
   * ==============================
   */
  useEffect(() => {
    if (rowsCleared > 0)
      setTotalRows(prev => {
        const next = prev + rowsCleared;
        setLevel(Math.floor(next / 10));
        setDropTime(getFallSpeed(Math.floor(next / 10)));
        return next;
      });
  }, [rowsCleared]);

  /**
   * ==============================
   * 🧱 Force Apply Garbage (từ mạng)
   * ==============================
   */
  const forceApplyGarbage = useCallback(
    (lines: number) => {
      if (lines <= 0) return;
      setStage(prev => {
        const width = prev[0].length;
        const hole = Math.floor(Math.random() * width);
        const newRows = Array.from({ length: lines }, () =>
          Array.from({ length: width }, (_, x) =>
            x === hole ? [0, 'clear'] : ['garbage', 'merged']
          ) as StageCell[]
        );
        return [...prev.slice(lines), ...newRows];
      });
    },
    [setStage]
  );

  /**
   * ==============================
   * 🔄 Reset game
   * ==============================
   */
  const startNewGame = useCallback(() => {
    setStage(createStage());
    setDropTime(getFallSpeed(0));
    setGameOver(false);
    setTotalRows(0);
    setLevel(0);
    setCombo(0);
    setB2b(0);
    clearHold();
    resetPlayer();
  }, [setStage, clearHold, resetPlayer, setLevel, setTotalRows]);

  /**
   * ==============================
   * 🚀 Trả về API cho UI & Input
   * ==============================
   */
  return {
    myStage: stage,
    myPlayer: player,
    myHold: hold,
    myNextQueue: nextQueue,
    gameStats: { combo, b2b, rows: totalRows, level },
    isGrounded,
    locking,
    canHold,
    updatePlayerPos,
    setPlayer,
    holdSwap,
    startGroundTimers,
    onGroundAction,
    forceApplyGarbage,
    startNewGame,
    gameOver,
  };
}
