import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchmakingUI from './MatchmakingUI';
import bg2 from '../../img/bg2.gif';

const OnlineRanked: React.FC = () => {
  const navigate = useNavigate();
  const [isMatchmaking, setIsMatchmaking] = useState(false);

  const handleStartMatchmaking = () => {
    setIsMatchmaking(true);
  };

  const handleCancelMatchmaking = () => {
    setIsMatchmaking(false);
  };

  if (isMatchmaking) {
    return <MatchmakingUI mode="ranked" onCancel={handleCancelMatchmaking} />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: `url(${bg2})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#000',
        backgroundAttachment: 'fixed',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 8,
          cursor: 'pointer',
          zIndex: 100,
        }}
      >
        ← Thoát
      </button>

      <div
        style={{
          background: 'rgba(30,30,35,0.9)',
          padding: '48px 64px',
          borderRadius: 16,
          border: '2px solid rgba(255,170,0,0.5)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          textAlign: 'center',
          maxWidth: 600,
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 800, color: '#ffaa00', marginBottom: 16 }}>
          🏆 ĐẤU XẾP HẠNG
        </div>
        <div style={{ fontSize: 16, color: '#ccc', marginBottom: 32, lineHeight: 1.6 }}>
          Thi đấu với người chơi khác để kiếm điểm xếp hạng.
          <br />
          Tìm đối thủ có cùng trình độ với bạn.
        </div>

        <button
          onClick={handleStartMatchmaking}
          style={{
            background: 'linear-gradient(135deg, #ffaa00 0%, #ff8800 100%)',
            border: 'none',
            color: '#fff',
            padding: '16px 48px',
            borderRadius: 8,
            fontSize: 18,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(255,170,0,0.4)',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          🔍 TÌM TRẬN
        </button>

        <div style={{ marginTop: 32, fontSize: 14, color: '#888' }}>
          <div>• Trận đấu 1v1 với hệ thống xếp hạng</div>
          <div>• Thắng để tăng điểm, thua để mất điểm</div>
          <div>• Huỷ trận nhiều lần sẽ bị phạt</div>
        </div>
      </div>
    </div>
  );
};

export default OnlineRanked;
