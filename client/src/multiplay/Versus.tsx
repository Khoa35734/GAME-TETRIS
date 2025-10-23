import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTetrisGame } from './useTetrisGame';
import { useTetrisInput } from './useTetrisInput';
import { useMatchConnection } from './useMatchConnection';
import Stage from '../components/Stage';
import { HoldPanel, NextPanel } from '../components/SidePanels';
import GarbageQueueBar from '../components/GarbageQueueBar';

/**
 * ============================================
 * ⚔️ Versus Component
 * ============================================
 * - Kết nối logic game + mạng + input
 * - Render UI đầy đủ 2 bảng đấu
 */
const Versus: React.FC = () => {
  const { roomId = '' } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const {
    opponentStage,
    opponentHold,
    opponentNextQueue,
    opponentName,
    countdown,
    matchResult,
    seriesScore,
    pendingGarbage,
    setPendingGarbage,
    sendMyBoardUpdate,
    sendGarbageAttack,
    sendTopout,
  } = useMatchConnection(roomId);

  const {
    myStage,
    myPlayer,
    myHold,
    myNextQueue,
    gameStats,
    isGrounded,
    locking,
    canHold,
    updatePlayerPos,
    setPlayer,
    holdSwap,
    startGroundTimers,
    onGroundAction,
    forceApplyGarbage,
    gameOver,
  } = useTetrisGame({
    onLinesCleared: sendGarbageAttack,
    onBoardChange: sendMyBoardUpdate,
    onGameOver: sendTopout,
  });

  const { handleKeyDown, handleKeyUp } = useTetrisInput({
    player: myPlayer,
    stage: myStage,
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
    setLocking: () => {},
  });

  // Khi có rác pending thì áp dụng
  useEffect(() => {
    if (pendingGarbage > 0) {
      forceApplyGarbage(pendingGarbage);
      setPendingGarbage(0);
    }
  }, [pendingGarbage, forceApplyGarbage, setPendingGarbage]);

  // Khi game over thì tự động gửi topout
  useEffect(() => {
    if (gameOver) sendTopout('lockout');
  }, [gameOver, sendTopout]);

  // Countdown
  const [displayCountdown, setDisplayCountdown] = useState<number | null>(null);
  useEffect(() => {
    if (countdown === null) return;
    setDisplayCountdown(countdown);
    if (countdown > 0) {
      const t = setTimeout(() => setDisplayCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  // Khi trận đấu kết thúc BO3
  useEffect(() => {
    if (matchResult?.outcome === 'win') {
      alert('🎉 Bạn đã thắng trận!');
    } else if (matchResult?.outcome === 'lose') {
      alert('💀 Bạn đã thua trận!');
    }
  }, [matchResult]);

  return (
    <div
      className="versus-container"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        color: '#fff',
        padding: 16,
      }}
    >
      {/* Header - Series Score */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, opacity: 0.8 }}>
          Best of 3 · Game {seriesScore.me + seriesScore.opponent + 1}
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, marginTop: 4 }}>
          {seriesScore.me} - {seriesScore.opponent}
        </div>
      </div>

      {displayCountdown !== null && displayCountdown > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '45%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 80,
            fontWeight: 900,
            color: '#4ecdc4',
            textShadow: '0 0 20px rgba(78,205,196,0.8)',
          }}
        >
          {displayCountdown}
        </div>
      )}

      {/* Game boards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 40,
          alignItems: 'start',
        }}
      >
        {/* Left - Your Board */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: '#4ecdc4', marginBottom: 8 }}>
            Bạn
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <HoldPanel hold={myHold as any} />
            <div
              style={{
                border: '4px solid #4ecdc4',
                borderRadius: '8px',
                padding: '4px',
                boxShadow: '0 0 20px rgba(78,205,196,0.4)',
              }}
            >
              <Stage stage={myStage} />
            </div>
            <GarbageQueueBar count={pendingGarbage} />
          </div>
          <NextPanel queue={myNextQueue as any} />
          <div style={{ marginTop: 8, fontSize: 13, color: '#aaa' }}>
            Rows: {gameStats.rows} · Combo: {gameStats.combo} · B2B: {gameStats.b2b}
          </div>
        </div>

        {/* VS separator */}
        <div
          style={{
            fontWeight: 800,
            fontSize: 32,
            color: '#999',
            alignSelf: 'center',
          }}
        >
          VS
        </div>

        {/* Right - Opponent Board */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: '#ff6b6b', marginBottom: 8 }}>
            {opponentName || 'Đối thủ'}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <HoldPanel hold={opponentHold as any} />
            <div
              style={{
                border: '4px solid #ff6b6b',
                borderRadius: '8px',
                padding: '4px',
                boxShadow: '0 0 20px rgba(255,107,107,0.4)',
              }}
            >
              <Stage stage={opponentStage} />
            </div>
            <GarbageQueueBar count={0} />
          </div>
          <NextPanel queue={opponentNextQueue as any} />
        </div>
      </div>
    </div>
  );
};

export default Versus;
