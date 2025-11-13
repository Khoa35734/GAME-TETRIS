import React from 'react';
import styled from 'styled-components';

const PanelWrapper = styled.div`
  background: rgba(20, 20, 22, 0.45); // Tăng độ mờ lên chút
  padding: 10px 12px; // Điều chỉnh padding
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  backdrop-filter: blur(5px); // Thêm hiệu ứng blur
  border: 1px solid rgba(255, 255, 255, 0.1); // Thêm viền nhẹ
`;

const Title = styled.div`
  font-weight: 700;
  margin-bottom: 8px;
  font-size: 15px;
  color: #ddd; // Màu tiêu đề
  text-transform: uppercase; // Viết hoa
  letter-spacing: 0.5px; // Giãn chữ
`;

const StatRow = styled.div`
  margin-bottom: 5px; // Giảm khoảng cách
  display: flex;
  justify-content: space-between; // Căn đều 2 bên
  line-height: 1.4;
`;

const StatLabel = styled.span`
  color: #999; // Màu nhãn nhạt hơn
`;

const StatValue = styled.span`
  font-weight: 600;
  color: #eee; // Màu giá trị sáng hơn
`;

interface Props {
  rows: number; level: number; elapsedMs: number; piecesPlaced: number; inputs: number; holds: number; linesToClear: number;
  style?: React.CSSProperties;
}

export const StatusPanel: React.FC<Props> = ({ rows, level, elapsedMs, piecesPlaced, inputs, holds, linesToClear, style }) => {
  const pps = elapsedMs > 0 ? (piecesPlaced / (elapsedMs / 1000)).toFixed(2) : '0.00';
  const finesse = piecesPlaced > 0 ? (inputs / piecesPlaced).toFixed(2) : '0.00';
  const timeStr = (elapsedMs / 1000).toFixed(2);

  return (
    <PanelWrapper style={style}>
      <Title>Status</Title>
      <StatRow>
        <StatLabel>Lines:</StatLabel>
        <StatValue>{rows} <span style={{ color: '#666', fontSize: '11px' }}> / {linesToClear}</span></StatValue>
      </StatRow>
      <StatRow>
        <StatLabel>Level:</StatLabel>
        <StatValue>{level + 1}</StatValue>
      </StatRow>
      <StatRow>
        <StatLabel>Time:</StatLabel>
        <StatValue>{timeStr}s</StatValue>
      </StatRow>
      <StatRow>
        <StatLabel>PPS:</StatLabel>
        <StatValue>{pps}</StatValue>
      </StatRow>
      <StatRow>
        <StatLabel>Pieces:</StatLabel>
        <StatValue>{piecesPlaced}</StatValue>
      </StatRow>
      <StatRow>
        <StatLabel>Inputs:</StatLabel>
        <StatValue>{inputs}</StatValue>
      </StatRow>
      <StatRow>
        <StatLabel>Holds:</StatLabel>
        <StatValue>{holds}</StatValue>
      </StatRow>
      <StatRow>
        <StatLabel>Finesse:</StatLabel>
        <StatValue>{finesse}</StatValue>
      </StatRow>
    </PanelWrapper>
  );
};