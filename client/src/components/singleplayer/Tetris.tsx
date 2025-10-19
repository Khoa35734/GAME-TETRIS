import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { StyledTetris, StyledTetrisWrapper } from '../styles/StyledTetris';
import Stage from '../Stage';
import StartButton from '../StartButton';
import { HoldPanel, NextPanel } from '../SidePanels';

import { useSinglePlayerLogic } from './useSinglePlayerLogic';
import { BOARD_SHIFT_X, BOARD_SHIFT_Y, PANEL_WIDTH, PANEL_OFFSET_Y } from './constants';
import { HOLD_OFFSET_X, NEXT_OFFSET_X, HOLD_SHIFT_X, HOLD_SHIFT_Y, NEXT_SHIFT_X, NEXT_SHIFT_Y } from './panelPositions';
import { StatusPanel } from './ui/StatusPanel';
import { OverlayCountdown } from './ui/OverlayCountdown';
import { WinOverlay } from './ui/WinOverlay';
import { GameOverOverlay } from './ui/GameOverOverlay';
import { createStage } from '../../gamehelper';
import socket from '../../socket';

const Tetris: React.FC = () => {
  const navigate = useNavigate();
  const logic = useSinglePlayerLogic();

  const {
    wrapperRef,
    handleKeyDown,
    handleKeyUp,
    stage,
    gameSettings,
    hold,
    nextFour,
    rows,
    level,
    elapsedMs,
    piecesPlaced,
    inputs,
    holds,
    countdown,
    timerOn,
    gameOver,
    showGameOverOverlay,
    win,
    startGame,
    onWinPlayAgain,
    onGameOverTryAgain,
  } = logic;

  // Update presence when entering/leaving singleplayer
  useEffect(() => {
    socket.emit('presence:update', { status: 'in_game', mode: 'single' });
    return () => {
      socket.emit('presence:update', { status: 'online' });
    };
  }, []);

  return (
    <StyledTetrisWrapper
      ref={wrapperRef}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{ background: "url('/img/bg2.gif') center/cover, #000", backgroundAttachment: 'fixed' }}
    >
      <button onClick={() => navigate('/')} style={{ position: 'fixed', top: 12, left: 12, zIndex: 999, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>← Thoát</button>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', width: '100vw', height: '100vh', paddingTop: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0, alignItems: 'center', background: 'rgba(255,255,255,0.0)', justifyItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <StyledTetris>
              <div style={{ transform: `translate(${BOARD_SHIFT_X}px, ${BOARD_SHIFT_Y}px)` }}>
                <Stage stage={countdown !== null ? createStage() : stage} showGhost={gameSettings.showGhost} />
              </div>
            </StyledTetris>

            {gameSettings.showHold && (
              <HoldPanel
                hold={hold}
                style={{ position: 'absolute', top: PANEL_OFFSET_Y + HOLD_SHIFT_Y, left: -HOLD_OFFSET_X + HOLD_SHIFT_X, width: PANEL_WIDTH, padding: 8, borderRadius: 10, background: 'rgba(20,20,22,0.35)', backdropFilter: 'blur(6px)' }}
              />
            )}

            <div style={{ position: 'absolute', top: PANEL_OFFSET_Y + NEXT_SHIFT_Y, right: -NEXT_OFFSET_X + NEXT_SHIFT_X, width: PANEL_WIDTH, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {gameSettings.showNext && (
                <NextPanel queue={nextFour} style={{ background: 'rgba(20,20,22,0.35)', padding: 8, borderRadius: 10 }} />
              )}
              <StatusPanel rows={rows} level={level} elapsedMs={elapsedMs} piecesPlaced={piecesPlaced} inputs={inputs} holds={holds} linesToClear={gameSettings.linesToClear} />
              {(gameOver || (countdown === null && !timerOn)) && (
                <div style={{ marginTop: 4 }}>
                  <StartButton callback={startGame} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <OverlayCountdown value={countdown} />

      <WinOverlay visible={win} elapsedMs={elapsedMs} rows={rows} level={level} piecesPlaced={piecesPlaced} inputs={inputs} holds={holds} onPlayAgain={onWinPlayAgain} onMenu={() => navigate('/')} />

      <GameOverOverlay visible={showGameOverOverlay} elapsedMs={elapsedMs} rows={rows} level={level} piecesPlaced={piecesPlaced} inputs={inputs} holds={holds} onTryAgain={onGameOverTryAgain} onMenu={() => navigate('/')} />
    </StyledTetrisWrapper>
  );
};

export default Tetris;
