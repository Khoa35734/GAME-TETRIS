import React, { useEffect, useState } from 'react';

interface ScoreUpdateOverlayProps {
  show: boolean;
  outcome: 'win' | 'lose';
  newScore: { me: number; opponent: number } | { me: number; opp: number };
  winsRequired: number;
  onComplete: () => void;
}

/**
 * Overlay hiển thị khi thắng/thua 1 ván trong series
 * Hiển thị tỉ số mới với animation
 */
export const ScoreUpdateOverlay: React.FC<ScoreUpdateOverlayProps> = ({
  show,
  outcome,
  newScore,
  winsRequired,
  onComplete,
}) => {
  const [opacity, setOpacity] = useState(0);
  const [scale, setScale] = useState(0.8);

  // Normalize score to use consistent property names
  const score = {
    me: newScore.me,
    opponent: 'opponent' in newScore ? newScore.opponent : newScore.opp,
  };

  useEffect(() => {
    if (show) {
      // Fade in + scale animation
      setTimeout(() => {
        setOpacity(1);
        setScale(1);
      }, 50);

      // Auto close after 2.5 seconds
      const timer = setTimeout(() => {
        setOpacity(0);
        setScale(0.8);
        setTimeout(onComplete, 300);
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      setOpacity(0);
      setScale(0.8);
    }
  }, [show, onComplete]);

  if (!show) return null;

  const isWin = outcome === 'win';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        opacity,
        transition: 'opacity 0.3s ease',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          background: isWin
            ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.95), rgba(56, 142, 60, 0.95))'
            : 'linear-gradient(135deg, rgba(244, 67, 54, 0.95), rgba(198, 40, 40, 0.95))',
          padding: '48px 64px',
          borderRadius: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          textAlign: 'center',
          transform: `scale(${scale})`,
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          border: '3px solid rgba(255,255,255,0.2)',
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: 72, marginBottom: 24 }}>
          {isWin ? '🎉' : '😢'}
        </div>

        {/* Result Text */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 900,
            color: '#fff',
            marginBottom: 32,
            textTransform: 'uppercase',
            letterSpacing: '3px',
            textShadow: '2px 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {isWin ? 'Thắng Ván!' : 'Thua Ván'}
        </div>

        {/* Score Display */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 32,
            marginBottom: 24,
          }}
        >
          {/* Your Score */}
          <div>
            <div
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.7)',
                marginBottom: 8,
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Bạn
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: '#fff',
                textShadow: '3px 3px 10px rgba(0,0,0,0.4)',
              }}
            >
              {score.me}
            </div>
          </div>

          {/* VS */}
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              margin: '0 8px',
            }}
          >
            -
          </div>

          {/* Opponent Score */}
          <div>
            <div
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.7)',
                marginBottom: 8,
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Đối thủ
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: '#fff',
                textShadow: '3px 3px 10px rgba(0,0,0,0.4)',
              }}
            >
              {score.opponent}
            </div>
          </div>
        </div>

        {/* Progress to Win */}
        <div
          style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.8)',
            fontWeight: 600,
          }}
        >
          Cần {winsRequired} ván để thắng series
        </div>

        {/* Progress Bar */}
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
          }}
        >
          {Array.from({ length: winsRequired }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 40,
                height: 8,
                borderRadius: 4,
                background:
                  i < score.me
                    ? '#fff'
                    : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
          <div
            style={{
              width: 2,
              height: 8,
              background: 'rgba(255,255,255,0.3)',
              margin: '0 8px',
            }}
          />
          {Array.from({ length: winsRequired }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 40,
                height: 8,
                borderRadius: 4,
                background:
                  i < score.opponent
                    ? '#fff'
                    : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
