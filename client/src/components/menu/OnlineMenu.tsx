import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StyledTetrisWrapper } from '../styles/StyledTetris';
import socket from '../../socket';

interface CustomRoomCardProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}

const CustomRoomCard: React.FC<CustomRoomCardProps> = ({ icon, title, description, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '25px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 15px 30px rgba(0, 0, 0, 0.2)' : 'none',
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        style={{
          fontSize: '2rem',
          marginBottom: '15px',
          display: 'block',
        }}
      >
        {icon}
      </span>
      <div
        style={{
          fontSize: '1.1rem',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: '#ffffff',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: '0.9rem',
          color: '#cccccc',
          lineHeight: '1.4',
        }}
      >
        {description}
      </div>
    </div>
  );
};

const OnlineMenu: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'main' | 'join'>('main');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  // Function to generate random room ID (6 digits only)
  const generateRoomId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Function to create room and navigate to lobby
  const handleCreateRoom = () => {
    const roomId = generateRoomId();

    if (!socket.connected) {
      try {
        socket.connect();
      } catch (err) {
        console.error('Socket connect failed:', err);
      }
    }

    let displayName = 'Guest';
    try {
      const userData = localStorage.getItem('tetris:user');
      if (userData) {
        const user = JSON.parse(userData);
        displayName = user.username || user.email || displayName;
      }
    } catch (err) {
      console.error('Failed to parse user data:', err);
    }

    const payload = { maxPlayers: 2, name: displayName };

    sessionStorage.setItem(`roomHost_${roomId}`, 'true');

    socket.emit('room:create', roomId, payload, (ack: any) => {
      if (!ack?.ok) {
        console.error('Failed to create room:', ack?.error);
        sessionStorage.removeItem(`roomHost_${roomId}`);
        navigate('/online');
      }
    });

    navigate(`/room/${roomId}`);
  };

  // View: Join Room (Nhập ID phòng)
  if (view === 'join') {
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
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <h2 style={{ margin: 0, color: '#4ecdc4' }}>Nhập ID phòng</h2>
          <div style={{ textAlign: 'left', marginTop: 8 }}>
            <input
              placeholder="Nhập mã phòng (VD: ABCD1234)"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setError('');
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: 16,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
              }}
            />
            {error && (
              <div style={{ color: '#ff6b6b', marginTop: 8, fontSize: 14 }}>
                ⚠️ {error}
              </div>
            )}
          </div>
          <button
            disabled={!roomCode.trim()}
            onClick={() => {
              if (roomCode.trim().length < 4) {
                setError('ID phòng phải có ít nhất 4 ký tự');
                return;
              }
              navigate(`/room/${roomCode.trim()}`);
            }}
            style={{
              padding: '12px',
              fontSize: 16,
              fontWeight: 600,
              opacity: roomCode.trim() ? 1 : 0.5,
              cursor: roomCode.trim() ? 'pointer' : 'not-allowed',
              background: 'rgba(78, 205, 196, 0.2)',
              border: '1px solid rgba(78, 205, 196, 0.5)',
              borderRadius: '8px',
              color: '#4ecdc4',
              transition: 'all 0.3s ease',
            }}
          >
            Vào phòng
          </button>
          <button
            onClick={() => setView('main')}
            style={{
              padding: '10px',
              fontSize: 14,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            ← Quay lại
          </button>
        </div>
      </StyledTetrisWrapper>
    );
  }

  // Main View: 2 cards (Create or Join)
  return (
    <StyledTetrisWrapper style={{ display: 'grid', placeItems: 'center' }}>
      <div
        style={{
          width: 'min(700px, 92vw)',
          padding: 32,
          borderRadius: 16,
          background: 'rgba(20,20,22,0.35)',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        }}
      >
        <h1
          style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            marginBottom: '30px',
            textAlign: 'center',
            color: '#4ecdc4',
            textShadow: '0 0 10px #4ecdc4',
          }}
        >
          Phòng tùy chỉnh
        </h1>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '20px',
          }}
        >
          <CustomRoomCard
            icon="➕"
            title="Tạo phòng"
            description="Tạo phòng mới và mời bạn bè tham gia"
            onClick={handleCreateRoom}
          />
          <CustomRoomCard
            icon="🔑"
            title="Nhập ID phòng"
            description="Tham gia phòng đã tạo bằng mã phòng"
            onClick={() => setView('join')}
          />
        </div>
        <button
          onClick={() => navigate('/?modes=1')}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '10px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          ← Quay lại
        </button>
      </div>
    </StyledTetrisWrapper>
  );
};

export default OnlineMenu;
