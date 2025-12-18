import React from 'react';

interface GarbageQueueBarProps {
  unlockedAmount: number; // Xanh/Vàng - Buffered (đang chờ)
  lockedAmount: number;   // Đỏ - Ready (sẵn sàng xuất hiện)
}

/**
 * Garbage Queue Bar - Logic TETR.IO Style
 * - 1 thanh dọc duy nhất, nền đen
 * - 2 màu phân tầng:
 *   + Đỏ (dưới): Rác đã "chín", sẽ xuất hiện khi lock piece mà không ăn dòng
 *   + Xanh/Vàng (trên): Rác đang bay đến, chưa kích hoạt
 */
const GarbageQueueBar: React.FC<GarbageQueueBarProps> = ({ unlockedAmount, lockedAmount }) => {
  const totalCount = unlockedAmount + lockedAmount;
  
  const barHeight = 600; // Match board height (20 rows * 30px)
  const rowHeight = barHeight / 20;
  
  // Calculate heights for each section
  const redHeight = Math.min(lockedAmount, 20) * rowHeight;
  const yellowHeight = Math.min(unlockedAmount, Math.max(0, 20 - lockedAmount)) * rowHeight;

  return (
    <div
      style={{
        position: 'relative',
        width: '24px',
        height: `${barHeight}px`,
        background: '#000', // Nền đen
        borderRadius: '4px',
        border: '2px solid rgba(100, 100, 100, 0.5)',
        overflow: 'hidden',
      }}
    >
      {/* Grid lines (20 rows) */}
      {Array.from({ length: 19 }).map((_, i) => (
        <div
          key={`grid-${i}`}
          style={{
            position: 'absolute',
            bottom: `${(i + 1) * rowHeight}px`,
            left: 0,
            right: 0,
            height: '1px',
            background: 'rgba(80, 80, 80, 0.3)',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Red Section (Locked/Ready Garbage) - Bottom */}
      {lockedAmount > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${redHeight}px`,
            background: 'linear-gradient(180deg, #ff4444 0%, #cc0000 100%)',
            transition: 'height 0.15s ease-out',
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4), 0 0 12px rgba(255, 68, 68, 0.6)',
          }}
        />
      )}

      {/* Yellow/Green Section (Buffered/Traveling Garbage) - Top */}
      {unlockedAmount > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: `${redHeight}px`,
            left: 0,
            right: 0,
            height: `${yellowHeight}px`,
            background: 'linear-gradient(180deg, #4CAF50 0%, #2E7D32 100%)',
            transition: 'height 0.15s ease-out, bottom 0.15s ease-out',
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
        />
      )}

      {/* Total Count Badge */}
      {totalCount > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '-28px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: totalCount >= 10 ? '#d32f2f' : '#424242',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 'bold',
            padding: '3px 8px',
            borderRadius: '6px',
            border: `2px solid ${totalCount >= 10 ? '#ff5252' : '#666'}`,
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
            whiteSpace: 'nowrap',
            minWidth: '22px',
            textAlign: 'center',
          }}
        >
          {totalCount}
        </div>
      )}

      {/* Warning indicator for high danger */}
      {lockedAmount >= 8 && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ff5252',
            fontSize: '16px',
            fontWeight: 'bold',
            animation: 'pulse 0.8s infinite',
            textShadow: '0 0 8px rgba(255, 82, 82, 0.8)',
          }}
        >
          ⚠
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default GarbageQueueBar;

            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.95), transparent)',
            boxShadow: '0 0 8px rgba(255, 255, 255, 0.9), 0 0 16px rgba(255, 255, 255, 0.5)',
            borderRadius: '2px',
            zIndex: 10,
            transition: 'bottom 0.2s ease-out',
          }}
        />
      )}

      {/* Overflow indicator */}
      {totalCount > 20 && (
        <div style={{ position: 'absolute', top: 0, width: '100%', background: '#c0392b', color: 'white', fontSize: '10px', fontWeight: 'bold', textAlign: 'center', padding: '2px 0' }}>
          +{totalCount - 20}
        </div>
      )}
    </div>
  );
};

export default GarbageQueueBar;