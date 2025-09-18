import React, { useEffect, useRef, useState } from 'react';
import { StyledTetrisWrapper } from './styles/StyledTetris';
import Stage from './Stage';
import { checkCollision } from '../gamehelper';
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

const BoardView: React.FC<{ title: string; border: string; children: React.ReactNode }>
  = ({ title, border, children }) => (
  <div style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
    <div style={{ fontWeight: 800, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>{title}</div>
    <div style={{ border, borderRadius: 8, padding: 6, background: 'rgba(0,0,0,0.15)' }}>
      {children}
    </div>
  </div>
);

const Versus: React.FC = () => {
  // LEFT (your) board state
  const [player, updatePlayerPos, resetPlayer, playerRotate, , canHold, , holdSwap] = usePlayer();
  const [stage, , rowsCleared] = useStage(player);
  const [, , , setRows, level] = useGameStatus();
  const [dropTime, setDropTime] = useState<number | null>(getFallSpeed(0));
  const [gameOver] = useState(false);
  const [locking, setLocking] = useState(false);
  const [hasHeld, setHasHeld] = useState(false);
  const [moveIntent, setMoveIntent] = useState<{ dir: number; startTime: number; dasCharged: boolean } | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => { wrapperRef.current?.focus(); }, []);

  // RIGHT (opponent) board placeholder: mirror your stage for demo
  const [oppStage, setOppStage] = useState(stage);
  useEffect(() => { setOppStage(stage); }, [stage]);

  // controls
  const movePlayer = (dir: number) => {
    if (gameOver || locking) return;
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
    }
  };

  const movePlayerToSide = (dir: number) => {
    if (gameOver || locking) return;
    let distance = 0;
    while (!checkCollision(player, stage, { x: dir * (distance + 1), y: 0 })) distance += 1;
    if (distance > 0) updatePlayerPos({ x: dir * distance, y: 0, collided: false });
  };

  const hardDrop = () => {
    if (gameOver) return;
    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) dropDistance += 1;
    setDropTime(null);
    setLocking(true);
    updatePlayerPos({ x: 0, y: dropDistance, collided: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (gameOver) return;
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
      if (!checkCollision(player, stage, { x: 0, y: 1 })) updatePlayerPos({ x: 0, y: 1, collided: false });
      else { setDropTime(null); setLocking(true); updatePlayerPos({ x: 0, y: 0, collided: true }); }
    } else if (keyCode === 38) {
      if (!locking) playerRotate(stage, 1);
    } else if (keyCode === 32) {
      hardDrop();
    } else if (keyCode === 16) { // Shift -> Hold
      if (!hasHeld && canHold) { holdSwap(); setHasHeld(true); }
    }
  };
  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) setMoveIntent(null);
  };

  // gravity
  useInterval(() => {
    if (gameOver || locking) return;
    if (!checkCollision(player, stage, { x: 0, y: 1 })) updatePlayerPos({ x: 0, y: 1, collided: false });
    else { setDropTime(null); setLocking(true); updatePlayerPos({ x: 0, y: 0, collided: true }); }
  }, dropTime !== undefined ? dropTime : null);

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

  // unlock hold after lock
  useEffect(() => { if (player.collided && !gameOver) setHasHeld(false); }, [player.collided, gameOver]);
  // after merge reset
  useEffect(() => {
    if (locking && player.collided && !gameOver) {
      resetPlayer();
      setMoveIntent(null);
      setLocking(false);
      setDropTime(getFallSpeed(level));
    }
  }, [stage, locking, player.collided, gameOver, level, resetPlayer]);

  // scoring rows
  useEffect(() => { if (rowsCleared > 0) setRows(prev => prev + rowsCleared); }, [rowsCleared]);

  return (
    <StyledTetrisWrapper
      ref={wrapperRef}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{ display: 'grid', placeItems: 'center' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <BoardView title="Bạn" border="3px solid #00d084">
          <Stage stage={stage} />
        </BoardView>
        <BoardView title="Đối thủ" border="3px solid #666">
          <Stage stage={oppStage} />
        </BoardView>
      </div>
    </StyledTetrisWrapper>
  );
};

export default Versus;
