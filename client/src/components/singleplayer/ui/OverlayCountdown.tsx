import React from 'react';

interface Props { value: number | null }

export const OverlayCountdown: React.FC<Props> = ({ value }) => {
  if (value === null) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(1px)', color: '#fff', fontSize: 80, fontWeight: 800, textShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
      {value}
    </div>
  );
};

export default React.memo(OverlayCountdown);

