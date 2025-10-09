import React from 'react';

interface GarbageQueueBarProps {
  count: number;
}

const GarbageQueueBar: React.FC<GarbageQueueBarProps> = ({ count }) => {
  // Always show the bar container for debugging
  const displayCount = Math.min(Math.max(count, 0), 20);

  return (
    <div
      className="garbage-bar"
      style={{
        position: 'relative',
        width: '20px', // Wider for better visibility
        height: '600px', // Match Tetris board height (20 rows * 30px)
        display: 'flex',
        flexDirection: 'column-reverse',
        justifyContent: 'flex-start',
        gap: '2px',
        background: count > 0 ? 'rgba(255, 107, 107, 0.15)' : 'rgba(50, 50, 50, 0.3)',
        border: count > 0 ? '3px solid #ff6b6b' : '2px solid rgba(255, 255, 255, 0.2)', 
        borderRadius: '6px',
        padding: '4px',
        transition: 'all 0.2s ease-in-out',
        boxShadow: count > 0 ? '0 0 12px rgba(255, 107, 107, 0.4)' : 'none',
      }}
    >
      {/* Horizontal grid lines (every 30px = 1 Tetris row) */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={`line-${i}`}
          style={{
            position: 'absolute',
            bottom: `${i * 30}px`,
            left: 0,
            right: 0,
            height: '1px',
            background: 'rgba(255, 255, 255, 0.1)',
            pointerEvents: 'none',
          }}
        />
      ))}
      
      {count === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.4)',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}>
          0
        </div>
      )}
      
      {/* Show count number at top */}
      {count > 0 && (
        <div style={{
          position: 'absolute',
          top: '-24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ff6b6b',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
          padding: '4px 8px',
          borderRadius: '6px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
        }}>
          {count}
        </div>
      )}
      
      {/* White horizontal threshold line - positioned above bottom-most block */}
      {count > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: `${displayCount * 30}px`, // Position based on garbage count
            left: '-2px',
            right: '-2px',
            height: '3px',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.95), transparent)',
            boxShadow: '0 0 8px rgba(255, 255, 255, 0.9), 0 0 16px rgba(255, 255, 255, 0.5)',
            borderRadius: '2px',
            zIndex: 10,
          }}
        />
      )}

      {/* Render garbage blocks - each block = 30px (1 Tetris row) */}
      {count > 0 && Array.from({ length: displayCount }).map((_, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            bottom: `${index * 30 + 4}px`, // Stack from bottom, 4px padding
            left: '4px',
            right: '4px',
            height: '28px', // Slightly less than 30px for gap
            background: 'linear-gradient(180deg, #ff6b6b 0%, #ff5252 100%)',
            borderRadius: '3px',
            boxShadow: 'inset 0 -2px 4px rgba(0, 0, 0, 0.3), 0 0 6px rgba(255, 107, 107, 0.5)',
            animation: 'garbagePulse 1s ease-in-out infinite',
            animationDelay: `${index * 0.05}s`,
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        />
      ))}

      {/* Overflow indicator */}
      {count > 20 && (
        <div
          style={{
            width: '100%',
            background: '#ff6b6b',
            color: 'white',
            fontSize: '8px',
            fontWeight: 'bold',
            textAlign: 'center',
            padding: '2px 0',
            borderRadius: '2px',
            marginTop: '4px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          }}
        >
          +{count - 20}
        </div>
      )}
    </div>
  );
};

export default GarbageQueueBar;
