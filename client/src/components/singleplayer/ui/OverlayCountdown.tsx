import React from 'react';
import styled, { keyframes } from 'styled-components';

// Animation cho số đếm ngược
const countdownAnimation = keyframes`
  0% { transform: scale(1.5); opacity: 0; }
  50% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0; }
`;

const OverlayWrapper = styled.div`
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(2px);
  z-index: 1000; // Đảm bảo nó nổi lên trên
`;

const CountdownNumber = styled.div`
  color: #fff;
  font-size: 120px; // Kích thước lớn
  font-weight: 800;
  text-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  animation: ${countdownAnimation} 1s ease-out forwards; // Áp dụng animation
`;

interface Props { countdown: number; }

export const OverlayCountdown: React.FC<Props> = ({ countdown }) => (
  <OverlayWrapper>
    {/* Key={countdown} để reset animation mỗi khi số thay đổi */}
    <CountdownNumber key={countdown}>
      {countdown > 0 ? countdown : 'GO!'}
    </CountdownNumber>
  </OverlayWrapper>
);