import React from 'react';
import { useParams } from 'react-router-dom';
import { useVersus } from './hooks/useVersus'; // 👈 IMPORT HOOK MỚI ĐÃ TÁI CẤU TRÚC

// Import các component UI (với đường dẫn đã sửa)
import Stage from '../Stage';
import { HoldPanel, NextPanel } from '../SidePanels';
import GarbageQueueBar from '../GarbageQueueBar'; // Giả sử file này cũng ở root components

// Import tài nguyên (với đường dẫn đã sửa)
import bgImg from '../../../img/bg.jpg'; // 👈 ĐÃ SỬA ĐƯỜNG DẪN

// File này không còn chứa bất kỳ logic game, state, hay socket nào
// Nó chỉ nhận props từ hook `useVersusState` và render JSX

const Versus: React.FC = () => {
  // Lấy urlRoomId để truyền vào hook logic
  const { roomId: urlRoomId } = useParams<{ roomId?: string }>();
  
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
    rows,
    level,
    elapsedMs,
    combo,
    b2b,
    myPing,
    isApplyingGarbage,
    garbageToSend,
    myStats,
    opponentName,
    opponentId,
    oppStage,
    netOppStage,
    oppHold,
    oppNextFour,
    oppFillWhiteProgress,
    opponentIncomingGarbage,
    oppGameOver,
    oppPing,
    oppStats,
    seriesScore,
    seriesBestOf,
    seriesWinsRequired,
    seriesCurrentGame,
    sendTopout,
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
          console.log('🚪 Exit button clicked:', { roomId, matchResult });
          if (roomId && matchResult === null) {
            console.log('📤 Sending topout (manual exit) via UDP/TCP');
            sendTopout('manual_exit');
          }
          if (meId) socket.emit('ranked:leave', meId);
          if (autoExitTimerRef.current) {
            clearInterval(autoExitTimerRef.current);
            autoExitTimerRef.current = null;
          }
          cleanupWebRTC('manual-exit');
          navigate('/');
        }}
        style={{ position: 'fixed', top: 12, left: 12, zIndex: 999, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}
      >
        ← Thoát
      </button>
      
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'start', position: 'relative' }}>
          
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
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', alignItems: 'start', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1', color: '#4ecdc4', marginBottom: 4, fontWeight: 700, fontSize: '1.1rem' }}>
              {playerName ? `🎮 Bạn: ${playerName}` : '🎮 Bạn'}
            </div>
            <HoldPanel hold={hold as any} />
            
            {/* Stage with Garbage Queue Bar beside it */}
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
            
            <div style={{ display: 'grid', gap: 12 }}>
              <NextPanel queue={nextFour as any} />
              <div style={{ background: 'rgba(20,20,22,0.75)', padding: 8, borderRadius: 10, color: '#fff' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>STATUS</div>
                <div>Rows: {rows}</div>
                <div>Level: {level}</div>
                <div>Time: {(elapsedMs/1000).toFixed(2)}s</div>
                <div>Combo: {combo}</div>
                <div>B2B: {b2b}</div>
                {typeof myPing === 'number' && (
                  <div style={{ color: myPing < 50 ? '#4ecdc4' : myPing < 100 ? '#ffb800' : '#ff6b6b' }}>
                    📶 Ping: {myPing}ms
                  </div>
                )}
                {isApplyingGarbage && (
                  <div style={{ 
                    color: '#ff6b6b', 
                    fontWeight: 'bold',
                    animation: 'pulse 0.5s ease-in-out infinite',
                    textShadow: '0 0 8px rgba(255, 107, 107, 0.8)'
                  }}>
                    ⚡ Applying...
                  </div>
                )}
                <div style={{ color: incomingGarbage > 0 ? '#ff6b6b' : '#888' }}>
                  ⚠️ Incoming: {incomingGarbage}
                </div>
                <div style={{ color: '#4ecdc4' }}>💣 Sent: {garbageToSend}</div>
                <div style={{ fontSize: '10px', color: '#888', marginTop: 4 }}>
                  Debug: Bar={incomingGarbage}
                </div>
              </div>
            </div>
          </div>

          {/* Right side: OPPONENT (ĐÃ ĐỔI - Board đối thủ bên PHẢI với viền đỏ) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', alignItems: 'start', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1', color: '#ff6b6b', marginBottom: 4, fontWeight: 700, fontSize: '1.1rem' }}>
              {(opponentName || opponentId) ? `⚔️ Đối thủ: ${opponentName || `User_${opponentId?.slice(0,4)}`}` : '⚔️ Đối thủ'}
            </div>
            <HoldPanel hold={oppHold} />
            
            {/* Stage with Garbage Queue Bar beside it */}
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
            
            <div style={{ display: 'grid', gap: 12 }}>
              {countdown === null && <NextPanel queue={oppNextFour as any} />}
              <div style={{ background: 'rgba(20,20,22,0.35)', padding: 8, borderRadius: 10, color: '#fff' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>OPP STATUS</div>
                <div>GameOver: {oppGameOver ? 'YES' : 'NO'}</div>
                <div>Hold: {oppHold ? oppHold.shape || 'None' : 'None'}</div>
                {typeof oppPing === 'number' && (
                  <div style={{ color: oppPing < 50 ? '#4ecdc4' : oppPing < 100 ? '#ffb800' : '#ff6b6b' }}>
                    📶 Ping: {oppPing}ms
                  </div>
                )}
                <div style={{ fontSize: '10px', color: '#888', marginTop: 4 }}>
                  Debug: Bar={opponentIncomingGarbage}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* TEMPORARILY DISABLED OVERLAY FOR TESTING FILL WHITE ANIMATION */}
      { matchResult && (() => {
        const result = matchResult!; // Non-null assertion since we checked above
        return (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          display: 'grid', 
          placeItems: 'center', 
          background: 'rgba(0,0,0,0.75)', 
          color: '#fff', 
          textAlign: 'center', 
          zIndex: 998,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(20,20,22,0.95) 0%, rgba(30,30,35,0.95) 100%)', 
            padding: '40px 56px', 
            borderRadius: 24, 
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)', 
            minWidth: 480,
            maxWidth: 600,
            border: result.outcome === 'win' 
              ? '2px solid rgba(76, 175, 80, 0.5)' 
              : result.outcome === 'lose' 
                ? '2px solid rgba(244, 67, 54, 0.5)' 
                : '2px solid rgba(255, 152, 0, 0.5)'
          }}>
            {/* Result Title */}
            <div style={{ 
              fontSize: 52, 
              fontWeight: 900, 
              marginBottom: 8,
              background: result.outcome === 'win'
                ? 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)'
                : result.outcome === 'lose'
                  ? 'linear-gradient(135deg, #F44336 0%, #E57373 100%)'
                  : 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 4px 12px rgba(0,0,0,0.3)',
              letterSpacing: '2px'
            }}>
              {result.outcome === 'win' ? '🎉 CHIẾN THẮNG!' : result.outcome === 'lose' ? '😢 THẤT BẠI' : '🤝 HÒA TRẬN'}
            </div>

            {/* Reason */}
            {result.reason && (
              <div style={{ 
                fontSize: 15, 
                opacity: 0.8, 
                marginBottom: 32,
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                fontStyle: 'italic'
              }}>
                💬 {result.reason}
              </div>
            )}

            {/* Stats Comparison */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr auto 1fr', 
              gap: 24, 
              marginBottom: 32,
              padding: '24px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 16
            }}>
              {/* Your Stats */}
              <div style={{ textAlign: 'left' }}>
                <div style={{ 
                  fontSize: 14, 
                  opacity: 0.6, 
                  marginBottom: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  🎮 BẠN
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.7, fontSize: 13 }}>Dòng</span>
                    <span style={{ fontWeight: 700, fontSize: 20, color: '#4CAF50' }}>{myStats.rows}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.7, fontSize: 13 }}>Level</span>
                    <span style={{ fontWeight: 700, fontSize: 20, color: '#2196F3' }}>{myStats.level}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.7, fontSize: 13 }}>Điểm</span>
                    <span style={{ fontWeight: 700, fontSize: 20, color: '#FF9800' }}>{myStats.score.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* VS Divider */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontSize: 28, 
                fontWeight: 900,
                opacity: 0.3,
                padding: '0 16px'
              }}>
                VS
              </div>

              {/* Opponent Stats */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  fontSize: 14, 
                  opacity: 0.6, 
                  marginBottom: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  👾 ĐỐI THỦ
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 20, color: '#4CAF50' }}>{oppStats.rows}</span>
                    <span style={{ opacity: 0.7, fontSize: 13 }}>Dòng</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 20, color: '#2196F3' }}>{oppStats.level}</span>
                    <span style={{ opacity: 0.7, fontSize: 13 }}>Level</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 20, color: '#FF9800' }}>{oppStats.score.toLocaleString()}</span>
                    <span style={{ opacity: 0.7, fontSize: 13 }}>Điểm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Stats */}
            <div style={{ 
              marginBottom: 24,
              fontSize: 14,
              opacity: 0.7,
              display: 'flex',
              justifyContent: 'center',
              gap: 24
            }}>
              <div>
                ⏱️ Thời gian: <strong>{Math.floor(elapsedMs / 1000 / 60)}:{String(Math.floor(elapsedMs / 1000) % 60).padStart(2, '0')}</strong>
              </div>
              {myPing !== null && (
                <div>
                  📡 Ping: <strong>{myPing}ms</strong>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button
                onClick={() => {
                  if (meId) socket.emit('ranked:leave', meId);
                  if (autoExitTimerRef.current) {
                    clearInterval(autoExitTimerRef.current);
                    autoExitTimerRef.current = null;
                  }
                  cleanupWebRTC('manual-exit');
                  navigate('/');
                }}
                style={{ 
                  padding: '14px 32px', 
                  borderRadius: 12, 
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                  color: '#fff', 
                  cursor: 'pointer', 
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: '0.5px',
                  boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.4)';
                }}
              >
                🏠 Về Menu
              </button>
            </div>

            {/* Auto Exit Countdown */}
            {autoExitCountdown !== null && (
              <div style={{ 
                marginTop: 20, 
                fontSize: 12, 
                opacity: 0.5,
                fontStyle: 'italic'
              }}>
                Tự động thoát sau {autoExitCountdown}s...
              </div>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default Versus;

