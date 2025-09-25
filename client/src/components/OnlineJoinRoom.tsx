import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { StyledTetrisWrapper } from './styles/StyledTetris';

const OnlineJoinRoom: React.FC = () => {
  const [code, setCode] = useState('');
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
        <input placeholder="Nhập mã phòng" value={code} onChange={(e) => setCode(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
          <Link to="/online"><button>Quay lại</button></Link>
          <button disabled={!code.trim()} onClick={() => alert(`Vào phòng: ${code}`)}>Vào phòng</button>
        </div>
      </div>
    </StyledTetrisWrapper>
  );
};

export default OnlineJoinRoom;
