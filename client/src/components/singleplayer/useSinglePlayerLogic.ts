import { useEffect, useRef, useState } from 'react';
import { createStage, checkCollision, isGameOverFromBuffer, isTSpin } from '../../gamehelper';
import { useInterval } from '../../hooks/useInterval';
import { usePlayer } from '../../hooks/usePlayer';
import { useStage } from '../../hooks/useStage';
import { useGameStatus } from '../../hooks/useGameStatus';
import { getFallSpeed } from './getFallSpeed';
import { DAS_DELAY, MOVE_INTERVAL, INACTIVITY_LOCK_MS, HARD_CAP_MS } from './constants';

export interface GameSettings {
  linesToClear: number;
  showGhost: boolean;
  enableHardDrop: boolean;
  showNext: boolean;
  showHold: boolean;
}

export function useSinglePlayerLogic() {
  const [gameSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('tetris:singleSettings');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { linesToClear: 40, showGhost: true, enableHardDrop: true, showNext: true, showHold: true };
  });

  const [hasHeld, setHasHeld] = useState(false);
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [startGameOverSequence, setStartGameOverSequence] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [showGameOverOverlay, setShowGameOverOverlay] = useState(false);

  const [locking, setLocking] = useState(false);
  const [isGrounded, setIsGrounded] = useState(false);
  const inactivityTimeoutRef = useRef<number | null>(null);
  const capTimeoutRef = useRef<number | null>(null);
  const capExpiredRef = useRef<boolean>(false);
  const groundedSinceRef = useRef<number | null>(null);
  const lastGroundActionRef = useRef<number | null>(null);
  const prevPlayerRef = useRef<{ x: number; y: number; rotKey: string } | null>(null);

  const [moveIntent, setMoveIntent] = useState<{ dir: number; startTime: number; dasCharged: boolean } | null>(null);

  const [player, updatePlayerPos, resetPlayer, playerRotate, hold, canHold, nextFour, holdSwap, clearHold] = usePlayer();
  const [stage, setStage, rowsCleared, clearEventId] = useStage(player);
  const [, , rows, setRows, level, setLevel] = useGameStatus();

  const [win, setWin] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  const whiteoutRaf = useRef<number | null>(null);

  const [piecesPlaced, setPiecesPlaced] = useState(0);
  const [inputs, setInputs] = useState(0);
  const [holds, setHolds] = useState(0);

  const hardDropLastTimeRef = useRef<number>(0);
  const HARD_DROP_DELAY = 100;

  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => { wrapperRef.current?.focus(); }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      startGame();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const movePlayer = (dir: number) => {
    if (gameOver || startGameOverSequence || locking || countdown !== null || win) return;
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
      setInputs((prev) => prev + 1);
    }
  };

  const movePlayerToSide = (dir: number) => {
    if (gameOver || startGameOverSequence || locking || countdown !== null || win) return;
    let distance = 0;
    while (!checkCollision(player, stage, { x: dir * (distance + 1), y: 0 })) distance += 1;
    if (distance > 0) {
      updatePlayerPos({ x: dir * distance, y: 0, collided: false });
      setInputs((prev) => prev + 1);
    }
  };

  const startGame = (): void => {
    setStage(createStage());
    setDropTime(getFallSpeed(0));
    setGameOver(false);
    setShowGameOverOverlay(false);
    setStartGameOverSequence(false);
    if (whiteoutRaf.current) cancelAnimationFrame(whiteoutRaf.current);
    setMoveIntent(null);
    setRows(0);
    setLevel(0);
    setWin(false);
    setElapsedMs(0);
    setTimerOn(true);
    setPiecesPlaced(0);
    setInputs(0);
    setHolds(0);
    hardDropLastTimeRef.current = 0;
    clearHold();
    setHasHeld(false);
    if (inactivityTimeoutRef.current) { clearTimeout(inactivityTimeoutRef.current); inactivityTimeoutRef.current = null; }
    if (capTimeoutRef.current) { clearTimeout(capTimeoutRef.current); capTimeoutRef.current = null; }
    capExpiredRef.current = false;
    groundedSinceRef.current = null;
    lastGroundActionRef.current = null;
    setIsGrounded(false);
    resetPlayer();
    wrapperRef.current?.focus();
  };

  const clearInactivity = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  };
  const clearCap = () => {
    if (capTimeoutRef.current) {
      clearTimeout(capTimeoutRef.current);
      capTimeoutRef.current = null;
    }
  };

  const doLock = () => {
    if (isGameOverFromBuffer(stage)) {
      setGameOver(true);
      setDropTime(null);
      setTimerOn(false);
      clearInactivity();
      clearCap();
      capExpiredRef.current = false;
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      setIsGrounded(false);
      return;
    }
    const tspin = player.type === 'T' && isTSpin(player as any, stage as any);
    if (tspin) console.log('T-Spin!');
    setLocking(true);
    clearInactivity();
    clearCap();
    capExpiredRef.current = false;
    groundedSinceRef.current = null;
    lastGroundActionRef.current = null;
    setIsGrounded(false);
    updatePlayerPos({ x: 0, y: 0, collided: true });
  };

  const startGroundTimers = () => {
    setIsGrounded(true);
    const now = Date.now();
    const firstTouch = groundedSinceRef.current == null;
    groundedSinceRef.current = groundedSinceRef.current ?? now;
    lastGroundActionRef.current = now;
    clearInactivity();
    inactivityTimeoutRef.current = window.setTimeout(() => { doLock(); }, INACTIVITY_LOCK_MS);
    if (firstTouch && !capTimeoutRef.current) {
      capExpiredRef.current = false;
      capTimeoutRef.current = window.setTimeout(() => { capExpiredRef.current = true; }, HARD_CAP_MS);
    }
  };

  const onGroundAction = () => {
    if (capExpiredRef.current) { doLock(); return; }
    lastGroundActionRef.current = Date.now();
    clearInactivity();
    inactivityTimeoutRef.current = window.setTimeout(() => doLock(), INACTIVITY_LOCK_MS);
  };

  const clearAFKTimer = () => {};

  const drop = (): void => {
    if (countdown !== null) return;
    if (rows > (level + 1) * 10) {
      const newLevel = level + 1;
      setLevel((prev) => prev + 1);
      setDropTime(getFallSpeed(newLevel));
    }
    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      setDropTime(null);
      startGroundTimers();
    }
  };

  const hardDrop = (): void => {
    if (gameOver || startGameOverSequence || countdown !== null) return;
    const now = Date.now();
    if (now - hardDropLastTimeRef.current < HARD_DROP_DELAY) return;
    hardDropLastTimeRef.current = now;
    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) dropDistance += 1;
    const finalY = player.pos.y + dropDistance;
    if (finalY <= 0) {
      setGameOver(true);
      setDropTime(null);
      setTimerOn(false);
      return;
    }
    setDropTime(null);
    setLocking(true);
    clearInactivity();
    clearCap();
    capExpiredRef.current = false;
    groundedSinceRef.current = null;
    lastGroundActionRef.current = null;
    setIsGrounded(false);
    if (dropDistance > 0) updatePlayerPos({ x: 0, y: dropDistance, collided: true });
    else updatePlayerPos({ x: 0, y: 0, collided: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (gameOver || startGameOverSequence || countdown !== null || win) return;
    if ([32, 37, 38, 39, 40, 16].includes((e as any).keyCode)) { e.preventDefault(); e.stopPropagation(); }
    const keyCode = (e as any).keyCode as number;
    if (keyCode === 37 || keyCode === 39) {
      const dir = keyCode === 37 ? -1 : 1;
      if (!moveIntent || moveIntent.dir !== dir) {
        movePlayer(dir);
        setMoveIntent({ dir, startTime: Date.now(), dasCharged: false });
      }
    } else if (keyCode === 40) {
      if (!checkCollision(player, stage, { x: 0, y: 1 })) {
        updatePlayerPos({ x: 0, y: 1, collided: false });
        setInputs((prev) => prev + 1);
      } else {
        startGroundTimers();
      }
    } else if (keyCode === 38) {
      if (!locking) {
        playerRotate(stage, 1);
        setInputs((prev) => prev + 1);
        if (checkCollision(player, stage, { x: 0, y: 1 })) onGroundAction();
      }
    } else if (keyCode === 32) {
      if (gameSettings.enableHardDrop) {
        hardDrop();
        setInputs((prev) => prev + 1);
      }
    } else if (keyCode === 16) {
      if (gameSettings.showHold && !hasHeld && canHold) {
        holdSwap();
        setHasHeld(true);
        setHolds((prev) => prev + 1);
        setInputs((prev) => prev + 1);
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (gameOver || startGameOverSequence || countdown !== null || win) return;
    const keyCode = (e as any).keyCode as number;
    if (keyCode === 37 || keyCode === 39) setMoveIntent(null);
    else if (keyCode === 40) setDropTime(isGrounded ? null : getFallSpeed(level));
  };

  useInterval(() => { if (!gameOver && !startGameOverSequence && !locking && !win) drop(); }, (dropTime as any) !== undefined ? dropTime : null);

  useInterval(() => {
    if (moveIntent && !locking) {
      const { dir, startTime, dasCharged } = moveIntent;
      const now = Date.now();
      if (now - startTime > DAS_DELAY && !dasCharged) {
        if (MOVE_INTERVAL === 0) movePlayerToSide(dir);
        setMoveIntent((prev) => (prev ? { ...prev, dasCharged: true } : null));
      }
    }
  }, MOVE_INTERVAL > 0 ? MOVE_INTERVAL : 16);

  useInterval(() => { if (moveIntent && moveIntent.dasCharged && MOVE_INTERVAL > 0 && !locking) movePlayer(moveIntent.dir); }, MOVE_INTERVAL > 0 ? MOVE_INTERVAL : null);

  useEffect(() => { if (player.collided && !gameOver) setHasHeld(false); }, [player.collided, gameOver]);

  useEffect(() => {
    if (locking && player.collided && !gameOver) {
      setPiecesPlaced((prev) => prev + 1);
      resetPlayer();
      setMoveIntent(null);
      setLocking(false);
      setDropTime(getFallSpeed(level));
      clearInactivity();
      clearCap();
      capExpiredRef.current = false;
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      setIsGrounded(false);
    }
  }, [stage, locking, player.collided, gameOver, level, resetPlayer]);

  useEffect(() => {
    const isSpawningNewPlayer = player.pos.x === 5 && player.pos.y === 0 && !player.collided;
    if (isSpawningNewPlayer && checkCollision(player, stage, { x: 0, y: 0 })) {
      setDropTime(null);
      setStartGameOverSequence(true);
    }
  }, [player, stage]);

  useEffect(() => {
    if (startGameOverSequence && !gameOver) {
      updatePlayerPos({ x: 0, y: 0, collided: true });
      setGameOver(true);
      setTimerOn(false);
      clearInactivity();
      clearCap();
      capExpiredRef.current = false;
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      setIsGrounded(false);
    }
  }, [startGameOverSequence, gameOver, updatePlayerPos]);

  useEffect(() => {
    if (!gameOver) { setShowGameOverOverlay(false); return; }
    const duration = 1000;
    const height = stage.length;
    const start = performance.now();
    const animate = (t: number) => {
      const elapsed = t - start;
      const p = Math.min(1, elapsed / duration);
      const rowsToWhite = Math.floor(p * height);
      setStage((prev) => {
        const copy = prev.map((r) => r.slice()) as any[];
        for (let i = 0; i < rowsToWhite; i++) {
          const rowIdx = copy.length - 1 - i;
          if (rowIdx >= 0) {
            copy[rowIdx] = (copy[rowIdx] as any[]).map((cell: any) => {
              const occupied = cell && cell[0] !== 0 && cell[0] !== '0';
              return occupied ? ['W', 'merged'] : cell;
            });
          }
        }
        return copy as any;
      });
      if (p < 1) {
        whiteoutRaf.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => setShowGameOverOverlay(true), 200);
      }
    };
    whiteoutRaf.current = requestAnimationFrame(animate);
    return () => { if (whiteoutRaf.current) cancelAnimationFrame(whiteoutRaf.current); };
  }, [gameOver, stage.length, setStage]);

  useEffect(() => {
    if (!timerOn) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      setElapsedMs((prev) => prev + (now - last));
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timerOn]);

  useEffect(() => { if (rowsCleared > 0) { setRows((prev) => prev + rowsCleared); } }, [clearEventId]);

  useEffect(() => { if (!win && rows >= gameSettings.linesToClear) { setWin(true); setTimerOn(false); setDropTime(null); } }, [rows, win, gameSettings.linesToClear]);

  useEffect(() => {
    const currKey = JSON.stringify(player.tetromino);
    const prev = prevPlayerRef.current;
    prevPlayerRef.current = { x: player.pos.x, y: player.pos.y, rotKey: currKey };
    if (gameOver || startGameOverSequence || countdown !== null) {
      clearInactivity();
      clearCap();
      capExpiredRef.current = false;
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      setIsGrounded(false);
      return;
    }
    if (player.collided) return;
    const touching = checkCollision(player, stage, { x: 0, y: 1 });
    if (touching) {
      if (!isGrounded) startGroundTimers();
      else if (prev && (prev.x !== player.pos.x || prev.y !== player.pos.y || prev.rotKey !== currKey)) onGroundAction();
    } else if (isGrounded) {
      clearInactivity();
      clearCap();
      capExpiredRef.current = false;
      groundedSinceRef.current = null;
      lastGroundActionRef.current = null;
      setIsGrounded(false);
      setDropTime(getFallSpeed(level));
    }
  }, [player, stage, gameOver, startGameOverSequence, countdown, level, isGrounded]);

  useEffect(() => () => { clearInactivity(); clearCap(); clearAFKTimer(); }, []);
  useEffect(() => { return () => {}; }, [countdown, gameOver, startGameOverSequence]);

  const onWinPlayAgain = () => { setWin(false); setCountdown(3); };
  const onGameOverTryAgain = () => { setGameOver(false); setShowGameOverOverlay(false); setCountdown(3); };

  return {
    // refs and handlers
    wrapperRef,
    handleKeyDown,
    handleKeyUp,
    // stage & pieces
    stage,
    gameSettings,
    hold,
    nextFour,
    // status
    rows,
    level,
    elapsedMs,
    piecesPlaced,
    inputs,
    holds,
    // flags
    countdown,
    timerOn,
    gameOver,
    showGameOverOverlay,
    win,
    // actions
    startGame,
    onWinPlayAgain,
    onGameOverTryAgain,
  } as const;
}

export default useSinglePlayerLogic;
