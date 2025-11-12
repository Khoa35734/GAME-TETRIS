import React from 'react';
import { useParams } from 'react-router-dom';
import { useVersus } from './hooks/useVersus'; // 👈 IMPORT HOOK MỚI ĐÃ TÁI CẤU TRÚC

// Import các component UI (với đường dẫn đã sửa)
import Stage from '../Stage';
import { HoldPanel, NextPanel } from '../SidePanels';
import GarbageQueueBar from '../GarbageQueueBar'; // Giả sử file này cũng ở root components
import { ScoreUpdateOverlay } from './ScoreUpdateOverlay'; // 👈 IMPORT OVERLAY MỚI
import { RankResultOverlay } from './RankResultOverlay'; // ⭐ IMPORT RANK RESULT OVERLAY
import StatsPanel from './StatsPanel'; // 📊 Import Stats Panel

// Import tài nguyên (với đường dẫn đã sửa)
import bgImg from '../../../img/bg.jpg'; // 👈 ĐÃ SỬA ĐƯỜNG DẪN

// File này không còn chứa bất kỳ logic game, state, hay socket nào
// Nó chỉ nhận props từ hook `useVersusState` và render JSX

const Versus: React.FC = () => {
  // Lấy urlRoomId để truyền vào hook logic
  const { roomId: urlRoomId } = useParams<{ roomId?: string }>();
  
  // 🚪 State for exit confirmation
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);
  
  // ‼️ GỌI HOOK LOGIC: Lấy tất cả state và hàm xử lý
  const {
    wrapperRef,
    handleKeyDown,
    handleKeyUp,
    waiting,
    roomId,
    meId,
    debugInfo,
    isRtcReady,
    udpStatsRef,
    autoExitTimerRef,
    matchResult,
    roundResult, // 👈 THÊM ROUND RESULT
    autoExitCountdown,
    countdown,
    disconnectCountdown,
    playerName,
    player,
    stage,
    hold,
    nextFour,
    myFillWhiteProgress,
    incomingGarbage,
    elapsedMs, // ⏱️ Still needed for StatsPanel
    myPing,
    myStats,
    piecesPlaced, // 📊
    attacksSent, // 📊
    opponentName,
    opponentId,
    oppStage,
    netOppStage,
    oppHold,
    oppNextFour,
    oppFillWhiteProgress,
    opponentIncomingGarbage,
    // oppGameOver, oppPing - removed (not needed in UI)
    oppStats,
  oppPiecesPlaced,
  oppAttacksSent,
  oppElapsedMs,
    seriesScore,
    seriesBestOf,
    seriesWinsRequired,
    seriesCurrentGame,
    eloData, // ⭐ ELO data for rank result overlay
    matchMode, // ⭐ Match mode (ranked or casual)
    // sendTopout - removed (only used in forfeit handler)
    cleanupWebRTC,
    navigate,
    socket,
  } = useVersus(urlRoomId);

  // ‼️ Toàn bộ phần JSX (return) giữ nguyên 100%
  // (Đây là JSX từ file gốc của bạn)
  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{ 
        width: '100vw',
        height: '100vh',
        backgroundImage: `url(${bgImg})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#000',
        overflow: 'hidden',
        display: 'grid', 
        placeItems: 'center' 
      }}
    >
      <button
        onClick={() => {
          // Only show confirm if match is still in progress
          if (roomId && matchResult === null && !waiting) {
            setShowExitConfirm(true);
          } else {
            // Direct exit if not in active match
            if (meId) socket.emit('ranked:leave', meId);
            if (autoExitTimerRef.current) {
              clearInterval(autoExitTimerRef.current);
              autoExitTimerRef.current = null;
            }
            cleanupWebRTC('manual-exit');
            navigate('/?modes=1');
          }
        }}
        style={{ position: 'fixed', top: 12, left: 12, zIndex: 999, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}
      >
        ← Thoát
      </button>
      
      {/* 🚪 Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(30,30,35,0.98) 0%, rgba(20,20,25,0.98) 100%)',
            padding: '32px 40px',
            borderRadius: 16,
            border: '2px solid rgba(255, 107, 107, 0.5)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
            maxWidth: 480,
            textAlign: 'center',
            color: '#fff'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: '#ff6b6b' }}>
              XÁC NHẬN THOÁT TRẬN
            </div>
            <div style={{ fontSize: 15, marginBottom: 24, lineHeight: 1.6, color: '#ccc' }}>
              Nếu bạn thoát bây giờ, bạn sẽ <strong style={{ color: '#ff6b6b' }}>chấp nhận thua 0-2</strong>.
              <br />
              Bạn có chắc chắn muốn tiếp tục?
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button
                onClick={() => {
                  // Forfeit: emit special event to give opponent 2-0 win
                  console.log('🏳️ Player forfeited match');
                  socket.emit('match:forfeit', { roomId });
                  // DON'T navigate immediately - wait for server to emit bo3:match-end
                  // which will show the overlay to the opponent and then auto-exit
                  setShowExitConfirm(false);
                  if (meId) socket.emit('ranked:leave', meId);
                  if (autoExitTimerRef.current) {
                    clearInterval(autoExitTimerRef.current);
                    autoExitTimerRef.current = null;
                  }
                  cleanupWebRTC('forfeit');
                  // Delay navigation to allow server to broadcast result
                  setTimeout(() => {
                    navigate('/?modes=1');
                  }, 1000);
                }}
                style={{
                  padding: '12px 28px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(255,107,107,0.4)',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Có, thoát ngay (Thua 0-2)
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{
                  padding: '12px 28px',
                  borderRadius: 10,
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'transparent',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
              >
                Không, tiếp tục chơi
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ⚡ UDP CONNECTION STATUS INDICATOR */}
      {!waiting && (
        <div
          style={{
            position: 'fixed',
            top: 12,
            right: 12,
            zIndex: 999,
            background: isRtcReady ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 184, 0, 0.15)',
            border: `1px solid ${isRtcReady ? 'rgba(46, 213, 115, 0.4)' : 'rgba(255, 184, 0, 0.4)'}`,
            color: isRtcReady ? '#2ed573' : '#ffb800',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          title={`UDP Stats - Sent: ${udpStatsRef.current.sent} | Received: ${udpStatsRef.current.received} | Failed: ${udpStatsRef.current.failed} | Parse Errors: ${udpStatsRef.current.parseErrors}`}
        >
          <span style={{ fontSize: 14 }}>{isRtcReady ? '⚡' : '📶'}</span>
          {isRtcReady ? 'UDP Active' : 'TCP Mode'}
        </div>
      )}
      
      {matchResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 800,
            pointerEvents: 'none',
            color: '#fff',
            textAlign: 'center'
          }}
        >
          <div>
            <div style={{ fontSize: 56, fontWeight: 800, textShadow: '0 8px 30px rgba(0,0,0,0.5)', lineHeight: 1.2 }}>
              {matchResult.outcome === 'win' ? 'Bạn thắng!' : matchResult.outcome === 'lose' ? 'Bạn thua!' : 'Hòa trận!'}
            </div>
            {matchResult.reason && (
              <div style={{ marginTop: 12, fontSize: 18, opacity: 0.75 }}>
                Lý do: {matchResult.reason}
              </div>
            )}
            {autoExitCountdown !== null && (
              <div style={{ 
                marginTop: 24, 
                fontSize: 16, 
                opacity: 0.9,
                background: 'rgba(255, 107, 107, 0.2)',
                padding: '12px 24px',
                borderRadius: 8,
                border: '1px solid rgba(255, 107, 107, 0.4)'
              }}>
                ⏰ Tự động thoát sau: <span style={{ fontWeight: 700, fontSize: 20, color: autoExitCountdown <= 10 ? '#ff6b6b' : '#fff' }}>{autoExitCountdown}</span> giây
              </div>
            )}
          </div>
        </div>
      )}
      {waiting && !roomId ? (
        <div style={{ color: '#fff', fontSize: 20, textAlign: 'center', padding: 20 }}>
          <div>🔍 Đang tìm trận...</div>
          <div style={{ fontSize: 12, marginTop: 10, opacity: 0.7 }}>
            <div>Socket connected: {socket.connected ? '✅ Yes' : '❌ No'}</div>
            <div>Tên: {playerName || 'Đang tải...'}</div>
            <div>ID: {meId || 'Loading...'}</div>
            {debugInfo.length > 0 && debugInfo.map((info: string, i: number) => (
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
            Đang chuẩn bị trận đấu với {opponentName || opponentId || 'đối thủ'}...
          </div>
        </div>
      ) : countdown !== null ? (
        // Show countdown during game start
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(1px)', color: '#fff', fontSize: 80, fontWeight: 800, textShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
          {countdown}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start', position: 'relative' }}>
          
          {/* Disconnect countdown notification */}
          {disconnectCountdown !== null && disconnectCountdown > 0 && (
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
              background: 'rgba(255, 107, 107, 0.95)',
              color: 'white',
              padding: '24px 32px',
              borderRadius: '12px',
              border: '3px solid #ff5252',
              boxShadow: '0 8px 32px rgba(255, 107, 107, 0.5)',
              textAlign: 'center',
              fontSize: '18px',
              fontWeight: 'bold'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️ Đối phương đã thoát trận hoặc mất kết nối</div>
              <div>Trận đấu sẽ kết thúc trong <span style={{ fontSize: '32px', color: '#fff200' }}>{disconnectCountdown}</span> giây</div>
            </div>
          )}


          <div style={{ gridColumn: '1 / -1', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 32, color: '#fff' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 600, opacity: 0.8 }}>
                  {playerName || meId || 'Bạn'}
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
                  {seriesScore.me}
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.7 }}>
                VS
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 18, fontWeight: 600, opacity: 0.8 }}>
                  {opponentName || opponentId || 'Đối thủ'}
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
                  {seriesScore.opponent}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: '#bbb' }}>
              Best of {seriesBestOf} · First to {seriesWinsRequired} · Game {seriesCurrentGame}
            </div>
          </div>
          {/* Left side: YOU (ĐÃ ĐỔI - Board của bạn bên TRÁI với viền xanh lá) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', alignItems: 'start', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1', color: '#4ecdc4', marginBottom: 4, fontWeight: 700, fontSize: '1rem' }}>
              {playerName ? `🎮 Bạn: ${playerName}` : '🎮 Bạn'}
            </div>
            <HoldPanel hold={hold as any} />
            
            {/* Stage with Garbage Queue Bar beside it */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ 
                  border: '4px solid #4ecdc4', 
                  borderRadius: '8px',
                  boxShadow: '0 0 20px rgba(78, 205, 196, 0.5), inset 0 0 10px rgba(78, 205, 196, 0.1)',
                  padding: '4px',
                  background: 'transparent'
                }}>
                  <Stage stage={stage} fillWhiteProgress={myFillWhiteProgress} player={player} />
                </div>
                
                {/* Garbage Queue Bar - using the new component */}
                <GarbageQueueBar count={incomingGarbage} />
              </div>
            </div>
            
            <div style={{ display: 'grid', gap: 12 }}>
              <NextPanel queue={nextFour as any} />
              {/* 📊 Replaced STATUS with StatsPanel */}
              <StatsPanel 
                elapsedMs={elapsedMs} 
                piecesPlaced={piecesPlaced} 
                attacksSent={attacksSent} 
                side="left" 
              />
            </div>
          </div>

          {/* Right side: OPPONENT (ĐÃ ĐỔI - Board đối thủ bên PHẢI với viền đỏ) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', alignItems: 'start', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1', color: '#ff6b6b', marginBottom: 4, fontWeight: 700, fontSize: '1rem' }}>
              {(opponentName || opponentId) ? `⚔️ Đối thủ: ${opponentName || `User_${opponentId?.slice(0,4)}`}` : '⚔️ Đối thủ'}
            </div>
            <HoldPanel hold={oppHold} />
            
            {/* Stage with Garbage Queue Bar beside it */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ 
                  border: '4px solid #ff6b6b', 
                  borderRadius: '8px',
                  boxShadow: '0 0 20px rgba(255, 107, 107, 0.5), inset 0 0 10px rgba(255, 107, 107, 0.1)',
                  padding: '4px',
                  background: 'transparent'
                }}>
                  <Stage stage={(netOppStage as any) ?? oppStage} fillWhiteProgress={oppFillWhiteProgress} />
                </div>
                
                {/* Opponent's Garbage Queue Bar */}
                <GarbageQueueBar count={opponentIncomingGarbage} />
              </div>
              
              {/* (Requested) Removed live stats under opponent board */}
            </div>
            
            <div style={{ display: 'grid', gap: 12 }}>
              {countdown === null && <NextPanel queue={oppNextFour as any} />}
              {/* 📊 Opponent Live Stats (under Next) */}
              <StatsPanel 
                elapsedMs={oppElapsedMs}
                piecesPlaced={oppPiecesPlaced}
                attacksSent={oppAttacksSent}
                side="right"
              />
            </div>
          </div>
        </div>
      )}
      {/* ⭐ NEW RANK RESULT OVERLAY with ELO animation - ONLY FOR RANKED MATCHES */}
      {matchResult && eloData && matchMode === 'ranked' && (
        <RankResultOverlay
          show={true}
          outcome={matchResult.outcome as 'win' | 'lose'}
          finalScore={seriesScore}
          bestOf={seriesBestOf}
          playerName={playerName}
          opponentName={opponentName}
          myStats={myStats}
          oppStats={oppStats}
          oldElo={eloData.oldElo}
          newElo={eloData.newElo}
          eloChange={eloData.eloChange}
          onComplete={() => {
            if (meId) socket.emit('ranked:leave', meId);
            if (autoExitTimerRef.current) {
              clearInterval(autoExitTimerRef.current);
              autoExitTimerRef.current = null;
            }
            cleanupWebRTC('manual-exit');
            navigate('/?modes=1');
          }}
        />
      )}

      {/* Fallback overlay for RANKED matches if ELO not received yet */}
      {matchResult && !eloData && matchMode === 'ranked' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            color: '#fff',
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div>Đang tính toán ELO...</div>
          </div>
        </div>
      )}

      {/* Simple overlay for CASUAL matches (no ELO) */}
      {matchResult && matchMode === 'casual' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(20,20,25,0.98) 0%, rgba(30,30,40,0.98) 100%)',
              padding: '48px 56px',
              borderRadius: 24,
              boxShadow: `0 25px 80px rgba(0,0,0,0.7), 0 0 0 2px ${
                matchResult.outcome === 'win' ? 'rgba(76, 175, 80, 0.6)' : 'rgba(244, 67, 54, 0.6)'
              }`,
              minWidth: 600,
              maxWidth: 700,
              border: `3px solid ${matchResult.outcome === 'win' ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`,
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                marginBottom: 24,
                background: matchResult.outcome === 'win'
                  ? 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)'
                  : 'linear-gradient(135deg, #F44336 0%, #E57373 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {matchResult.outcome === 'win' ? '🎉 THẮNG!' : '💔 THUA'}
            </div>

            <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 32 }}>
              {seriesScore.me} - {seriesScore.opponent}
            </div>

            <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 32 }}>
              Chế độ: Casual (Không tính ELO)
            </div>

            <button
              onClick={() => {
                if (meId) socket.emit('ranked:leave', meId);
                if (autoExitTimerRef.current) {
                  clearInterval(autoExitTimerRef.current);
                  autoExitTimerRef.current = null;
                }
                cleanupWebRTC('manual-exit');
                navigate('/?modes=1');
              }}
              style={{
                padding: '16px 48px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: '1px',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 28px rgba(102, 126, 234, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
              }}
            >
              🏠 Về Menu
            </button>

            {autoExitCountdown !== null && (
              <div style={{ marginTop: 20, fontSize: 12, opacity: 0.5 }}>
                Tự động thoát sau {autoExitCountdown}s...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Score Update Overlay - CHỈ hiển thị khi thắng/thua 1 ván VÀ trận chưa kết thúc */}
      {roundResult && !matchResult && (
        <ScoreUpdateOverlay
          show={true}
          outcome={roundResult.outcome}
          newScore={roundResult.score}
          winsRequired={seriesWinsRequired}
          onComplete={() => {
            // Overlay sẽ tự đóng, không cần làm gì
          }}
        />
      )}
    </div>
  );
};

export default Versus;

