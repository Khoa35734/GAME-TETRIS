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

  // Timer đếm ngược confirm (10s) - Chạy cho cả 'found' và 'waiting'
  useEffect(() => {
    if (status !== 'found' && status !== 'waiting') return;

    const interval = setInterval(() => {
      setConfirmTimeout(prev => {
        if (prev <= 1) {
          // Hết giờ confirm → auto cancel
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
    // Tìm thấy đối thủ
    socket.on('matchmaking:found', (data: any) => {
      console.log('✅ [Matchmaking] Match found:', data);
      setStatus('found');
      setMatchData(data);
      setConfirmTimeout(data.timeout || 10);
    });

    // Đang chờ đối thủ chấp nhận
    socket.on('matchmaking:waiting', (data: any) => {
      console.log('⏳ [Matchmaking] Waiting for opponent:', data.message);
      setStatus('waiting');
    });

    // Trận đấu bắt đầu (cả 2 đều confirm)
    socket.on('matchmaking:start', (data: any) => {
      console.log('🎮 [Matchmaking] Match starting:', data);
      console.log('🎮 [Matchmaking] Navigate directly to game (versus)');
      // ✅ Matchmaking đi TRỰC TIẾP vào game, KHÔNG qua RoomLobby
      navigate(`/versus/${data.roomId}`);
    });

    // Đối thủ từ chối hoặc timeout
    socket.on('matchmaking:opponent-declined', () => {
      console.log('❌ [Matchmaking] Opponent declined, returning to queue...');
      setStatus('searching');
      setElapsedTime(0);
      setMatchData(null);
    });

    // Bị penalty
    socket.on('matchmaking:penalty', (data: { duration: number }) => {
      console.log('⏱️ [Matchmaking] Penalty received:', data);
      setStatus('penalty');
      setPenaltyTime(data.duration);
      setTimeout(() => {
        onCancel();
      }, data.duration * 1000);
    });

    // Error handling
    socket.on('matchmaking:error', (data: { error: string }) => {
      console.error('❌ [Matchmaking] Error:', data.error);
      if (data.error === 'Not authenticated') {
        alert('Vui lòng đăng nhập lại để tham gia matchmaking');
        onCancel();
      }
    });

    return () => {
      socket.off('matchmaking:found');
      socket.off('matchmaking:waiting');
      socket.off('matchmaking:start');
      socket.off('matchmaking:opponent-declined');
      socket.off('matchmaking:penalty');
      socket.off('matchmaking:error');
    };
  }, [navigate, onCancel]);

  // Bắt đầu tìm kiếm
  useEffect(() => {
    const joinQueue = async () => {
      console.log(`🔍 [Matchmaking] Waiting for authentication...`);
      
      // Wait for authentication to complete
      const authenticated = await waitForAuthentication();
      
      if (!authenticated) {
        console.error('❌ [Matchmaking] Not authenticated, cannot join queue');
        alert('Vui lòng đăng nhập để tham gia matchmaking');
        onCancel();
        return;
      }
      
      console.log(`🔍 [Matchmaking] Authenticated! Joining ${mode} queue...`);
      socket.emit('matchmaking:join', { mode });
    };
    
    joinQueue();
    
    return () => {
      // Cleanup khi unmount
      if (status === 'searching') {
        console.log('🚫 [Matchmaking] Cancelling search...');
        socket.emit('matchmaking:cancel');
      }
    };
  }, [mode, onCancel, status]);

  const handleCancel = () => {
    socket.emit('matchmaking:cancel');
    onCancel();
  };

  const handleConfirm = () => {
    console.log('✅ [Matchmaking] User confirmed match');
    socket.emit('matchmaking:confirm-accept', { matchId: matchData?.matchId });
    // Status will be set by 'matchmaking:waiting' event from server
  };

  const handleDecline = () => {
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
            🚫 BỊ KHOÁ TẠM THỜI
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
          
          {/* Loading Spinner */}
          <div style={{ 
            width: 80, 
            height: 80, 
            border: '6px solid rgba(0,208,132,0.1)',
            borderTop: '6px solid #00d084',
            borderRadius: '50%',
            margin: '0 auto 30px',
          }} className="spinner" />
          
          {/* Main Message */}
          <div style={{ 
            fontSize: 20, 
            color: '#fff', 
            marginBottom: 16,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #00d084 0%, #00a86b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🕐 ĐANG CHỜ ĐỐI THỦ XÁC NHẬN...
          </div>
          
          {/* Opponent Info */}
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
          
          {/* Countdown */}
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
          
          {/* Helper Text */}
          <div style={{ 
            fontSize: 12, 
            color: '#888', 
            marginTop: 24,
            fontStyle: 'italic'
          }}>
            Nếu đối thủ không xác nhận trong {confirmTimeout}s, bạn sẽ quay lại hàng đợi
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
        
        {/* Loading animation */}
        <div style={{ 
          width: 40, 
          height: 40, 
          border: '4px solid rgba(255,255,255,0.1)',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
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
          }}
        >
          Huỷ Tìm Kiếm
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Spinning animation CSS */}
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
          .spinner {
            animation: spin 1s linear infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
      
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          paddingTop: 80,
        }}
      >
        {/* Matchmaking Box */}
        <div
          style={{
            background: 'rgba(30,30,35,0.95)',
            padding: '32px 48px',
            borderRadius: 16,
            border: '2px solid rgba(102,126,234,0.5)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxWidth: 500,
            height: 'fit-content',
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
