import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import socket, { SERVER_URL } from '../socket.ts';
import Stage from './Stage';
import { HoldPanel, NextPanel } from './SidePanels';
import { checkCollision, createStage, isGameOverFromBuffer, isTSpin } from '../gamehelper';
import type { Stage as StageType, Cell as StageCell } from '../gamehelper';
import { usePlayer } from '../hooks/usePlayer';
import { useStage } from '../hooks/useStage';
import { useGameStatus } from '../hooks/useGameStatus';
import { useInterval } from '../hooks/useInterval';

// Movement/Gravity settings
const INITIAL_SPEED_MS: number = 1000;
const SPEED_FACTOR: number = 0.85;
const MIN_SPEED_MS: number = 60;
const getFallSpeed = (lvl: number) => Math.max(MIN_SPEED_MS, Math.round(INITIAL_SPEED_MS * Math.pow(SPEED_FACTOR, lvl)));

type MatchOutcome = 'win' | 'lose' | 'draw';
type MatchSummary = { outcome: MatchOutcome; reason?: string } | null;

const cloneStageForNetwork = (stage: StageType): StageType =>
  stage.map(row => row.map(cell => [cell[0], cell[1]] as StageCell));

const createGarbageRow = (width: number, hole: number): StageCell[] =>
  Array.from({ length: width }, (_, x) => (x === hole ? [0, 'clear'] : ['garbage', 'merged'])) as StageCell[];

const computeGarbageFromLines = (lines: number): number => {
  if (lines === 2) return 1;
  if (lines === 3) return 2;
  if (lines >= 4) return 3;
  return 0;
};

const isPerfectClearBoard = (stage: StageType): boolean =>
  stage.every(row => row.every(([value]) =>
    value === 0 || value === '0' || (typeof value === 'string' && value.startsWith('ghost'))
  ));

const Versus: React.FC = () => {
  const navigate = useNavigate();
  const [meId, setMeId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  // Your (Right side) board state
  const [player, updatePlayerPos, resetPlayer, playerRotate, hold, canHold, nextFour, holdSwap, clearHold, setQueueSeed, pushQueue] = usePlayer();
  const [stage, setStage, rowsCleared] = useStage(player);
  const [, , rows, setRows, level, setLevel] = useGameStatus();
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [locking, setLocking] = useState(false);
  const [hasHeld, setHasHeld] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  const [pendingGarbageLeft, setPendingGarbageLeft] = useState(0);
  const [matchResult, setMatchResult] = useState<MatchSummary>(null);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const matchTimer = useRef<number | null>(null);
  useEffect(() => { wrapperRef.current?.focus(); }, []);

  // Opponent (Left side) board state - using separate simple state
  const [oppStage, setOppStage] = useState<any[][]>(() => createStage());
  const [oppGameOver, setOppGameOver] = useState(false);
  const [netOppStage, setNetOppStage] = useState<any[][] | null>(null);
  const [oppHold, setOppHold] = useState<any>(null);
  const [oppNextFour, setOppNextFour] = useState<any[]>([]);
  const [garbageToSend, setGarbageToSend] = useState(0);
  const stageRef = useRef<StageType>(stage);
  useEffect(() => { stageRef.current = stage; }, [stage]);

  const pendingGarbageRef = useRef(0);
  useEffect(() => { pendingGarbageRef.current = pendingGarbageLeft; }, [pendingGarbageLeft]);

  const lastLockInfoRef = useRef<{ pending: boolean; tspin: boolean; lines: number }>({ pending: false, tspin: false, lines: 0 });

  const applyGarbageRows = useCallback((count: number) => {
    if (count <= 0) return;
    setStage(prev => {
      if (!prev.length) return prev;
      const width = prev[0].length;
      const cloned = prev.map(row => row.map(cell => [cell[0], cell[1]] as StageCell));
      for (let i = 0; i < count; i++) {
        const hole = Math.floor(Math.random() * width);
        cloned.shift();
        cloned.push(createGarbageRow(width, hole));
      }
      return cloned as StageType;
    });
  }, [setStage]);

  // --- Core Game Logic ---
  const startGame = useCallback(() => {
    setStage(createStage());
    setDropTime(getFallSpeed(0));
    setGameOver(false);
    setRows(0);
    setLevel(0);
    setElapsedMs(0);
    setTimerOn(true);
    clearHold();
    setHasHeld(false);
    setLocking(false);
  setPendingGarbageLeft(0);
  pendingGarbageRef.current = 0;
  setGarbageToSend(0);
  setMatchResult(null);
  lastLockInfoRef.current = { pending: false, tspin: false, lines: 0 };

    setOppStage(createStage());
    setOppGameOver(false);
    setNetOppStage(null);
    
    // Ensure first piece spawns
    resetPlayer();
    
    pieceCountRef.current = 0;
    if (roomId) {
      setTimeout(() => socket.emit('game:requestNext', roomId, 7), 300);
    }
  }, [roomId, clearHold, setLevel, setRows, setStage, resetPlayer, setMatchResult]);

  const startGameRef = useRef(startGame);
  useEffect(() => {
    startGameRef.current = startGame;
  });

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;
  
    if (countdown <= 0) {
      startGameRef.current(); 
      setCountdown(null);
      return;
    }
  
    const timerId = setTimeout(() => {
      setCountdown(c => (c ? c - 1 : null));
    }, 1000);
  
    return () => clearTimeout(timerId);
  }, [countdown]);

  // --- Socket Listeners ---
  useEffect(() => {
    const stopMatchmaking = () => {
      if (matchTimer.current) {
        clearInterval(matchTimer.current);
        matchTimer.current = null;
      }
    };

    const run = async () => {
      try {
        setDebugInfo(prev => [...prev, "Fetching IP..."]);
        const res = await fetch(`${SERVER_URL}/whoami`);
        const data = await res.json();
        const ip = (data?.ip as string) || socket.id || 'me';
        setMeId(ip);
        setDebugInfo(prev => [...prev, `Got IP: ${ip}`]);
        const elo = 1000;
        socket.emit('ranked:enter', ip, elo);
        socket.emit('ranked:match', ip, elo);
        setDebugInfo(prev => [...prev, "Matchmaking started"]);
        
        matchTimer.current = window.setInterval(() => {
          socket.emit('ranked:match', ip, elo);
        }, 2000);

      } catch (error) {
        console.error("Failed to start matchmaking:", error);
        setDebugInfo(prev => [...prev, `Error: ${error}`]);
      }
    };
    run();

    const onFound = (payload: any) => {
      stopMatchmaking();
      setRoomId(payload.roomId);
      setOpponentId(payload.opponent);
    };
    socket.on('ranked:found', onFound);

    const onGameStart = (payload?: any) => {
      stopMatchmaking();
      // Shield: Only start countdown if we are actually waiting for one.
      if (waiting) {
        if (payload?.roomId) setRoomId(payload.roomId);
        if (payload?.next && Array.isArray(payload.next)) {
            setQueueSeed(payload.next);
            setOppNextFour(payload.next.slice(0, 4));
        }
        setNetOppStage(null);
        setWaiting(false);
        setCountdown(3);
      }
    };
    socket.on('game:start', onGameStart);

    const onGameNext = (arr: any) => {
      if (Array.isArray(arr) && arr.length) {
        pushQueue(arr as any); 
        setOppNextFour((prev: any[]) => [...prev.slice(arr.length), ...arr].slice(0, 4));
      }
    };
    socket.on('game:next', onGameNext);

    const onGameOver = (data: any) => {
      const winner = data?.winner ?? null;
      const reason = data?.reason;
      setTimerOn(false);
      setDropTime(null);
      if (winner === socket.id) {
        setOppGameOver(true);
        setMatchResult({ outcome: 'win', reason });
      } else if (winner) {
        setGameOver(true);
        setMatchResult({ outcome: 'lose', reason });
      } else {
        setGameOver(true);
        setOppGameOver(true);
        setMatchResult({ outcome: 'draw', reason });
      }
    };
    socket.on('game:over', onGameOver);

    const onGarbage = (g: number) => {
      setPendingGarbageLeft((prev: number) => prev + (g || 0));
    };
    socket.on('game:garbage', onGarbage);
    
    const onGameState = (data: any) => {
      if (data && Array.isArray(data.matrix)) {
        const incoming = (data.matrix as StageType).map(row =>
          Array.isArray(row) ? row.map(cell => {
            if (Array.isArray(cell) && cell.length >= 2) {
              return [cell[0], cell[1]] as StageCell;
            }
            return [0, 'clear'] as StageCell;
          }) : row
        ) as StageType;
        setOppStage(incoming);
        setNetOppStage(incoming);
      }
      if (data && data.hold !== undefined) {
        setOppHold(data.hold);
      }
      if (data && Array.isArray(data.next)) {
        setOppNextFour(data.next.slice(0, 4));
      }
    };
    socket.on('game:state', onGameState);

    return () => {
      stopMatchmaking();
      socket.off('ranked:found', onFound);
      socket.off('game:start', onGameStart);
      socket.off('game:next', onGameNext);
      socket.off('game:over', onGameOver);
      socket.off('game:garbage', onGarbage);
      socket.off('game:state', onGameState);
    };
  }, [meId, waiting]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (meId) socket.emit('ranked:leave', meId);
    };
  }, [meId]);

  // ... (rest of the component logic: controls, gravity, etc.)
  // This part is extensive but assumed to be functionally correct for gameplay.
  // The provided code will be inserted here without changes.
  const pieceCountRef = useRef(0);

    const hardDrop = () => {
        if (gameOver || countdown !== null || matchResult !== null) return;
        let dropDistance = 0;
        while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) dropDistance += 1;
        updatePlayerPos({ x: 0, y: dropDistance, collided: true });
        setLocking(true);
      };
    
      const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (gameOver || countdown !== null || matchResult !== null) return;
        if ([32, 37, 38, 39, 40, 16, 67].includes(e.keyCode)) e.preventDefault();
      
        const { keyCode } = e;
        if (keyCode === 37 || keyCode === 39) { // Left / Right
          const dir = keyCode === 37 ? -1 : 1;
          if (!checkCollision(player, stage, { x: dir, y: 0 })) {
            updatePlayerPos({ x: dir, y: 0, collided: false });

          }
        } else if (keyCode === 40) { // Down
          if (!checkCollision(player, stage, { x: 0, y: 1 })) {
            updatePlayerPos({ x: 0, y: 1, collided: false });
          }
        } else if (keyCode === 38) { // Up (Rotate)
            playerRotate(stage, 1);
        } else if (keyCode === 32) { // Space (Hard Drop)
          hardDrop();
        } else if (keyCode === 67) { // C (Hold)
          if (!hasHeld && canHold) {
            holdSwap();
            setHasHeld(true);
          }
        }
      };

    const handleKeyUp = (_e: React.KeyboardEvent<HTMLDivElement>) => {
        // Placeholder for key release logic if needed
    };

    useInterval(() => { // Gravity
        if (gameOver || locking || countdown !== null || matchResult !== null) return;
        if (!checkCollision(player, stage, { x: 0, y: 1 })) {
          updatePlayerPos({ x: 0, y: 1, collided: false });
        } else {
          setLocking(true);
        }
      }, dropTime);


    useEffect(() => {
        if (locking) {
            updatePlayerPos({x: 0, y: 0, collided: true});
        }
    }, [locking, updatePlayerPos]);
    
    useEffect(() => {
        if (!player.collided) return;
        lastLockInfoRef.current = {
          pending: true,
          tspin: player.type === 'T' && isTSpin(player as any, stageRef.current as any),
          lines: 0,
        };
    }, [player.collided, player.type]);

    useEffect(() => {
        if(player.collided) {
            setLocking(false);
            if (isGameOverFromBuffer(stage)) {
                setGameOver(true);
                setDropTime(null);
                setTimerOn(false);
                if (roomId) socket.emit('game:topout', roomId);
                return;
            }
            resetPlayer();
            setHasHeld(false);
            setDropTime(getFallSpeed(level)); // Resume gravity after piece locks
            pieceCountRef.current += 1;
            if (roomId && pieceCountRef.current % 7 === 0) {
              socket.emit('game:requestNext', roomId, 7);
            }
        }
    }, [player, resetPlayer, stage, roomId, level]);

    useEffect(() => {
        if (rowsCleared > 0) {
            setRows(prev => prev + rowsCleared);
            if (lastLockInfoRef.current.pending) {
              lastLockInfoRef.current.lines = rowsCleared;
            }
        }
    }, [rowsCleared, setRows]);

    useEffect(() => {
        if (player.collided) return;
        const info = lastLockInfoRef.current;
        if (!info.pending) return;
        if (matchResult !== null) {
          lastLockInfoRef.current = { pending: false, tspin: false, lines: 0 };
          return;
        }

        const lines = info.lines;
        const tspin = lines > 0 && info.tspin;
        const pc = lines > 0 && isPerfectClearBoard(stageRef.current);

        if (roomId) {
          socket.emit('game:lock', roomId, { lines, tspin, pc });
        }

        if (lines > 0) {
          setGarbageToSend(prev => prev + computeGarbageFromLines(lines));
        }

        let leftover = pendingGarbageRef.current;
        if (lines > 0) {
          leftover = Math.max(0, leftover - lines);
        }
        if (leftover > 0) {
          applyGarbageRows(leftover);
        }
        setPendingGarbageLeft(leftover);
        pendingGarbageRef.current = leftover;

        lastLockInfoRef.current = { pending: false, tspin: false, lines: 0 };
    }, [player.collided, roomId, applyGarbageRows, matchResult]);

  // Send your state to opponent
  useEffect(() => {
    if (!roomId || waiting) return;
    const gameState = {
      matrix: cloneStageForNetwork(stage),
      hold,
      next: nextFour
    };
    socket.emit('game:state', roomId, gameState);
  }, [stage, hold, nextFour, roomId, waiting]);

  // Timer for elapsed time
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

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{ 
        width: '100vw',
        height: '100vh',
        background: `url('/img/bg.jpg') center/cover, #000`,
        overflow: 'hidden',
        display: 'grid', 
        placeItems: 'center' 
      }}
    >
      <button
        onClick={() => {
          if (roomId && matchResult === null) {
            socket.emit('game:topout', roomId);
          }
          if (meId) socket.emit('ranked:leave', meId);
          navigate('/');
        }}
        style={{ position: 'fixed', top: 12, left: 12, zIndex: 999, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}
      >
        ← Thoát
      </button>
      {waiting && !roomId ? (
        <div style={{ color: '#fff', fontSize: 20, textAlign: 'center', padding: 20 }}>
          <div>🔍 Đang tìm trận...</div>
          <div style={{ fontSize: 12, marginTop: 10, opacity: 0.7 }}>
            <div>SERVER_URL: {SERVER_URL}</div>
            <div>Socket connected: {socket.connected ? '✅ Yes' : '❌ No'}</div>
            <div>Me ID: {meId || 'Loading...'}</div>
            {debugInfo.length > 0 && debugInfo.map((info, i) => (
              <div key={i}>• {info}</div>
            ))}
          </div>
          <div style={{ marginTop: 20, fontSize: 14, color: '#aaa' }}>
            💡 Đang kết nối đến server và tìm đối thủ...
          </div>
        </div>
      ) : roomId && waiting ? (
        <div style={{ color: '#fff', fontSize: 20, textAlign: 'center', padding: 20 }}>
          <div>🎮 Đã tìm thấy trận!</div>
          <div style={{ fontSize: 14, marginTop: 10, color: '#aaa' }}>
            Đang chuẩn bị trận đấu với {opponentId}...
          </div>
        </div>
      ) : countdown !== null ? (
        // Show countdown during game start
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(1px)', color: '#fff', fontSize: 80, fontWeight: 800, textShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
          {countdown}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'start' }}>
          {/* Left side: OPPONENT */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', alignItems: 'start', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1', color: '#fff', marginBottom: 4, fontWeight: 700 }}>{opponentId ? `Đối thủ: ${opponentId}` : 'Đối thủ'}</div>
            <HoldPanel hold={oppHold} />
            <Stage stage={(netOppStage as any) ?? oppStage} />
            <div style={{ display: 'grid', gap: 12 }}>
              {countdown === null && <NextPanel queue={oppNextFour as any} />}
              <div style={{ background: 'rgba(20,20,22,0.35)', padding: 8, borderRadius: 10, color: '#fff' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>OPP STATUS</div>
                <div>GameOver: {oppGameOver ? 'YES' : 'NO'}</div>
                <div>Hold: {oppHold ? oppHold.shape || 'None' : 'None'}</div>
              </div>
            </div>
          </div>
          {/* Right side: YOU */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', alignItems: 'start', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1', color: '#fff', marginBottom: 4, fontWeight: 700 }}>{meId ? `Bạn: ${meId}` : 'Bạn'}</div>
            <HoldPanel hold={hold as any} />
            <Stage stage={stage} />
            <div style={{ display: 'grid', gap: 12 }}>
              <NextPanel queue={nextFour as any} />
              <div style={{ background: 'rgba(20,20,22,0.35)', padding: 8, borderRadius: 10, color: '#fff' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>STATUS</div>
                <div>Rows: {rows}</div>
                <div>Level: {level}</div>
                <div>Time: {(elapsedMs/1000).toFixed(2)}s</div>
                <div>Incoming: {pendingGarbageLeft}</div>
                <div>Sent: {garbageToSend}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {matchResult && (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.55)', color: '#fff', textAlign: 'center', zIndex: 998 }}>
          <div style={{ background: 'rgba(20,20,22,0.8)', padding: '32px 48px', borderRadius: 16, boxShadow: '0 12px 32px rgba(0,0,0,0.45)', minWidth: 320 }}>
            <div style={{ fontSize: 42, fontWeight: 800, marginBottom: 12 }}>
              {matchResult.outcome === 'win' ? '🎉 Bạn đã thắng!' : matchResult.outcome === 'lose' ? '😢 Bạn đã thua' : '🤝 Hòa trận'}
            </div>
            {matchResult.reason && (
              <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 16 }}>Lý do: {matchResult.reason}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button
                onClick={() => {
                  if (meId) socket.emit('ranked:leave', meId);
                  navigate('/');
                }}
                style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                Trở về menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Versus;