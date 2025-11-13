import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket, { waitForAuthentication } from '../socket';

type MatchmakingStatus = 'searching' | 'found' | 'waiting' | 'timeout' | 'penalty';

interface MatchmakingUIProps {
  mode: 'casual' | 'ranked';
  onCancel: () => void;
}

const MatchmakingUI: React.FC<MatchmakingUIProps> = ({ mode, onCancel }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<MatchmakingStatus>('searching');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [confirmTimeout, setConfirmTimeout] = useState(10);
  const [matchData, setMatchData] = useState<any>(null);
  const [penaltyTime, setPenaltyTime] = useState(0);
  const [isJoiningQueue, setIsJoiningQueue] = useState(false);

  // Timer đếm thời gian tìm kiếm
  useEffect(() => {
    if (status !== 'searching') return;

    const interval = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1;
        
        // Quá 5 phút (300s) → timeout
        if (newTime >= 300) {
          setStatus('timeout');
          socket.emit('matchmaking:cancel');
          return newTime;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Timer đếm ngược confirm (10s)
  useEffect(() => {
    if (status !== 'found' && status !== 'waiting') return;

    const interval = setInterval(() => {
      setConfirmTimeout(prev => {
        if (prev <= 1) {
          // Hết giờ confirm → auto decline
          socket.emit('matchmaking:confirm-decline', { matchId: matchData?.matchId });
          onCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, matchData, onCancel]);

  // Listen socket events
  useEffect(() => {
    console.log('[Matchmaking UI] Setting up socket listeners...');

    // Tìm thấy đối thủ
    const onFound = (data: any) => {
      console.log('✅ [Matchmaking] Match found:', data);
      setStatus('found');
      setMatchData(data);
      setConfirmTimeout(data.timeout || 10);
    };

    // Đang chờ đối thủ chấp nhận
    const onWaiting = (data: any) => {
      console.log('⏳ [Matchmaking] Waiting for opponent:', data.message);
      setStatus('waiting');
    };

    // Trận đấu bắt đầu
    const onStart = (data: any) => {
      console.log('🎮 [Matchmaking] Match starting:', data);
      console.log('🎮 [Matchmaking] Navigate to game:', data.roomId);
      navigate(`/versus/${data.roomId}`);
    };

    // Đối thủ từ chối hoặc timeout
    const onOpponentDeclined = () => {
      console.log('❌ [Matchmaking] Opponent declined, returning to queue...');
      setStatus('searching');
      setElapsedTime(0);
      setMatchData(null);
      setConfirmTimeout(10);
    };

    // Bị penalty
    const onPenalty = (data: { duration: number }) => {
      console.log('⏱️ [Matchmaking] Penalty received:', data);
      setStatus('penalty');
      setPenaltyTime(data.duration);
      setTimeout(() => {
        onCancel();
      }, data.duration * 1000);
    };

    // Error handling
    const onError = (data: { error: string }) => {
      console.error('❌ [Matchmaking] Error:', data.error);
      alert(`Lỗi: ${data.error}`);
      onCancel();
    };

    // Register all listeners
    socket.on('matchmaking:found', onFound);
    socket.on('matchmaking:waiting', onWaiting);
    socket.on('matchmaking:start', onStart);
    socket.on('matchmaking:opponent-declined', onOpponentDeclined);
    socket.on('matchmaking:penalty', onPenalty);
    socket.on('matchmaking:error', onError);

    return () => {
      console.log('[Matchmaking UI] Cleaning up socket listeners...');
      socket.off('matchmaking:found', onFound);
      socket.off('matchmaking:waiting', onWaiting);
      socket.off('matchmaking:start', onStart);
      socket.off('matchmaking:opponent-declined', onOpponentDeclined);
      socket.off('matchmaking:penalty', onPenalty);
      socket.off('matchmaking:error', onError);
    };
  }, [navigate, onCancel]);

  // Debug: Log current state
  useEffect(() => {
    console.log('[Matchmaking UI] State:', {
      status,
      mode,
      elapsedTime,
      confirmTimeout,
      hasMatchData: !!matchData,
      socketConnected: socket.connected,
      socketId: socket.id
    });
  }, [status, mode, elapsedTime, confirmTimeout, matchData]);

  // Bắt đầu tìm kiếm
  useEffect(() => {
    const joinQueue = async () => {
      if (isJoiningQueue) {
        console.log('[Matchmaking] Already joining queue, skip...');
        return;
      }

      setIsJoiningQueue(true);
      console.log(`🔍 [Matchmaking] Waiting for authentication...`);
      
      try {
        // Đảm bảo socket đã connected
        if (!socket.connected) {
          console.log('⚙️ [Matchmaking] Socket not connected, connecting...');
          socket.connect();
          
          // Đợi socket connected
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
            
            const onConnect = () => {
              clearTimeout(timeout);
              socket.off('connect', onConnect);
              socket.off('connect_error', onError);
              resolve(true);
            };
            
            const onError = (err: any) => {
              clearTimeout(timeout);
              socket.off('connect', onConnect);
              socket.off('connect_error', onError);
              reject(err);
            };
            
            if (socket.connected) {
              clearTimeout(timeout);
              resolve(true);
            } else {
              socket.on('connect', onConnect);
              socket.on('connect_error', onError);
            }
          });
        }
        
        // Wait for authentication
        const authenticated = await waitForAuthentication();
        
        if (!authenticated) {
          console.error('❌ [Matchmaking] Not authenticated');
          alert('Vui lòng đăng nhập để tham gia matchmaking');
          onCancel();
          return;
        }
        
        console.log(`🔍 [Matchmaking] Authenticated! Joining ${mode} queue...`);
        
        // Emit join event
        socket.emit('matchmaking:join', { mode }, (response?: any) => {
          if (response?.error) {
            console.error('❌ [Matchmaking] Join error:', response.error);
            alert(`Không thể tham gia queue: ${response.error}`);
            onCancel();
          } else {
            console.log('✅ [Matchmaking] Successfully joined queue');
          }
        });
        
      } catch (error) {
        console.error('❌ [Matchmaking] Failed to join queue:', error);
        alert('Không thể kết nối đến server. Vui lòng thử lại.');
        onCancel();
      } finally {
        setIsJoiningQueue(false);
      }
    };
    
    joinQueue();
    
    return () => {
      // Cleanup khi unmount
      if (status === 'searching') {
        console.log('🚫 [Matchmaking] Component unmounting, cancelling search...');
        socket.emit('matchmaking:cancel');
      }
    };
  }, []); // Chỉ chạy một lần khi mount

  const handleCancel = () => {
    console.log('[Matchmaking] User cancelled');
    socket.emit('matchmaking:cancel');
    onCancel();
  };

  const handleConfirm = () => {
    console.log('✅ [Matchmaking] User confirmed match');
    socket.emit('matchmaking:confirm-accept', { matchId: matchData?.matchId });
  };

  const handleDecline = () => {
    console.log('❌ [Matchmaking] User declined match');
    socket.emit('matchmaking:confirm-decline', { matchId: matchData?.matchId });
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render dựa trên status
  const renderContent = () => {
    if (status === 'penalty') {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ff5555', marginBottom: 16 }}>
            🚫 BỊ KHÓA TẠM THỜI
          </div>
          <div style={{ fontSize: 14, color: '#ccc', marginBottom: 8 }}>
            Bạn đã huỷ xác nhận quá nhiều lần
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
            Thời gian còn lại: <span style={{ color: '#ff5555' }}>{penaltyTime}s</span>
          </div>
        </div>
      );
    }

    if (status === 'timeout') {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ffaa00', marginBottom: 16 }}>
            ⏱️ HẾT THỜI GIAN
          </div>
          <div style={{ fontSize: 14, color: '#ccc', marginBottom: 16 }}>
            Không tìm được đối thủ sau 5 phút
          </div>
          <div style={{ fontSize: 14, color: '#aaa', marginBottom: 24 }}>
            Vui lòng thử lại sau
          </div>
          <button
            onClick={handleCancel}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              color: '#fff',
              padding: '12px 32px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      );
    }

    if (status === 'found') {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#00ff88', marginBottom: 16 }}>
            ✅ ĐÃ TÌM THẤY ĐỐI THỦ!
          </div>
          <div style={{ fontSize: 14, color: '#ccc', marginBottom: 8 }}>
            Đối thủ: <span style={{ fontWeight: 600, color: '#fff' }}>{matchData?.opponent?.username || 'Unknown'}</span>
          </div>
          <div style={{ fontSize: 14, color: '#ccc', marginBottom: 24 }}>
            Bạn có <span style={{ color: '#ffaa00', fontWeight: 700, fontSize: 18 }}>{confirmTimeout}s</span> để xác nhận
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={handleConfirm}
              style={{
                background: 'linear-gradient(135deg, #00d084 0%, #00a86b 100%)',
                border: 'none',
                color: '#fff',
                padding: '12px 32px',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,208,132,0.3)',
              }}
            >
              ✓ Chấp Nhận
            </button>
            <button
              onClick={handleDecline}
              style={{
                background: 'rgba(255,85,85,0.2)',
                border: '1px solid rgba(255,85,85,0.5)',
                color: '#ff5555',
                padding: '12px 32px',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✗ Từ Chối
            </button>
          </div>
        </div>
      );
    }

    if (status === 'waiting') {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            color: '#00d084', 
            marginBottom: 24,
            textShadow: '0 0 20px rgba(0,208,132,0.5)'
          }}>
            ✅ ĐÃ XÁC NHẬN
          </div>
          
          <div style={{ 
            width: 80, 
            height: 80, 
            border: '6px solid rgba(0,208,132,0.1)',
            borderTop: '6px solid #00d084',
            borderRadius: '50%',
            margin: '0 auto 30px',
            animation: 'spin 1s linear infinite',
          }} />
          
          <div style={{ 
            fontSize: 20, 
            color: '#fff', 
            marginBottom: 16,
            fontWeight: 600,
          }}>
            🕐 ĐANG CHỜ ĐỐI THỦ XÁC NHẬN...
          </div>
          
          <div style={{ 
            fontSize: 16, 
            color: '#ccc',
            marginBottom: 24,
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            display: 'inline-block'
          }}>
            Đối thủ: <span style={{ color: '#00d084', fontWeight: 700 }}>
              {matchData?.opponent?.username || 'Unknown'}
            </span>
          </div>
          
          <div style={{ 
            fontSize: 14, 
            color: '#ffaa00', 
            marginTop: 20,
            padding: '10px 20px',
            background: 'rgba(255,170,0,0.1)',
            border: '1px solid rgba(255,170,0,0.3)',
            borderRadius: 8,
            display: 'inline-block',
            fontWeight: 600
          }}>
            ⏱️ Thời gian còn lại: <span style={{ fontSize: 18, color: '#ff8800' }}>
              {confirmTimeout}s
            </span>
          </div>
        </div>
      );
    }

    // Default: Searching
    const showTryHarder = elapsedTime >= 60;
    
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
          🔍 ĐANG TÌM ĐỐI THỦ
        </div>
        
        <div style={{ 
          width: 60, 
          height: 60, 
          border: '5px solid rgba(102,126,234,0.2)',
          borderTop: '5px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '20px auto',
        }} />
        
        <div style={{ fontSize: 18, fontWeight: 600, color: '#667eea', marginBottom: 16 }}>
          Thời gian: {formatTime(elapsedTime)}
        </div>
        
        {showTryHarder && (
          <div style={{ 
            fontSize: 14, 
            color: '#ffaa00', 
            marginBottom: 16,
            padding: '8px 16px',
            background: 'rgba(255,170,0,0.1)',
            borderRadius: 8,
            border: '1px solid rgba(255,170,0,0.3)',
          }}>
            ⚠️ Đang cố gắng tìm đối thủ, vui lòng chờ...
          </div>
        )}
        
        <div style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>
          {mode === 'ranked' ? 'Đấu Xếp Hạng' : 'Đấu Thường'}
        </div>
        
        <button
          onClick={handleCancel}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }}
        >
          Huỷ Tìm Kiếm
        </button>
      </div>
    );
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
      
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30,30,40,0.98) 0%, rgba(20,20,30,0.98) 100%)',
            padding: '40px 60px',
            borderRadius: 20,
            border: '2px solid rgba(102,126,234,0.4)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(102,126,234,0.1)',
            maxWidth: 550,
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          {renderContent()}
        </div>
      </div>
    </>
  );
};

export default MatchmakingUI;