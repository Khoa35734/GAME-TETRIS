import React from 'react';
import { Link } from 'react-router-dom';
import { StyledTetrisWrapper } from './styles/StyledTetris';

const OnlineMenu: React.FC = () => {
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
        <h2 style={{ margin: 0 }}>Chơi trực tuyến</h2>
        <Link to="/online/ranked"><button style={{ fontSize: 18, fontWeight: 700 }}>Đấu rank đơn</button></Link>
        <Link to="/online/create"><button>Tạo phòng</button></Link>
        <Link to="/online/join"><button>Nhập mã phòng</button></Link>
        <Link to="/"><button>Quay lại</button></Link>
      </div>
    </StyledTetrisWrapper>
  );
};

export default OnlineMenu;
