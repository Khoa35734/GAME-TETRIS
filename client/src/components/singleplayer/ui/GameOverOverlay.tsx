import React from 'react';
import styled from 'styled-components';

// ==========================================
// EXPORT STYLED COMPONENTS HERE
// ==========================================
export const OverlayContainer = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  z-index: 1000;
  color: #fff;
  text-align: center;
`;

export const ContentBox = styled.div`
  background: rgba(40, 40, 45, 0.95);
  padding: 32px 48px;
  border-radius: 16px;
  border: 2px solid rgba(200, 50, 50, 0.6); // Viền đỏ cho Game Over
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  min-width: 350px;
  max-width: 500px;
`;

const Title = styled.div`
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 24px;
  color: #ff5555; // Màu đỏ
  text-shadow: 0 2px 8px rgba(255, 85, 85, 0.5);
`;

export const StatsGrid = styled.div`
  font-size: 14px;
  text-align: left;
  line-height: 2; // Tăng khoảng cách dòng
  background: rgba(0, 0, 0, 0.2);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
`;

export const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px 0;
  &:last-child {
    border-bottom: none;
  }
`;

export const StatLabel = styled.span`
  color: #aaa;
`;

export const StatValue = styled.span`
  font-weight: 600;
`;

export const ButtonGroup = styled.div`
  margin-top: 32px;
  display: flex;
  justify-content: center;
  gap: 16px;
`;

// Nút chung (có thể tách ra component riêng)
const StyledButton = styled.button`
  border: none;
  color: #fff;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }
`;

export const PrimaryButton = styled(StyledButton)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

export const SecondaryButton = styled(StyledButton)`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.25);
`;
// ==========================================
// END EXPORT
// ==========================================


interface Props {
  elapsedMs: number; rows: number; level: number; piecesPlaced: number; inputs: number; holds: number;
  onTryAgain: () => void;
  onMenu: () => void;
}

export const GameOverOverlay: React.FC<Props> = ({ elapsedMs, rows, level, piecesPlaced, inputs, holds, onTryAgain, onMenu }) => {
    const pps = elapsedMs > 0 ? (piecesPlaced / (elapsedMs / 1000)).toFixed(2) : '0.00';
    const finesse = piecesPlaced > 0 ? (inputs / piecesPlaced).toFixed(2) : '0.00';
    const timeStr = (elapsedMs / 1000).toFixed(2);

    return (
      <OverlayContainer>
        <ContentBox>
          <Title>💀 GAME OVER 💀</Title>
          <StatsGrid>
            <StatRow><StatLabel>Time:</StatLabel> <StatValue>{timeStr}s</StatValue></StatRow>
            <StatRow><StatLabel>Lines Cleared:</StatLabel> <StatValue>{rows}</StatValue></StatRow>
            <StatRow><StatLabel>Level:</StatLabel> <StatValue>{level + 1}</StatValue></StatRow>
            <StatRow><StatLabel>Pieces Placed:</StatLabel> <StatValue>{piecesPlaced}</StatValue></StatRow>
            <StatRow><StatLabel>PPS (Pieces/sec):</StatLabel> <StatValue>{pps}</StatValue></StatRow>
            <StatRow><StatLabel>Total Inputs:</StatLabel> <StatValue>{inputs}</StatValue></StatRow>
            <StatRow><StatLabel>Holds Used:</StatLabel> <StatValue>{holds}</StatValue></StatRow>
            <StatRow><StatLabel>Finesse (Inputs/Piece):</StatLabel> <StatValue>{finesse}</StatValue></StatRow>
          </StatsGrid>
          <ButtonGroup>
            <PrimaryButton onClick={onTryAgain}>Try Again</PrimaryButton>
            <SecondaryButton onClick={onMenu}>Menu</SecondaryButton>
          </ButtonGroup>
        </ContentBox>
      </OverlayContainer>
    );
};