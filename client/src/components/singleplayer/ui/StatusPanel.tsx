import React from 'react';

interface Props {
  rows: number;
  level: number;
  elapsedMs: number;
  piecesPlaced: number;
  inputs: number;
  holds: number;
  linesToClear: number;
}

export const StatusPanel: React.FC<Props> = ({ rows, level, elapsedMs, piecesPlaced, inputs, holds, linesToClear }) => {
  return (
    <div style={{ background: 'rgba(20,20,22,0.35)', padding: 8, borderRadius: 10, color: '#fff', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>STATUS</div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: '#888' }}>Lines:</span>{' '}
        <span style={{ fontWeight: 600 }}>{rows}</span>
        <span style={{ color: '#666' }}> / {linesToClear}</span>
      </div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: '#888' }}>Level:</span> <span style={{ fontWeight: 600 }}>{level + 1}</span>
      </div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: '#888' }}>Time:</span> <span style={{ fontWeight: 600 }}>{(elapsedMs / 1000).toFixed(2)}s</span>
      </div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: '#888' }}>PPS:</span>{' '}
        <span style={{ fontWeight: 600 }} title={`Pieces: ${piecesPlaced}, Time: ${(elapsedMs / 1000).toFixed(2)}s`}>
          {elapsedMs > 0 ? (piecesPlaced / (elapsedMs / 1000)).toFixed(2) : '0.00'}
        </span>
      </div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: '#888' }}>Pieces:</span> <span style={{ fontWeight: 600 }}>{piecesPlaced}</span>
      </div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: '#888' }}>Inputs:</span> <span style={{ fontWeight: 600 }}>{inputs}</span>
      </div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: '#888' }}>Holds:</span> <span style={{ fontWeight: 600 }}>{holds}</span>
      </div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: '#888' }}>Finesse:</span>{' '}
        <span style={{ fontWeight: 600 }}>
          {piecesPlaced > 0 ? (inputs / piecesPlaced).toFixed(2) : '0.00'}
        </span>
      </div>
    </div>
  );
};

export default React.memo(StatusPanel);

