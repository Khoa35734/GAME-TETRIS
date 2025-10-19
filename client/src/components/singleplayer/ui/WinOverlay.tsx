import React from 'react';

interface Props {
  visible: boolean;
  elapsedMs: number;
  rows: number;
  level: number;
  piecesPlaced: number;
  inputs: number;
  holds: number;
  onPlayAgain: () => void;
  onMenu: () => void;
}

export const WinOverlay: React.FC<Props> = ({ visible, elapsedMs, rows, level, piecesPlaced, inputs, holds, onPlayAgain, onMenu }) => {
  if (!visible) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 1000 }}>
      <div style={{ background: 'rgba(40,40,45,0.95)', padding: '32px 48px', borderRadius: 16, border: '2px solid rgba(0,200,100,0.5)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', color: '#fff', textAlign: 'center', minWidth: 320 }}>
        <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 24, color: '#00ff88' }}>🎉 YOU WIN! 🎉</div>
        <div style={{ fontSize: 14, textAlign: 'left', lineHeight: 1.8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#aaa' }}>Time:</span>
            <span style={{ fontWeight: 600 }}>{(elapsedMs / 1000).toFixed(2)}s</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#aaa' }}>Lines Cleared:</span>
            <span style={{ fontWeight: 600 }}>{rows}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#aaa' }}>Level:</span>
            <span style={{ fontWeight: 600 }}>{level + 1}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#aaa' }}>Pieces Placed:</span>
            <span style={{ fontWeight: 600 }}>{piecesPlaced}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#aaa' }}>PPS (Pieces/sec):</span>
            <span style={{ fontWeight: 600 }}>{elapsedMs > 0 ? (piecesPlaced / (elapsedMs / 1000)).toFixed(2) : '0.00'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#aaa' }}>Total Inputs:</span>
            <span style={{ fontWeight: 600 }}>{inputs}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#aaa' }}>Holds Used:</span>
            <span style={{ fontWeight: 600 }}>{holds}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#aaa' }}>Finesse (Inputs/Piece):</span>
            <span style={{ fontWeight: 600 }}>{piecesPlaced > 0 ? (inputs / piecesPlaced).toFixed(2) : '0.00'}</span>
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          <button onClick={onPlayAgain} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', color: '#fff', padding: '12px 32px', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginRight: 12 }}>Play Again</button>
          <button onClick={onMenu} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', padding: '12px 32px', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Menu</button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(WinOverlay);

