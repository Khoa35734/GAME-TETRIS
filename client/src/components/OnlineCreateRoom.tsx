import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StyledTetrisWrapper } from './styles/StyledTetris';
import socket from '../socket';

const OnlineCreateRoom: React.FC = () => {
  const [name, setName] = useState('Phòng của tôi');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreate = () => {
    if (creating) return;
    setCreating(true);

    // Generate random room ID
    const roomId = `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    
    // Get player name from localStorage or use IP
    const currentUser = localStorage.getItem('tetris:user');
    let displayName = 'Guest';
    try {
      const user = JSON.parse(currentUser || '{}');
      displayName = user.username || 'Guest';
    } catch {
      // Fallback to IP if available
    }

    // Create room on server
    socket.emit('room:create', roomId, { maxPlayers, name: displayName }, (result: any) => {
      setCreating(false);
      if (result.ok) {
        // Navigate to room lobby
        navigate(`/room/${roomId}`);
      } else {
        if (result.error === 'exists') {
          alert('ID phòng đã tồn tại, vui lòng thử lại');
        } else {
          alert('Không thể tạo phòng, vui lòng thử lại');
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
        <h2 style={{ margin: 0, textAlign: 'center' }}>Tạo phòng</h2>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Tên phòng</span>
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            disabled={creating}
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Số người tối đa</span>
          <input 
            type="number" 
            min={2} 
            max={6} 
            value={maxPlayers} 
            onChange={(e) => setMaxPlayers(parseInt(e.target.value || '2', 10))}
            disabled={creating}
          />
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
          <Link to="/online">
            <button disabled={creating}>Quay lại</button>
          </Link>
          <button onClick={handleCreate} disabled={creating}>
            {creating ? 'Đang tạo...' : 'Tạo'}
          </button>
        </div>
      </div>
    </StyledTetrisWrapper>
  );
};

export default OnlineCreateRoom;
