import React from 'react';

interface StatsPanelProps {
  elapsedMs: number;
  piecesPlaced: number;
  attacksSent: number;
  side: 'left' | 'right';
}

const StatsPanel: React.FC<StatsPanelProps> = ({ elapsedMs, piecesPlaced, attacksSent, side }) => {
  const timeSec = Math.max(elapsedMs / 1000, 0.1); // Avoid division by zero
  const pps = (piecesPlaced / timeSec).toFixed(2);
  const apm = ((attacksSent / timeSec) * 60).toFixed(1);
  const displayTime = (elapsedMs / 1000).toFixed(1);

  const accentColor = side === 'left' ? '#4ecdc4' : '#ff6b6b';

  return (
    <div
      style={{
        background: 'rgba(20, 20, 22, 0.85)',
        padding: '8px 12px',
        borderRadius: 8,
        border: `1px solid ${accentColor}40`,
        color: '#fff',
        fontSize: 12,
        fontWeight: 600,
        display: 'grid',
        gap: 4,
        minWidth: 140,
        boxShadow: `0 0 12px ${accentColor}30`,
      }}
    >
      <div style={{ color: '#aaa', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', marginBottom: 2 }}>
        ⚡ LIVE STATS
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#bbb' }}>PPS:</span>
        <span style={{ color: accentColor, fontWeight: 700 }}>{pps}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#bbb' }}>APM:</span>
        <span style={{ color: accentColor, fontWeight: 700 }}>{apm}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#bbb' }}>Time:</span>
        <span style={{ color: '#fff', fontWeight: 700 }}>{displayTime}s</span>
      </div>
    </div>
  );
};

export default StatsPanel;
