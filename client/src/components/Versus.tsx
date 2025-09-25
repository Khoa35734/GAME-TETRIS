import React, { useEffect, useRef, useState } from 'react';
import { StyledTetrisWrapper } from './styles/StyledTetris';
import Stage from './Stage';
import { HoldPanel, NextPanel } from './SidePanels';
import { checkCollision, createStage, isGameOverFromBuffer, STAGE_WIDTH, STAGE_HEIGHT, isTSpin } from '../gamehelper';
import { usePlayer } from '../hooks/usePlayer';
import { useStage } from '../hooks/useStage';
import { useGameStatus } from '../hooks/useGameStatus';
import { useInterval } from '../hooks/useInterval';

// Movement/Gravity settings (reuse from Tetris)
const DAS_DELAY: number = 120;
const MOVE_INTERVAL: number = 40;
const INITIAL_SPEED_MS: number = 1000;
const SPEED_FACTOR: number = 0.85;
const MIN_SPEED_MS: number = 60;
const getFallSpeed = (lvl: number) => Math.max(MIN_SPEED_MS, Math.round(INITIAL_SPEED_MS * Math.pow(SPEED_FACTOR, lvl)));
const INACTIVITY_LOCK_MS: number = 750; // 0.75s inactivity on ground
const HARD_CAP_MS: number = 3000;        // 3s hard cap since first ground contact


const Versus: React.FC = () => {
  // LEFT (your) board state
  const [player, updatePlayerPos, resetPlayer, playerRotate, hold, canHold, nextFour, holdSwap, clearHold] = usePlayer();
  const [stage, setStage, rowsCleared, clearedEventId] = useStage(player);
  const [, , rows, setRows, level, setLevel] = useGameStatus();
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [locking, setLocking] = useState(false);
  const [hasHeld, setHasHeld] = useState(false);
  const [moveIntent, setMoveIntent] = useState<{ dir: number; startTime: number; dasCharged: boolean } | null>(null);
  const [isGrounded, setIsGrounded] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  // Garbage attack system (LEFT side)
  const [pendingGarbageLeft, setPendingGarbageLeft] = useState(0); // lines waiting to be applied
  const [comboLeft, setComboLeft] = useState(-1); // -1 means combo not started
  const [b2bLeft, setB2BLeft] = useState(false); // back-to-back active
  const awaitingGarbageApplyLeft = useRef(false); // flag set when piece locks
  const inactivityTimeoutRef = useRef<number | null>(null);
  const capTimeoutRef = useRef<number | null>(null);
  const capExpiredRef = useRef<boolean>(false);
  const groundedSinceRef = useRef<number | null>(null);
  const prevPlayerRef = useRef<{ x: number; y: number; rotKey: string } | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => { wrapperRef.current?.focus(); }, []);

  // countdown similar to single-player
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

  // RIGHT (opponent) local simulation for logic testing
  const [oppPlayer, oppUpdatePlayerPos, oppResetPlayer, oppPlayerRotate, _oppHold, _oppCanHold, oppNextFour, _oppHoldSwap, _oppClearHold] = usePlayer();
  const [oppStage, setOppStage, oppRowsCleared, oppClearedEventId] = useStage(oppPlayer);
  const [oppDropTime, setOppDropTime] = useState<number | null>(null);
  const [oppGameOver, setOppGameOver] = useState(false);
  const [oppLocking, setOppLocking] = useState(false);
  const [oppMoveIntent, setOppMoveIntent] = useState<{ dir: number; startTime: number; dasCharged: boolean } | null>(null);
  const [oppIsGrounded, setOppIsGrounded] = useState(false);
  // Garbage attack system (RIGHT side)
  const [pendingGarbageRight, setPendingGarbageRight] = useState(0);
  const [comboRight, setComboRight] = useState(-1);
  const [b2bRight, setB2BRight] = useState(false);
  const awaitingGarbageApplyRight = useRef(false);
  const oppInactivityTimeoutRef = useRef<number | null>(null);
  const oppCapTimeoutRef = useRef<number | null>(null);
  const oppCapExpiredRef = useRef<boolean>(false);
  const oppGroundedSinceRef = useRef<number | null>(null);
  const oppPrevPlayerRef = useRef<{ x: number; y: number; rotKey: string } | null>(null);

  // controls
  const movePlayer = (dir: number) => {
    if (gameOver || locking) return;
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
    }
  };

  // helpers for lock delay
  const clearInactivity = () => { if (inactivityTimeoutRef.current) { clearTimeout(inactivityTimeoutRef.current); inactivityTimeoutRef.current = null; } };
  const clearCap = () => { if (capTimeoutRef.current) { clearTimeout(capTimeoutRef.current); capTimeoutRef.current = null; } };
  const oppClearInactivity = () => { if (oppInactivityTimeoutRef.current) { clearTimeout(oppInactivityTimeoutRef.current); oppInactivityTimeoutRef.current = null; } };
  const oppClearCap = () => { if (oppCapTimeoutRef.current) { clearTimeout(oppCapTimeoutRef.current); oppCapTimeoutRef.current = null; } };

  const doLock = () => {
    // game-over check using buffer rows like single-player
    if (isGameOverFromBuffer(stage)) {
      setGameOver(true);
      setDropTime(null);
      setTimerOn(false);
      clearInactivity();
      clearCap();
      capExpiredRef.current = false;
      groundedSinceRef.current = null;
      setIsGrounded(false);
      return;
    }
  setLocking(true);
  awaitingGarbageApplyLeft.current = true; // decide later if apply queued garbage
    clearInactivity();
    clearCap();
    capExpiredRef.current = false;
    groundedSinceRef.current = null;
    setIsGrounded(false);
    updatePlayerPos({ x: 0, y: 0, collided: true });
  };

  const oppDoLock = () => {
    if (isGameOverFromBuffer(oppStage)) {
      setOppGameOver(true);
      setOppDropTime(null);
      oppClearInactivity();
      oppClearCap();
      oppCapExpiredRef.current = false;
      oppGroundedSinceRef.current = null;
      setOppIsGrounded(false);
      return;
    }
  setOppLocking(true);
  awaitingGarbageApplyRight.current = true;
    oppClearInactivity();
    oppClearCap();
    oppCapExpiredRef.current = false;
    oppGroundedSinceRef.current = null;
    setOppIsGrounded(false);
    oppUpdatePlayerPos({ x: 0, y: 0, collided: true });
  };

  const startGroundTimers = () => {
    setIsGrounded(true);
    const now = Date.now();
    const firstTouch = groundedSinceRef.current == null;
    groundedSinceRef.current = groundedSinceRef.current ?? now;
    // inactivity restarts each time
    clearInactivity();
    inactivityTimeoutRef.current = window.setTimeout(() => doLock(), INACTIVITY_LOCK_MS);
    if (firstTouch && !capTimeoutRef.current) {
      capExpiredRef.current = false;
      capTimeoutRef.current = window.setTimeout(() => { capExpiredRef.current = true; }, HARD_CAP_MS);
    }
  };

  const oppStartGroundTimers = () => {
    setOppIsGrounded(true);
    const firstTouch = oppGroundedSinceRef.current == null;
    oppGroundedSinceRef.current = oppGroundedSinceRef.current ?? Date.now();
    oppClearInactivity();
    oppInactivityTimeoutRef.current = window.setTimeout(() => oppDoLock(), INACTIVITY_LOCK_MS);
    if (firstTouch && !oppCapTimeoutRef.current) {
      oppCapExpiredRef.current = false;
      oppCapTimeoutRef.current = window.setTimeout(() => { oppCapExpiredRef.current = true; }, HARD_CAP_MS);
    }
  };

  const onGroundAction = () => {
    if (capExpiredRef.current) { doLock(); return; }
    clearInactivity();
    inactivityTimeoutRef.current = window.setTimeout(() => doLock(), INACTIVITY_LOCK_MS);
  };

  const oppOnGroundAction = () => {
    if (oppCapExpiredRef.current) { oppDoLock(); return; }
    oppClearInactivity();
    oppInactivityTimeoutRef.current = window.setTimeout(() => oppDoLock(), INACTIVITY_LOCK_MS);
  };

  const movePlayerToSide = (dir: number) => {
    if (gameOver || locking) return;
    let distance = 0;
    while (!checkCollision(player, stage, { x: dir * (distance + 1), y: 0 })) distance += 1;
    if (distance > 0) updatePlayerPos({ x: dir * distance, y: 0, collided: false });
  };

  const hardDrop = () => {
    if (gameOver || countdown !== null) return;
    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) dropDistance += 1;
    setDropTime(null);
    setLocking(true);
    clearInactivity();
    clearCap();
    capExpiredRef.current = false;
    groundedSinceRef.current = null;
    setIsGrounded(false);
    updatePlayerPos({ x: 0, y: dropDistance, collided: true });
  };

  // Utility: inject N garbage rows at bottom with one random hole per row
  const injectGarbage = (prevStage: ReturnType<typeof createStage>, lines: number): ReturnType<typeof createStage> => {
    if (lines <= 0) return prevStage;
    let stageWork = prevStage.map(row => row.slice()) as typeof prevStage;
    for (let i = 0; i < lines; i++) {
      const hole = Math.floor(Math.random() * STAGE_WIDTH);
      const garbageRow = Array.from({ length: STAGE_WIDTH }, (_, x) => (x === hole ? [0, 'clear'] as any : ['W', 'merged'] as any));
      // drop top row and push garbage at bottom
      stageWork = stageWork.slice(1);
      stageWork.push(garbageRow as any);
    }
    // Ensure stage size remains STAGE_HEIGHT
    if (stageWork.length > STAGE_HEIGHT) stageWork = stageWork.slice(stageWork.length - STAGE_HEIGHT);
    return stageWork as any;
  };

  // --- Guideline attack helpers ---
  const isPerfectClear = (stg: any): boolean => {
    // Perfect clear when no merged cells present (ignore ghost cells) except zero
    for (let y = 0; y < stg.length; y++) {
      for (let x = 0; x < stg[y].length; x++) {
        const c = stg[y][x];
        if (c[1] === 'merged' && c[0] !== 0 && !String(c[0]).startsWith('ghost')) return false;
      }
    }
    return true;
  };

  const comboAttack = (combo: number): number => {
    // Common modern table (can tweak): start giving from combo>=2
    if (combo < 2) return 0;
    const table = [0,0,1,1,2,2,3,3,4,4,5]; // index = combo
    if (combo < table.length) return table[combo];
    return 5 + Math.floor((combo - (table.length - 1)) / 2); // slow ramp
  };

  type AttackInfo = { attack: number; b2bEligible: boolean };
  const calcAttack = (lines: number, tspin: boolean, perfect: boolean, prevB2B: boolean): AttackInfo => {
    let attack = 0;
    let b2bEligible = false;
    if (tspin && lines > 0) {
      b2bEligible = true;
      if (lines === 1) attack = 2 + (prevB2B ? 1 : 0);
      else if (lines === 2) attack = 4 + (prevB2B ? 2 : 0);
      else if (lines === 3) attack = 6 + (prevB2B ? 3 : 0);
    } else {
      if (lines === 2) attack = 1;
      else if (lines === 3) attack = 2;
      else if (lines === 4) { attack = 4 + (prevB2B ? 2 : 0); b2bEligible = true; }
    }
    if (perfect && lines > 0) attack += 10; // perfect clear bonus
    return { attack, b2bEligible };
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((gameOver && oppGameOver) || countdown !== null) return;
    if ([32, 37, 38, 39, 40, 16, 65, 68, 87, 83].includes(e.keyCode)) {
      e.preventDefault();
      e.stopPropagation();
    }
    const { keyCode } = e;
    // LEFT board: Arrow keys + Shift + Space
    if (keyCode === 37 || keyCode === 39) {
      const dir = keyCode === 37 ? -1 : 1;
      if (!moveIntent || moveIntent.dir !== dir) {
        movePlayer(dir);
        setMoveIntent({ dir, startTime: Date.now(), dasCharged: false });
        // nếu vẫn đang chạm đất, coi như thao tác trên đất
        if (checkCollision(player, stage, { x: 0, y: 1 })) onGroundAction();
      }
    } else if (keyCode === 40) {
      if (!checkCollision(player, stage, { x: 0, y: 1 })) updatePlayerPos({ x: 0, y: 1, collided: false });
      else {
        // Soft drop nhưng chạm đất → timers
        startGroundTimers();
      }
    } else if (keyCode === 38) {
      if (!locking) {
        playerRotate(stage, 1);
        // nếu vẫn đang chạm đất sau xoay → thao tác trên đất
        if (checkCollision(player, stage, { x: 0, y: 1 })) onGroundAction();
      }
    } else if (keyCode === 32) {
      hardDrop();
    } else if (keyCode === 16) { // Shift -> Hold
      if (!hasHeld && canHold) { holdSwap(); setHasHeld(true); }
    }

    // RIGHT board: WASD only (no hold, no hard drop)
    if (keyCode === 65 || keyCode === 68) { // A / D
      const dir = keyCode === 65 ? -1 : 1;
      if (!oppMoveIntent || oppMoveIntent.dir !== dir) {
        if (!checkCollision(oppPlayer as any, oppStage as any, { x: dir, y: 0 })) {
          oppUpdatePlayerPos({ x: dir, y: 0, collided: false });
        }
        setOppMoveIntent({ dir, startTime: Date.now(), dasCharged: false });
        if (checkCollision(oppPlayer as any, oppStage as any, { x: 0, y: 1 })) oppOnGroundAction();
      }
    } else if (keyCode === 83) { // S (soft drop)
      if (!checkCollision(oppPlayer as any, oppStage as any, { x: 0, y: 1 })) oppUpdatePlayerPos({ x: 0, y: 1, collided: false });
      else {
        oppStartGroundTimers();
      }
    } else if (keyCode === 87) { // W (rotate)
      if (!oppLocking) {
        oppPlayerRotate(oppStage as any, 1);
        if (checkCollision(oppPlayer as any, oppStage as any, { x: 0, y: 1 })) oppOnGroundAction();
      }
    }
  };
  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) setMoveIntent(null);
    if (keyCode === 65 || keyCode === 68) setOppMoveIntent(null);
  };

  // gravity
  useInterval(() => {
    if (gameOver || locking || countdown !== null) return;
    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      // Chạm đất → tạm dừng gravity và (re)start timers
      setDropTime(null);
      startGroundTimers();
    }
  }, dropTime !== undefined ? dropTime : null);

  // gravity for RIGHT board
  useInterval(() => {
    if (oppGameOver || oppLocking || countdown !== null) return;
    if (!checkCollision(oppPlayer as any, oppStage as any, { x: 0, y: 1 })) {
      oppUpdatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      setOppDropTime(null);
      oppStartGroundTimers();
    }
  }, oppDropTime !== undefined ? oppDropTime : null);

  // DAS
  useInterval(() => {
    if (moveIntent && !locking) {
      const { dir, startTime, dasCharged } = moveIntent;
      const now = Date.now();
      if (now - startTime > DAS_DELAY && !dasCharged) {
        if (MOVE_INTERVAL === 0) movePlayerToSide(dir);
        setMoveIntent(prev => (prev ? { ...prev, dasCharged: true } : null));
      }
    }
  }, MOVE_INTERVAL > 0 ? MOVE_INTERVAL : 16);

  // ARR > 0
  useInterval(() => {
    if (moveIntent && moveIntent.dasCharged && MOVE_INTERVAL > 0 && !locking) movePlayer(moveIntent.dir);
  }, MOVE_INTERVAL > 0 ? MOVE_INTERVAL : null);

  // DAS for RIGHT
  useInterval(() => {
    if (oppMoveIntent && !oppLocking) {
      const { dir, startTime, dasCharged } = oppMoveIntent;
      const now = Date.now();
      if (now - startTime > DAS_DELAY && !dasCharged) {
        if (MOVE_INTERVAL === 0) {
          let distance = 0;
          while (!checkCollision(oppPlayer as any, oppStage as any, { x: dir * (distance + 1), y: 0 })) distance += 1;
          if (distance > 0) oppUpdatePlayerPos({ x: dir * distance, y: 0, collided: false });
        }
        setOppMoveIntent(prev => (prev ? { ...prev, dasCharged: true } : null));
      }
    }
  }, MOVE_INTERVAL > 0 ? MOVE_INTERVAL : 16);

  // ARR > 0 for RIGHT
  useInterval(() => {
    if (oppMoveIntent && oppMoveIntent.dasCharged && MOVE_INTERVAL > 0 && !oppLocking) {
      if (!checkCollision(oppPlayer as any, oppStage as any, { x: oppMoveIntent.dir, y: 0 })) {
        oppUpdatePlayerPos({ x: oppMoveIntent.dir, y: 0, collided: false });
      }
    }
  }, MOVE_INTERVAL > 0 ? MOVE_INTERVAL : null);

  // unlock hold after lock
  useEffect(() => { if (player.collided && !gameOver) setHasHeld(false); }, [player.collided, gameOver]);
  useEffect(() => { /* right has no hold */ }, [oppPlayer.collided, oppGameOver]);
  // after merge reset
  useEffect(() => {
    if (locking && player.collided && !gameOver) {
      resetPlayer();
      setMoveIntent(null);
      setLocking(false);
      setDropTime(getFallSpeed(level));
      clearInactivity();
      clearCap();
      capExpiredRef.current = false;
      groundedSinceRef.current = null;
      setIsGrounded(false);
    }
  }, [stage, locking, player.collided, gameOver, level, resetPlayer]);

  useEffect(() => {
    if (oppLocking && oppPlayer.collided && !oppGameOver) {
      oppResetPlayer();
      setOppMoveIntent(null);
      setOppLocking(false);
      setOppDropTime(getFallSpeed(level));
      oppClearInactivity();
      oppClearCap();
      oppCapExpiredRef.current = false;
      oppGroundedSinceRef.current = null;
      setOppIsGrounded(false);
    }
  }, [oppStage, oppLocking, oppPlayer.collided, oppGameOver, level, oppResetPlayer]);

  // Theo dõi trạng thái và thao tác khi đang chạm đất
  useEffect(() => {
    if (gameOver) return;
    if (player.collided) return;
    const currKey = JSON.stringify(player.tetromino);
    const prev = prevPlayerRef.current;
    prevPlayerRef.current = { x: player.pos.x, y: player.pos.y, rotKey: currKey };
    const touching = checkCollision(player, stage, { x: 0, y: 1 });
    if (touching) {
      if (!isGrounded) startGroundTimers();
      else if (prev && (prev.x !== player.pos.x || prev.y !== player.pos.y || prev.rotKey !== currKey)) onGroundAction();
    } else {
      if (isGrounded) {
        clearInactivity();
        clearCap();
        capExpiredRef.current = false;
        groundedSinceRef.current = null;
        setIsGrounded(false);
        setDropTime(getFallSpeed(level));
      }
    }
  }, [player, stage, level, gameOver, isGrounded]);

  // Track RIGHT grounded actions
  useEffect(() => {
    if (oppGameOver) return;
    if (oppPlayer.collided) return;
    const currKey = JSON.stringify(oppPlayer.tetromino);
    const prev = oppPrevPlayerRef.current;
    oppPrevPlayerRef.current = { x: oppPlayer.pos.x, y: oppPlayer.pos.y, rotKey: currKey };
    const touching = checkCollision(oppPlayer as any, oppStage as any, { x: 0, y: 1 });
    if (touching) {
      if (!oppIsGrounded) oppStartGroundTimers();
      else if (prev && (prev.x !== oppPlayer.pos.x || prev.y !== oppPlayer.pos.y || prev.rotKey !== currKey)) oppOnGroundAction();
    } else {
      if (oppIsGrounded) {
        oppClearInactivity();
        oppClearCap();
        oppCapExpiredRef.current = false;
        oppGroundedSinceRef.current = null;
        setOppIsGrounded(false);
        setOppDropTime(getFallSpeed(level));
      }
    }
  }, [oppPlayer, oppStage, level, oppGameOver, oppIsGrounded]);

  useEffect(() => () => { clearInactivity(); clearCap(); }, []);
  useEffect(() => () => { oppClearInactivity(); oppClearCap(); }, []);

  // scoring rows accumulation (left)
  useEffect(() => { if (rowsCleared > 0) setRows(prev => prev + rowsCleared); }, [rowsCleared]);

  // LEFT clear event: compute attack, counter pending
  useEffect(() => {
    if (rowsCleared <= 0) return;
    const tspin = isTSpin(player as any, stage as any);
    const perfect = isPerfectClear(stage);
    const newCombo = comboLeft + 1; // first clear from -1 => 0
    setComboLeft(newCombo);
    const { attack, b2bEligible } = calcAttack(rowsCleared, tspin, perfect, b2bLeft);
    let remaining = attack + comboAttack(newCombo);
    // counter pending
    setPendingGarbageLeft(prev => {
      if (prev > 0 && remaining > 0) {
        const used = Math.min(prev, remaining);
        remaining -= used;
        return prev - used;
      }
      return prev;
    });
    if (remaining > 0) setPendingGarbageRight(prev => prev + remaining);
    setB2BLeft(b2bEligible ? true : false);
    awaitingGarbageApplyLeft.current = false; // we consumed lock
    // A non B2B eligible clear breaks chain
    if (!b2bEligible && !(tspin && rowsCleared>0) && rowsCleared < 4) setB2BLeft(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearedEventId]);

  // RIGHT clear event
  useEffect(() => {
    if (oppRowsCleared <= 0) return;
    const tspin = isTSpin(oppPlayer as any, oppStage as any);
    const perfect = isPerfectClear(oppStage);
    const newCombo = comboRight + 1;
    setComboRight(newCombo);
    const { attack, b2bEligible } = calcAttack(oppRowsCleared, tspin, perfect, b2bRight);
    let remaining = attack + comboAttack(newCombo);
    setPendingGarbageRight(prev => {
      if (prev > 0 && remaining > 0) {
        const used = Math.min(prev, remaining);
        remaining -= used;
        return prev - used;
      }
      return prev;
    });
    if (remaining > 0) setPendingGarbageLeft(prev => prev + remaining);
    setB2BRight(b2bEligible ? true : false);
    awaitingGarbageApplyRight.current = false;
    if (!b2bEligible && !(tspin && oppRowsCleared>0) && oppRowsCleared < 4) setB2BRight(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oppClearedEventId]);

  // Apply pending garbage when piece locked without clear (LEFT)
  useEffect(() => {
    if (!awaitingGarbageApplyLeft.current) return;
    // At this point resetPlayer already spawned new piece and locking turned false
    if (locking) return; // still merging
    if (rowsCleared > 0) { awaitingGarbageApplyLeft.current = false; return; }
    if (pendingGarbageLeft > 0) {
      setStage(prev => injectGarbage(prev as any, pendingGarbageLeft) as any);
      setPendingGarbageLeft(0);
    }
    setComboLeft(-1); // combo broken
    setB2BLeft(false); // singles / no clear break chain
    awaitingGarbageApplyLeft.current = false;
  }, [locking, rowsCleared, pendingGarbageLeft, setStage]);

  // Apply pending garbage when piece locked without clear (RIGHT)
  useEffect(() => {
    if (!awaitingGarbageApplyRight.current) return;
    if (oppLocking) return;
    if (oppRowsCleared > 0) { awaitingGarbageApplyRight.current = false; return; }
    if (pendingGarbageRight > 0) {
      setOppStage(prev => injectGarbage(prev as any, pendingGarbageRight) as any);
      setPendingGarbageRight(0);
    }
    setComboRight(-1);
    setB2BRight(false);
    awaitingGarbageApplyRight.current = false;
  }, [oppLocking, oppRowsCleared, pendingGarbageRight, setOppStage]);

  // timer like single-player
  useEffect(() => {
    if (!timerOn) return;
    let raf = 0; let last = performance.now();
    const tick = (now: number) => { setElapsedMs((prev) => prev + (now - last)); last = now; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timerOn]);

  const startGame = () => {
    setStage(createStage());
    setDropTime(getFallSpeed(0));
    setGameOver(false);
    setRows(0);
    setLevel(0);
    setElapsedMs(0);
    setTimerOn(true);
    clearHold();
    setHasHeld(false);

    setOppStage(createStage());
    setOppDropTime(getFallSpeed(0));
    setOppGameOver(false);
    setOppMoveIntent(null);
    setOppLocking(false);
    // reset garbage state
    setPendingGarbageLeft(0); setPendingGarbageRight(0);
    setComboLeft(-1); setComboRight(-1);
    setB2BLeft(false); setB2BRight(false);
    awaitingGarbageApplyLeft.current = false; awaitingGarbageApplyRight.current = false;
  };

  return (
    <StyledTetrisWrapper
      ref={wrapperRef}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{ display: 'grid', placeItems: 'center' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'start' }}>
        {/* Left side: HOLD | STAGE | NEXT */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', alignItems: 'start', gap: 16 }}>
          <HoldPanel hold={hold as any} />
          <Stage stage={stage} />
          <div style={{ display: 'grid', gap: 12 }}>
            <NextPanel queue={nextFour as any} />
            <div style={{ background: 'rgba(20,20,22,0.35)', padding: 8, borderRadius: 10, color: '#fff' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>STATUS</div>
              <div>Rows: {rows}</div>
              <div>Level: {level}</div>
              <div>Time: {(elapsedMs/1000).toFixed(2)}s</div>
              <div>Combo: {comboLeft >= 0 ? comboLeft : '-'}</div>
              <div>B2B: {b2bLeft ? 'ON' : 'OFF'}</div>
              <div>Incoming: {pendingGarbageLeft}</div>
            </div>
          </div>
        </div>
        {/* Right side: HOLD | STAGE | NEXT (local opponent, hold disabled) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', alignItems: 'start', gap: 16 }}>
          <HoldPanel hold={null} />
          <Stage stage={oppStage} />
          <div style={{ display: 'grid', gap: 12 }}>
            <NextPanel queue={oppNextFour as any} />
            <div style={{ background: 'rgba(20,20,22,0.35)', padding: 8, borderRadius: 10, color: '#fff' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>OPP STATUS</div>
              <div>Combo: {comboRight >= 0 ? comboRight : '-'}</div>
              <div>B2B: {b2bRight ? 'ON' : 'OFF'}</div>
              <div>Incoming: {pendingGarbageRight}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay countdown */}
      {countdown !== null && (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(1px)', color: '#fff', fontSize: 80, fontWeight: 800, textShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
          {countdown}
        </div>
      )}
    </StyledTetrisWrapper>
  );
};

export default Versus;
