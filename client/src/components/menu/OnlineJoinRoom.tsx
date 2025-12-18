import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StyledTetrisWrapper } from '../styles/StyledTetris';
import socket from '../../socket';

const OnlineJoinRoom: React.FC = () => {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    if (joining || !code.trim()) return;
    setJoining(true);
    setError('');

    // Get player name from localStorage
    const currentUser = localStorage.getItem('tetris:user');
    let displayName = 'Guest';
    try {
      const user = JSON.parse(currentUser || '{}');
      displayName = user.username || 'Guest';
    } catch {}

    // Try to join room
    socket.emit('room:join', code.trim(), { name: displayName }, (result: any) => {
      setJoining(false);
      if (result.ok) {
        // Navigate to room lobby
        navigate(`/room/${code.trim()}`);
      } else {
        // Show error message
        switch (result.error) {
          case 'not-found':
            setError('Phòng không tồn tại');
            break;
          case 'full':
            setError('Phòng đã đầy (2/2 người chơi)');
            break;
          case 'started':
            setError('Trận đấu đã bắt đầu');
            break;
          default:
            setError('Không thể vào phòng');
        }
      }
    });
  };

  return (
    <StyledTetrisWrapper style={{ display: 'grid', placeItems: 'center' }}>
      <div
        style={{
          width: 'min(520px, 92vw)',
          padding: 24,
          borderRadius: 16,
          background: 'rgba(20,20,22,0.35)',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          display: 'grid',
          gap: 12,
          textAlign: 'left',
        }}
      >
        <h2 style={{ margin: 0, textAlign: 'center' }}>Nhập mã phòng</h2>
        <input 
          placeholder="Nhập mã phòng" 
          value={code} 
          onChange={(e) => {
            setCode(e.target.value);
            setError('');
          }}
          disabled={joining}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && code.trim()) {
              handleJoin();
            }
          }}
        />
        {error && (
          <div style={{ 
            padding: 12, 
            background: 'rgba(255, 100, 100, 0.2)', 
            border: '1px solid rgba(255, 100, 100, 0.5)',
            borderRadius: 8,
            color: '#ff6b6b',
            fontSize: 14
          }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
          <Link to="/online">
            <button disabled={joining}>Quay lại</button>
          </Link>
          <button 
            disabled={!code.trim() || joining} 
            onClick={handleJoin}
          >
            {joining ? 'Đang vào...' : 'Vào phòng'}
          </button>
        </div>
      </div>
    </StyledTetrisWrapper>
  );
};

export default OnlineJoinRoom;
