import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

type MatchmakingStatus = 'searching' | 'found' | 'timeout' | 'penalty';

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

  // Timer đếm ngược confirm (10s)
  useEffect(() => {
    if (status !== 'found') return;

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
      console.log('Match found:', data);
      setStatus('found');
      setMatchData(data);
      setConfirmTimeout(10);
    });

    // Trận đấu bắt đầu (cả 2 đều confirm)
    socket.on('matchmaking:start', (data: any) => {
      console.log('Match starting:', data);
      navigate(`/room/${data.roomId}`);
    });

    // Đối thủ từ chối hoặc timeout
    socket.on('matchmaking:opponent-declined', () => {
      setStatus('searching');
      setElapsedTime(0);
      setMatchData(null);
    });

    // Bị penalty
    socket.on('matchmaking:penalty', (data: { duration: number }) => {
      console.log('Penalty received:', data);
      setStatus('penalty');
      setPenaltyTime(data.duration);
      setTimeout(() => {
        onCancel();
      }, data.duration * 1000);
    });

    return () => {
      socket.off('matchmaking:found');
      socket.off('matchmaking:start');
      socket.off('matchmaking:opponent-declined');
      socket.off('matchmaking:penalty');
    };
  }, [navigate, onCancel]);

  // Bắt đầu tìm kiếm
  useEffect(() => {
    socket.emit('matchmaking:join', { mode });
    
    return () => {
      // Cleanup khi unmount
      if (status === 'searching') {
        socket.emit('matchmaking:cancel');
      }
    };
  }, [mode]);

  const handleCancel = () => {
    socket.emit('matchmaking:cancel');
    onCancel();
  };

  const handleConfirm = () => {
    socket.emit('matchmaking:confirm-accept', { matchId: matchData?.matchId });
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
              ✓ Xác Nhận
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
              ✗ Huỷ
            </button>
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
