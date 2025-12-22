import React, { useState, useEffect } from 'react';
import ReportModal from '../ReportModal';

interface RankResultOverlayProps {
  show: boolean;
  outcome: 'win' | 'lose';
  finalScore: { me: number; opponent: number };
  bestOf: number;
  playerName: string;
  opponentName: string;
  myStats: { rows: number; level: number; score: number };
  oppStats: { rows: number; level: number; score: number };
  oldElo: number;
  newElo: number;
  eloChange: number;
  onComplete: () => void;
}

/**
 * 🏆 Rank Result Overlay với hiệu ứng ELO động
 * Hiển thị kết quả trận rank kèm animation tăng/giảm ELO
 */
export const RankResultOverlay: React.FC<RankResultOverlayProps> = ({
  show,
  outcome,
  finalScore,
  bestOf,
  playerName,
  opponentName,
  myStats,
  oppStats,
  oldElo,
  newElo,
  eloChange,
  onComplete,
}) => {
  const [animatedElo, setAnimatedElo] = useState(oldElo);
  const [showEloChange, setShowEloChange] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Animation ELO từ oldElo → newElo
  useEffect(() => {
    if (!show) return;

    // Delay 1s trước khi bắt đầu animation ELO
    const startDelay = setTimeout(() => {
      setShowEloChange(true);

      const duration = 1500; // 1.5s animation
      const steps = 60; // 60 frames
      const increment = (newElo - oldElo) / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setAnimatedElo(newElo);
          clearInterval(interval);
        } else {
          setAnimatedElo(Math.round(oldElo + increment * currentStep));
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }, 1000);

    return () => clearTimeout(startDelay);
  }, [show, oldElo, newElo]);

  if (!show) return null;

  const isWin = outcome === 'win';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.4s ease-out',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,25,0.98) 0%, rgba(30,30,40,0.98) 100%)',
          padding: '48px 56px',
          borderRadius: 24,
          boxShadow: `0 25px 80px rgba(0,0,0,0.7), 0 0 0 2px ${
            isWin ? 'rgba(76, 175, 80, 0.6)' : 'rgba(244, 67, 54, 0.6)'
          }`,
          minWidth: 600,
          maxWidth: 700,
          border: `3px solid ${isWin ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`,
          animation: 'slideUpBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        }}
      >
        {/* 🏆 TIÊU ĐỀ KẾT QUẢ */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            marginBottom: 16,
            textAlign: 'center',
            background: isWin
              ? 'linear-gradient(135deg, #4CAF50 0%, #81C784 50%, #FFD700 100%)'
              : 'linear-gradient(135deg, #F44336 0%, #E57373 50%, #B71C1C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: isWin
              ? '0 0 30px rgba(76, 175, 80, 0.4)'
              : '0 0 30px rgba(244, 67, 54, 0.4)',
            letterSpacing: '3px',
            animation: isWin ? 'pulse 1.5s infinite' : 'shake 0.5s ease',
          }}
        >
          {isWin ? '🎉 THẮNG!' : '💔 THUA'}
        </div>

        {/* 📊 TỶ SỐ TRẬN */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            marginBottom: 24,
            textAlign: 'center',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          <span
            style={{
              color: isWin ? '#4CAF50' : '#fff',
              textShadow: '2px 2px 12px rgba(0,0,0,0.5)',
            }}
          >
            {finalScore.me}
          </span>
          <span style={{ opacity: 0.4, fontSize: 32 }}>-</span>
          <span
            style={{
              color: !isWin ? '#F44336' : '#fff',
              textShadow: '2px 2px 12px rgba(0,0,0,0.5)',
            }}
          >
            {finalScore.opponent}
          </span>
        </div>

        <div
          style={{
            fontSize: 14,
            opacity: 0.6,
            marginBottom: 32,
            textAlign: 'center',
            fontWeight: 600,
            color: '#aaa',
          }}
        >
          Best of {bestOf}
        </div>

        {/* ⭐ ELO RATING UPDATE với ANIMATION */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 152, 0, 0.15) 100%)',
            border: '2px solid rgba(255, 193, 7, 0.4)',
            borderRadius: 16,
            padding: '32px',
            marginBottom: 32,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(255, 193, 7, 0.3)',
          }}
        >
          {/* Hiệu ứng sáng background */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: isWin
                ? 'linear-gradient(45deg, transparent 30%, rgba(76, 175, 80, 0.1) 50%, transparent 70%)'
                : 'linear-gradient(45deg, transparent 30%, rgba(244, 67, 54, 0.1) 50%, transparent 70%)',
              animation: 'shimmer 2s infinite',
            }}
          />

          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: 16,
              color: '#FFD700',
              textShadow: '0 2px 8px rgba(255, 215, 0, 0.4)',
            }}
          >
            ⭐ RATING
          </div>

          {/* ELO Number với Animation */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: '#fff',
              marginBottom: 12,
              textShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
              fontFamily: 'monospace',
              letterSpacing: '4px',
            }}
          >
            {animatedElo}
          </div>

          {/* ELO Change indicator với animation */}
          {showEloChange && (
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: eloChange > 0 ? '#4CAF50' : '#F44336',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                animation: 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
              }}
            >
              {eloChange > 0 ? (
                <>
                  <span style={{ fontSize: 40 }}>▲</span>
                  <span>+{eloChange}</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 40 }}>▼</span>
                  <span>{eloChange}</span>
                </>
              )}
            </div>
          )}

          {/* Old ELO hiển thị nhỏ bên dưới */}
          <div
            style={{
              fontSize: 13,
              opacity: 0.5,
              marginTop: 12,
              fontWeight: 600,
              color: '#bbb',
            }}
          >
            Trước: {oldElo}
          </div>
        </div>

        {/* 📊 SO SÁNH THỐNG KÊ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: 32,
            marginBottom: 32,
            padding: '28px',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* Your Stats */}
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontSize: 14,
                opacity: 0.6,
                marginBottom: 16,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: '#4ecdc4',
              }}
            >
              🎮 {playerName}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ opacity: 0.7, fontSize: 14, color: '#ccc' }}>Dòng</span>
                <span style={{ fontWeight: 700, fontSize: 22, color: '#4CAF50' }}>
                  {myStats.rows}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ opacity: 0.7, fontSize: 14, color: '#ccc' }}>Level</span>
                <span style={{ fontWeight: 700, fontSize: 22, color: '#2196F3' }}>
                  {myStats.level}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ opacity: 0.7, fontSize: 14, color: '#ccc' }}>Điểm</span>
                <span style={{ fontWeight: 700, fontSize: 22, color: '#FF9800' }}>
                  {myStats.score.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* VS Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 32,
              fontWeight: 900,
              opacity: 0.3,
              padding: '0 20px',
              color: '#888',
            }}
          >
            VS
          </div>

          {/* Opponent Stats */}
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 14,
                opacity: 0.6,
                marginBottom: 16,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: '#ff6b6b',
              }}
            >
              👾 {opponentName}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 22, color: '#4CAF50' }}>
                  {oppStats.rows}
                </span>
                <span style={{ opacity: 0.7, fontSize: 14, color: '#ccc' }}>Dòng</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 22, color: '#2196F3' }}>
                  {oppStats.level}
                </span>
                <span style={{ opacity: 0.7, fontSize: 14, color: '#ccc' }}>Level</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 22, color: '#FF9800' }}>
                  {oppStats.score.toLocaleString()}
                </span>
                <span style={{ opacity: 0.7, fontSize: 14, color: '#ccc' }}>Điểm</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🔘 NÚT ĐÓNG */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => { console.log('[UI] Report button (in RankResultOverlay) clicked'); setShowReportModal(true); }}
            style={{
              padding: '12px 24px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14,
            }}
            data-test="rank-report-player"
          >
            ⚠️ Báo cáo người chơi
          </button>

          <button
            onClick={onComplete}
            style={{
              padding: '16px 48px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: '1px',
              boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
              e.currentTarget.style.boxShadow = '0 8px 28px rgba(102, 126, 234, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
            }}
          >
            🏠 Về Menu
          </button>
        </div>
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          // We don't have opponentId here; user can input username in modal if needed
        />
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUpBounce {
          0% {
            opacity: 0;
            transform: translateY(100px) scale(0.8);
          }
          60% {
            opacity: 1;
            transform: translateY(-10px) scale(1.05);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.15);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.05);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};
