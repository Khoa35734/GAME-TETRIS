import React from "react";
import { StyledCell } from "./styles/StyledCell";
import { TETROMINOES } from "./tetrominos";

interface CellProps {
  type: string | number;
  isBuffer?: boolean;
}

const Cell: React.FC<CellProps> = ({ type, isBuffer }) => {
  // Xác định loại tetromino và màu sắc
  let tetrominoType: keyof typeof TETROMINOES;
  
  if (typeof type === 'string' && type.startsWith('ghost:')) {
    const realType = type.split(':')[1] as keyof typeof TETROMINOES;
    tetrominoType = realType in TETROMINOES ? realType : 0;
    const color = TETROMINOES[tetrominoType].color;
    return <StyledCell type={'ghost'} color={color} />;
  } else if (typeof type === 'string' && type in TETROMINOES) {
    tetrominoType = type as keyof typeof TETROMINOES;
  } else if (type === 'ghost') {
    tetrominoType = 'ghost';
  } else if (type === 'W') {
    tetrominoType = 'W';
  } else {
    tetrominoType = 0;
  }
  
  const color = TETROMINOES[tetrominoType].color;
  return <StyledCell type={type} color={color} isBuffer={isBuffer} />;
};

export default Cell;