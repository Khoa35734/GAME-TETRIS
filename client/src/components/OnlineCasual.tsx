import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchmakingUI from './MatchmakingUI';

const OnlineCasual: React.FC = () => {
  const navigate = useNavigate();
  const [isMatchmaking, setIsMatchmaking] = useState(false);

  const handleStartMatchmaking = () => {
    setIsMatchmaking(true);
  };

  const handleCancelMatchmaking = () => {
    setIsMatchmaking(false);
  };

  if (isMatchmaking) {
    return <MatchmakingUI mode="casual" onCancel={handleCancelMatchmaking} />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `url('/img/bg2.gif') center/cover, #000`,
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
          border: '2px solid rgba(78,205,196,0.5)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          textAlign: 'center',
          maxWidth: 600,
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 800, color: '#4ecdc4', marginBottom: 16 }}>
          ⚔️ ĐỐI KHÁNG
        </div>
        <div style={{ fontSize: 16, color: '#ccc', marginBottom: 32, lineHeight: 1.6 }}>
          Thi đấu thân thiện với người chơi khác.
          <br />
          Không ảnh hưởng đến xếp hạng, chỉ để giải trí.
        </div>

        <button
          onClick={handleStartMatchmaking}
          style={{
            background: 'linear-gradient(135deg, #4ecdc4 0%, #3ab0a8 100%)',
            border: 'none',
            color: '#fff',
            padding: '16px 48px',
            borderRadius: 8,
            fontSize: 18,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(78,205,196,0.4)',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          🔍 TÌM TRẬN
        </button>

        <div style={{ marginTop: 32, fontSize: 14, color: '#888' }}>
          <div>• Trận đấu 1v1 không tính điểm</div>
          <div>• Chơi để luyện tập và giải trí</div>
          <div>• Huỷ trận nhiều lần vẫn bị phạt</div>
        </div>
      </div>
    </div>
  );
};

export default OnlineCasual;
