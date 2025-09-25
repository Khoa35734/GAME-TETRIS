import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { StyledTetrisWrapper } from './styles/StyledTetris';

const OnlineCreateRoom: React.FC = () => {
  const [name, setName] = useState('Phòng của tôi');
  const [maxPlayers, setMaxPlayers] = useState(2);
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
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Số người tối đa</span>
          <input type="number" min={2} max={6} value={maxPlayers} onChange={(e) => setMaxPlayers(parseInt(e.target.value || '2', 10))} />
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
          <Link to="/online"><button>Quay lại</button></Link>
          <button onClick={() => alert(`Tạo phòng: ${name} (${maxPlayers})`)}>Tạo</button>
        </div>
      </div>
    </StyledTetrisWrapper>
  );
};

export default OnlineCreateRoom;
