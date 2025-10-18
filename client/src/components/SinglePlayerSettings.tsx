import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface GameSettings {
  linesToClear: number;
  showGhost: boolean;
  enableHardDrop: boolean;
  showNext: boolean;
  showHold: boolean;
}

const SinglePlayerSettings: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<GameSettings>({
    linesToClear: 40,
    showGhost: true,
    enableHardDrop: true,
    showNext: true,
    showHold: true,
  });

  const handleStart = () => {
    // Lưu settings vào localStorage
    localStorage.setItem('tetris:singleSettings', JSON.stringify(settings));
    navigate('/single');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {/* Font declaration */}
      <style>
        {`
          @font-face {
            font-family: 'SVN-Determination Sans';
            src: url('/Font/SVN-Determination-Sans.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
        `}
      </style>

      {/* Main Container */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(30, 30, 30, 0.9) 100%)',
        backdropFilter: 'blur(10px)',
        border: '3px solid rgba(78, 205, 196, 0.6)',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        fontFamily: "'SVN-Determination Sans', 'Press Start 2P', cursive"
      }}>
        {/* Title */}
        <h1 style={{
          fontSize: '28px',
          color: '#4ecdc4',
          textAlign: 'center',
          marginBottom: '30px',
          textShadow: '0 0 20px rgba(78, 205, 196, 0.8)',
          letterSpacing: '2px'
        }}>
          ⚙️ Cài đặt trò chơi
        </h1>

        {/* Settings Form */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '25px'
        }}>
          {/* Lines to Clear */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid rgba(78, 205, 196, 0.3)'
          }}>
            <label style={{
              display: 'block',
              color: '#4ecdc4',
              fontSize: '16px',
              marginBottom: '15px',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
            }}>
              📊 Số hàng cần phá để thắng:
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <input
                type="range"
                min="10"
                max="150"
                step="10"
                value={settings.linesToClear}
                onChange={(e) => setSettings({ ...settings, linesToClear: parseInt(e.target.value) })}
                style={{
                  flex: 1,
                  height: '8px',
                  borderRadius: '4px',
                  outline: 'none',
                  background: 'linear-gradient(90deg, #4ecdc4 0%, #44a39b 100%)',
                  cursor: 'pointer'
                }}
              />
              <span style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
                minWidth: '60px',
                textAlign: 'center',
                background: 'rgba(78, 205, 196, 0.2)',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '2px solid #4ecdc4'
              }}>
                {settings.linesToClear}
              </span>
            </div>
            <div style={{
              marginTop: '10px',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center'
            }}>
              {settings.linesToClear === 40 ? '(Mặc định - Classic Tetris)' : 
               settings.linesToClear === 150 ? '(Marathon - Thử thách cao)' :
               settings.linesToClear < 40 ? '(Sprint - Nhanh)' : '(Endurance - Bền bỉ)'}
            </div>
          </div>

          {/* Toggle Options */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            {/* Ghost Piece */}
            <ToggleOption
              icon="👻"
              label="Hiển thị khối ma (Ghost Piece)"
              description="Xem trước vị trí khối sẽ rơi"
              checked={settings.showGhost}
              onChange={(checked) => setSettings({ ...settings, showGhost: checked })}
            />

            {/* Hard Drop */}
            <ToggleOption
              icon="⬇️"
              label="Cho phép Hard Drop"
              description="Nhấn Space để thả khối xuống ngay lập tức"
              checked={settings.enableHardDrop}
              onChange={(checked) => setSettings({ ...settings, enableHardDrop: checked })}
            />

            {/* Next Queue */}
            <ToggleOption
              icon="🔮"
              label="Hiển thị Next Queue"
              description="Xem trước các khối sắp tới (3-5 khối)"
              checked={settings.showNext}
              onChange={(checked) => setSettings({ ...settings, showNext: checked })}
            />

            {/* Hold */}
            <ToggleOption
              icon="📦"
              label="Cho phép Hold"
              description="Nhấn Shift để giữ khối hiện tại"
              checked={settings.showHold}
              onChange={(checked) => setSettings({ ...settings, showHold: checked })}
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '15px',
          marginTop: '35px'
        }}>
          <button
            onClick={handleBack}
            style={{
              flex: 1,
              padding: '15px',
              fontSize: '16px',
              fontFamily: "'SVN-Determination Sans', 'Press Start 2P', cursive",
              background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.8) 0%, rgba(255, 71, 71, 0.8) 100%)',
              border: '3px solid rgba(255, 107, 107, 0.6)',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
              boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.4)';
            }}
          >
            ◀ Quay lại
          </button>

          <button
            onClick={handleStart}
            style={{
              flex: 1,
              padding: '15px',
              fontSize: '16px',
              fontFamily: "'SVN-Determination Sans', 'Press Start 2P', cursive",
              background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.8) 0%, rgba(68, 163, 155, 0.8) 100%)',
              border: '3px solid rgba(78, 205, 196, 0.6)',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
              boxShadow: '0 4px 15px rgba(78, 205, 196, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(78, 205, 196, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(78, 205, 196, 0.4)';
            }}
          >
            Bắt đầu ▶
          </button>
        </div>

        {/* Info Footer */}
        <div style={{
          marginTop: '25px',
          padding: '15px',
          background: 'rgba(78, 205, 196, 0.1)',
          borderRadius: '10px',
          border: '1px solid rgba(78, 205, 196, 0.3)',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.7)',
          textAlign: 'center',
          lineHeight: '1.6'
        }}>
          💡 <strong>Mẹo:</strong> Thử nghiệm các cài đặt khác nhau để tìm độ khó phù hợp với bạn!
          <br />
          🎮 Chế độ không có Ghost/Hold/Next sẽ khó hơn nhiều!
        </div>
      </div>
    </div>
  );
};

// Toggle Option Component
const ToggleOption: React.FC<{
  icon: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ icon, label, description, checked, onChange }) => {
  return (
    <div style={{
      background: checked ? 'rgba(78, 205, 196, 0.1)' : 'rgba(255, 255, 255, 0.05)',
      padding: '18px',
      borderRadius: '12px',
      border: `2px solid ${checked ? 'rgba(78, 205, 196, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
      cursor: 'pointer',
      transition: 'all 0.3s',
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    }}
      onClick={() => onChange(!checked)}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = checked ? 'rgba(78, 205, 196, 0.15)' : 'rgba(255, 255, 255, 0.08)';
        e.currentTarget.style.transform = 'translateX(5px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = checked ? 'rgba(78, 205, 196, 0.1)' : 'rgba(255, 255, 255, 0.05)';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      <span style={{ fontSize: '28px' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{
          color: checked ? '#4ecdc4' : 'white',
          fontSize: '14px',
          marginBottom: '5px',
          fontWeight: 'bold'
        }}>
          {label}
        </div>
        <div style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '11px',
          lineHeight: '1.4'
        }}>
          {description}
        </div>
      </div>
      <div style={{
        width: '60px',
        height: '32px',
        background: checked ? 'linear-gradient(135deg, #4ecdc4 0%, #44a39b 100%)' : 'rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        position: 'relative',
        transition: 'all 0.3s',
        boxShadow: checked ? '0 0 15px rgba(78, 205, 196, 0.5)' : 'none'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          background: 'white',
          borderRadius: '50%',
          position: 'absolute',
          top: '4px',
          left: checked ? '32px' : '4px',
          transition: 'all 0.3s',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }} />
      </div>
    </div>
  );
};

export default SinglePlayerSettings;
