import React from 'react';
import styled from 'styled-components';
// Import lại các styled components từ GameOverOverlay hoặc tạo file chung
import { OverlayContainer, ContentBox as BaseContentBox, StatsGrid, StatRow, StatLabel, StatValue, ButtonGroup, PrimaryButton, SecondaryButton } from './GameOverOverlay'; // Giả sử GameOverOverlay export chúng

// Ghi đè style cho Win
const ContentBox = styled(BaseContentBox)`
  border: 2px solid rgba(0, 200, 100, 0.6); // Viền xanh lá
`;

const Title = styled.div`
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 24px;
  color: #00ff88; // Màu xanh lá
  text-shadow: 0 2px 8px rgba(0, 255, 136, 0.5);
`;

interface Props {
  elapsedMs: number; rows: number; level: number; piecesPlaced: number; inputs: number; holds: number;
  onPlayAgain: () => void;
  onMenu: () => void;
}

export const WinOverlay: React.FC<Props> = ({ elapsedMs, rows, level, piecesPlaced, inputs, holds, onPlayAgain, onMenu }) => {
    const pps = elapsedMs > 0 ? (piecesPlaced / (elapsedMs / 1000)).toFixed(2) : '0.00';
    const finesse = piecesPlaced > 0 ? (inputs / piecesPlaced).toFixed(2) : '0.00';
    const timeStr = (elapsedMs / 1000).toFixed(2);

    return (
      <OverlayContainer>
        <ContentBox>
          <Title>🎉 YOU WIN! 🎉</Title>
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
            {/* Đổi tên nút */}
            <PrimaryButton onClick={onPlayAgain}>Play Again</PrimaryButton>
            <SecondaryButton onClick={onMenu}>Menu</SecondaryButton>
          </ButtonGroup>
        </ContentBox>
      </OverlayContainer>
    );
};