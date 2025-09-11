import React from "react";
import { StyledCell } from "./styles/StyledCell";
import { TETROMINOES } from "./tetrominos";

interface CellProps {
  type: string | number;
}

const Cell: React.FC<CellProps> = ({ type }) => {
  // Xác định loại tetromino và màu sắc
  let tetrominoType: keyof typeof TETROMINOES;
  
  if (typeof type === 'string' && type in TETROMINOES) {
    tetrominoType = type as keyof typeof TETROMINOES;
  } else if (type === 'ghost') {
    tetrominoType = 'ghost';
  } else if (type === 'W') {
    tetrominoType = 'W';
  } else {
    tetrominoType = 0;
  }
  
  const color = TETROMINOES[tetrominoType].color;
  
  return <StyledCell type={type} color={color} />;
};

export default Cell;