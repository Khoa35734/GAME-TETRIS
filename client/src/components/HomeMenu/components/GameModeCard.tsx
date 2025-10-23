import React from 'react';
import type { GameModeProps } from '../types';

const GameModeCard: React.FC<GameModeProps> = ({ icon, title, description, locked, lockedReason, onClick }) => (
  <div
    style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '25px',
      textAlign: 'center',
      cursor: locked ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      opacity: locked ? 0.5 : 1,
      position: 'relative',
    }}
    onClick={!locked ? onClick : undefined}
    onMouseEnter={(e) => {
      if (!locked) {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.2)';
      }
    }}
    onMouseLeave={(e) => {
      if (!locked) {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }
    }}
  >
    {locked && (
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          fontSize: '1.2rem',
        }}
      >
        🔒
      </div>
    )}
    <span style={{ fontSize: '2rem', marginBottom: '15px', display: 'block' }}>{icon}</span>
    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '8px', color: '#ffffff' }}>{title}</div>
    <div style={{ fontSize: '0.9rem', color: '#cccccc', lineHeight: '1.4' }}>{description}</div>
    {locked && lockedReason && (
      <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#ff6b6b', fontWeight: 500 }}>{lockedReason}</div>
    )}
  </div>
);

export default React.memo(GameModeCard);

