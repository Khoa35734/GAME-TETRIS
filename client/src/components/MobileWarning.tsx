import React, { useEffect, useState } from 'react';

export const MobileWarning: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Kiểm tra nếu là mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      
      // Kiểm tra user agent
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileUA = mobileRegex.test(userAgent);
      
      // Kiểm tra screen width (< 768px = mobile)
      const isMobileScreen = window.innerWidth < 768;
      
      // Kiểm tra touch support
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Xác định là mobile nếu thỏa mãn ít nhất 2 trong 3 điều kiện
      const mobileCount = [isMobileUA, isMobileScreen, isTouchDevice].filter(Boolean).length;
      setIsMobile(mobileCount >= 2);
    };

    checkMobile();
    
    // Re-check khi resize window
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile) return null;

  return (
    <>
      {/* Font Face Declaration */}
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

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.98)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: "'SVN-Determination Sans', 'Press Start 2P', cursive",
        color: 'white',
        textAlign: 'center',
        backdropFilter: 'blur(10px)'
      }}>
      {/* Icon */}
      <div style={{
        fontSize: '80px',
        marginBottom: '30px',
        animation: 'bounce 1s ease-in-out infinite'
      }}>
        💻
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: '24px',
        marginBottom: '20px',
        color: '#ff6b6b',
        textShadow: '0 0 20px rgba(255, 107, 107, 0.8)',
        lineHeight: '1.5'
      }}>
        Chỉ khả dụng trên máy tính
      </h1>

      {/* Message */}
      <p style={{
        fontSize: '14px',
        lineHeight: '1.8',
        maxWidth: '400px',
        marginBottom: '30px',
        color: 'rgba(255, 255, 255, 0.9)'
      }}>
        Trò chơi Tetris này được thiết kế để chơi trên máy tính với bàn phím.
      </p>

      {/* Icon Grid */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '30px',
        fontSize: '40px'
      }}>
        <div style={{
          animation: 'float 2s ease-in-out infinite',
          animationDelay: '0s'
        }}>🖥️</div>
        <div style={{
          animation: 'float 2s ease-in-out infinite',
          animationDelay: '0.3s'
        }}>💻</div>
        <div style={{
          animation: 'float 2s ease-in-out infinite',
          animationDelay: '0.6s'
        }}>⌨️</div>
      </div>

      {/* Instructions */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.2) 0%, rgba(85, 98, 112, 0.2) 100%)',
        border: '2px solid rgba(78, 205, 196, 0.5)',
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '400px',
        marginBottom: '20px'
      }}>
        <p style={{
          fontSize: '12px',
          lineHeight: '1.8',
          margin: 0,
          color: '#4ecdc4'
        }}>
          📱 Vui lòng truy cập từ máy tính để có trải nghiệm chơi game tốt nhất!
        </p>
      </div>

      {/* Device Info */}
      <div style={{
        fontSize: '10px',
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: '20px'
      }}>
        Thiết bị: {navigator.userAgent.includes('Android') ? 'Android' : 
                   navigator.userAgent.includes('iPhone') ? 'iPhone' : 
                   navigator.userAgent.includes('iPad') ? 'iPad' : 'Mobile'}
        <br />
        Màn hình: {window.innerWidth} x {window.innerHeight}px
      </div>

      {/* Continue anyway button (hidden by default, can be shown for testing) */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => setIsMobile(false)}
          style={{
            marginTop: '30px',
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '10px',
            cursor: 'pointer',
            fontFamily: "'Press Start 2P', cursive",
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          [DEV] Tiếp tục
        </button>
      )}

      {/* Animations */}
      <style>
        {`
          @keyframes bounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-20px);
            }
          }

          @keyframes float {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }

          /* Make text more readable on small screens */
          @media (max-width: 480px) {
            h1 {
              font-size: 18px !important;
            }
            p {
              font-size: 12px !important;
            }
          }

          @media (max-width: 320px) {
            h1 {
              font-size: 14px !important;
            }
            p {
              font-size: 10px !important;
            }
          }
        `}
      </style>
      </div>
    </>
  );
};
