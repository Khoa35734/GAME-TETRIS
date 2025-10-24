// File: client/src/components/singleplayer/Tetris.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStage, checkCollision } from '../../game/gamehelper';
// Styled Components
import { StyledTetris, StyledTetrisWrapper } from '../styles/StyledTetris'; // Sửa đường dẫn nếu cần

// Custom Hook mới
import { useSinglePlayerLogic } from './useSinglePlayerLogic';

// Components UI con (Giả sử bạn đã tạo các file này)
import Stage from '../Stage';
// import StartButton from '../StartButton';
import { HoldPanel, NextPanel } from '../SidePanels';
import { OverlayCountdown } from './ui/OverlayCountdown';
import { GameOverOverlay } from './ui/GameOverOverlay';
import { WinOverlay } from './ui/WinOverlay';
import { StatusPanel } from './ui/StatusPanel';

// Constants (Import từ file constants)
// import { MAX_LEVEL } from './constants'; // Chỉ cần MAX_LEVEL nếu dùng trong UI
import { getFallSpeed } from './getFallSpeed'; // Import getFallSpeed nếu cần

// --- Vị trí Panel --- (Có thể đưa vào constants.ts hoặc file riêng)
const PANEL_WIDTH = 120;
const PANEL_OFFSET_Y = -8;
const SIDE_GAP = 14;
const HOLD_OFFSET_X = PANEL_WIDTH + SIDE_GAP;
const NEXT_OFFSET_X = PANEL_WIDTH + SIDE_GAP;
const BOARD_SHIFT_X = 0;
const BOARD_SHIFT_Y = -30;
const HOLD_SHIFT_X = 30;
const HOLD_SHIFT_Y = 0;
const NEXT_SHIFT_X = 50;
const NEXT_SHIFT_Y = 0;


const Tetris: React.FC = () => {
  const navigate = useNavigate();
  const overlayTimeoutRef = useRef<number | null>(null); // Để theo dõi timeout hiện overlay
  // Load settings (Có thể đưa vào context nếu dùng nhiều nơi)
  const [gameSettings] = useState<GameSettings>(() => { // Thêm kiểu dữ liệu
    const saved = localStorage.getItem('tetris:singleSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate parsed settings here if needed
        return {
          linesToClear: parsed.linesToClear || 40,
          showGhost: parsed.showGhost !== false, // default true
          enableHardDrop: parsed.enableHardDrop !== false, // default true
          showNext: parsed.showNext !== false, // default true
          showHold: parsed.showHold !== false, // default true
        };
      } catch { /* return default below */ }
    }
    return {
      linesToClear: 40, showGhost: true, enableHardDrop: true, showNext: true, showHold: true,
    };
  });

  // State đếm ngược (UI state)
  const [countdown, setCountdown] = useState<number | null>(3);
// const softDropTimeoutRef = useRef<number | null>(null);

  // Gọi custom hook
  const {
    stage, player, hold, nextFour, gameOver, startGameOverSequence, win,
    rows, level, elapsedMs, piecesPlaced, inputs, holds,
    // gameSettings đã có ở trên
    startGame: startGameLogic, movePlayer, rotatePlayer, hardDrop, holdPiece,
    setMoveIntent, setDropTime, updatePlayerPos, setIsSoftDropping,
  } = useSinglePlayerLogic(gameSettings);

  // State và ref cho whiteout animation (UI state)
  const [showGameOverOverlay, setShowGameOverOverlay] = useState(false);
  const whiteoutRaf = useRef<number | null>(null);
  const [animatedStage, setAnimatedStage] = useState(() => createStage()); // Stage riêng cho animation

  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => { wrapperRef.current?.focus(); }, []);

  // Hàm startGame giờ chỉ reset countdown và UI state liên quan
  // Code MỚI ĐÃ SỬA
// Code MỚI ĐÃ SỬA
// Code MỚI ĐÃ SỬA
const startGame = useCallback(() => {
    console.log("[UI] startGame called (Resets UI & starts countdown)");

    // 1. GỌI HÀM RESET LOGIC TỪ HOOK
    startGameLogic();

    // 2. Reset các state UI
    setShowGameOverOverlay(false);

    // 3. 🛑 DỌN DẸP TẤT CẢ TIMER/ANIMATION CŨ
    if (whiteoutRaf.current) cancelAnimationFrame(whiteoutRaf.current);
    if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current); // Hủy timeout cũ
        overlayTimeoutRef.current = null;
    }

    // 4. Bắt đầu countdown
    setCountdown(3);

}, [
    startGameLogic, 
    setShowGameOverOverlay, 
    setCountdown
]); // Thêm startGameLogic làm dependency // Không cần dependencies phức tạp nữa, vì chỉ reset UI state cục bộ // Thêm dependencies

  // Effect đếm ngược -> gọi startGameLogic
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      console.log("[UI] Countdown finished, calling startGameLogic from hook");
      startGameLogic();
      wrapperRef.current?.focus(); // Gọi logic bắt đầu game từ hook
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c ? c - 1 : null), 1000);
    return () => clearTimeout(t);
  }, [countdown, startGameLogic]); // Phụ thuộc vào startGameLogic

  // Effect cho whiteout animation (dựa trên startGameOverSequence từ hook)
  useEffect(() => {
    if (!startGameOverSequence) {
        // Nếu game chưa bắt đầu sequence game over, đồng bộ stage animation với stage logic
        setAnimatedStage(stage);
        // Đảm bảo overlay bị ẩn
        setShowGameOverOverlay(false);
        return;
    }

    // Chỉ chạy animation khi startGameOverSequence là true và chưa hiện overlay
    if (startGameOverSequence && !showGameOverOverlay && !win) { // Thêm check !win
        console.log("[UI] Starting whiteout animation");
        const duration = 1000;
        const height = stage.length;
        const start = performance.now();
        const initialStage = stage; // Stage tại thời điểm bắt đầu sequence

        const animate = (t: number) => {
            const elapsed = t - start;
            const p = Math.min(1, elapsed / duration);
            const rowsToWhite = Math.floor(p * height);

            const currentAnimatedStage = initialStage.map((r, y) => {
                const rowIdxFromBottom = height - 1 - y;
                if (rowIdxFromBottom < rowsToWhite) {
                    return r.map(cell => (cell[0] !== 0 ? ['W', 'merged'] : [0, 'clear']));
                }
                return r;
            });

            setAnimatedStage(currentAnimatedStage as any);

            if (p < 1) {
                whiteoutRaf.current = requestAnimationFrame(animate);
            } else {
                console.log("[UI] Whiteout animation complete, showing overlay soon");
                // Animation complete, show overlay sau một chút
                if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
                overlayTimeoutRef.current = window.setTimeout(() => { 
                    console.log("[UI] Showing Game Over Overlay");
                    setShowGameOverOverlay(true);
                    overlayTimeoutRef.current = null;
                 }, 200);
            }
        };

        whiteoutRaf.current = requestAnimationFrame(animate);
    }

    // Cleanup animation frame
    return () => {
        if (whiteoutRaf.current) cancelAnimationFrame(whiteoutRaf.current);
        if (overlayTimeoutRef.current) {
            clearTimeout(overlayTimeoutRef.current);
            overlayTimeoutRef.current = null;
        }
    };
}, [startGameOverSequence, stage, showGameOverOverlay, win]); // Thêm win vào dependency

// Cập nhật animatedStage khi stage logic thay đổi (trừ khi đang trong sequence game over)
useEffect(() => {
    if (!startGameOverSequence) {
        setAnimatedStage(stage);
    }
}, [stage, startGameOverSequence]);


  // --- Xử lý Input (gọi actions từ hook) ---
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>): void => {
    // Không nhận input khi đang countdown, game over, win, hoặc đang trong sequence
    if (countdown !== null || gameOver || win || startGameOverSequence) return;

    if ([32, 37, 38, 39, 40, 16].includes(e.keyCode)) { // Mã phím cho Space, Arrows, Shift
      e.preventDefault(); e.stopPropagation();
    }
    const { keyCode } = e;

    if (keyCode === 37 || keyCode === 39) { 
// Left / Right
      const dir = keyCode === 37 ? -1 : 1;
      setMoveIntent(prev => {
        if (!prev || prev.dir !== dir) {
      return { dir, startTime: Date.now(), dasCharged: false, movedInitial: false };
    }
        return prev; // Giữ nguyên nếu đã nhấn giữ cùng hướng
      });
    } else if (keyCode === 40) {
      setIsSoftDropping(true); // ↓ Soft Drop
  // Tạm dừng gravity để người chơi tự điều khiển
  setDropTime(50);

  // const canMoveDown = !checkCollision(player, stage, { x: 0, y: 1 });

//   if (canMoveDown) {
//     // ✅ Nếu còn chỗ, rơi nhanh xuống 1 ô
//     updatePlayerPos({ x: 0, y: 1, collided: false });
//   } else {
//     // ✅ Nếu chạm đất, không rơi nữa nhưng không lock ngay
//     if (!softDropTimeoutRef.current) {
//       softDropTimeoutRef.current = window.setTimeout(() => {
//         // Sau 1 giây mới lock lại (nếu vẫn chạm)
//         updatePlayerPos({ x: 0, y: 0, collided: true });
//         softDropTimeoutRef.current = null;
//       }, 1000); // 🕐 delay 1 giây
//     }
//   }
} else if (keyCode === 38) { // Up (Rotate)
      rotatePlayer(); // Gọi action từ hook
    } else if (keyCode === 32) { // Space (Hard Drop)
      hardDrop(); // Gọi action từ hook
    } else if (keyCode === 16) { // Shift (Hold)
      holdPiece(); // Gọi action từ hook
    }
  }, [countdown, gameOver, win, startGameOverSequence, movePlayer, rotatePlayer, hardDrop, holdPiece, setMoveIntent, setDropTime, setIsSoftDropping]); // Thêm dependencies

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLDivElement>): void => {
    // Không xử lý keyUp nếu game đã kết thúc hoặc đang countdown
    if (countdown !== null || gameOver || win || startGameOverSequence) return;
    const { keyCode } = e;
    if (keyCode === 37 || keyCode === 39) { // Left / Right release
      setMoveIntent(null); // Dừng DAS/ARR
    } else if (keyCode === 40) { // Down release
      // Bật lại gravity (hook sẽ tự xử lý nếu đang chạm đất)
      setDropTime(getFallSpeed(level));
      setIsSoftDropping(false);
    }
  }, [countdown, gameOver, win, startGameOverSequence, setMoveIntent, setDropTime, level, getFallSpeed, setIsSoftDropping]); // Thêm dependencies


  // --- RENDER UI ---
  return (
    <StyledTetrisWrapper
      ref={wrapperRef}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{
        background: `url('/img/bg2.gif') center/cover, #000`, // Giữ lại background
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Nút Thoát */}
      <button onClick={() => navigate('/')} style={{ position: 'fixed', top: 12, left: 12, zIndex: 999, /* ... */ }}>
        ← Thoát
      </button>

      {/* Layout chính */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", /* ... */ }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", /* ... */ }}>
          {/* BOARD và các panel bên cạnh */}
          <div style={{ position: "relative" }}>
            <StyledTetris>
              <div style={{ transform: `translate(${BOARD_SHIFT_X}px, ${BOARD_SHIFT_Y}px)` }}>
                <Stage
                  // Sử dụng animatedStage để hiển thị whiteout
                  stage={countdown !== null ? createStage() : animatedStage}
                  showGhost={gameSettings.showGhost}
                  player={player} // Truyền player để Stage vẽ ghost piece
                />
              </div>
            </StyledTetris>

            {/* HOLD Panel */}
            {gameSettings.showHold && (
              <HoldPanel hold={hold} style={{
                position: "absolute",
                top: PANEL_OFFSET_Y + HOLD_SHIFT_Y,
                left: -HOLD_OFFSET_X + HOLD_SHIFT_X,
                 width: PANEL_WIDTH,
                 /* ... */
               }} />
            )}

            {/* NEXT + STATS Panel */}
            <div style={{
              position: "absolute",
              top: PANEL_OFFSET_Y + NEXT_SHIFT_Y,
              right: -NEXT_OFFSET_X + NEXT_SHIFT_X,
              width: PANEL_WIDTH,
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              {gameSettings.showNext && (
                <NextPanel queue={nextFour} style={{ /* ... */ }} />
              )}
              {/* Status Panel (Component mới) */}
              <StatusPanel
                rows={rows}
                level={level}
                elapsedMs={elapsedMs}
                piecesPlaced={piecesPlaced}
                inputs={inputs}
                holds={holds}
                linesToClear={gameSettings.linesToClear}
                style={{ /* ... */ }} // Thêm style nếu cần
              />
              {/* Start Button (chỉ hiện khi chưa bắt đầu hoặc đã kết thúc) */}
               {/* {(showGameOverOverlay || win || (countdown === null && !gameOver && !startGameOverSequence)) && (
                   <div style={{ marginTop: 4 }}>
                      <StartButton callback={startGame} />
                   </div>
               )} */}
            </div>
          </div>
        </div>
      </div>

      {/* Countdown Overlay */}
      {countdown !== null && <OverlayCountdown countdown={countdown} />}

      {/* Win Overlay */}
      {win && (
          <WinOverlay
              elapsedMs={elapsedMs} rows={rows} level={level}
              piecesPlaced={piecesPlaced} inputs={inputs} holds={holds}
              onPlayAgain={startGame} // Gọi hàm startGame của component
              onMenu={() => navigate('/')}
          />
      )}

      {/* Game Over Overlay (chỉ hiện khi animation xong) */}
      {showGameOverOverlay && (
          <GameOverOverlay
              elapsedMs={elapsedMs} rows={rows} level={level}
              piecesPlaced={piecesPlaced} inputs={inputs} holds={holds}
              onTryAgain={startGame} // Gọi hàm startGame của component
              onMenu={() => navigate('/')}
          />
      )}
    </StyledTetrisWrapper>
  );
};

// Kiểu dữ liệu GameSettings (nếu chưa có)
interface GameSettings {
    linesToClear: number;
    showGhost: boolean;
    enableHardDrop: boolean;
    showNext: boolean;
    showHold: boolean;
}


export default Tetris;