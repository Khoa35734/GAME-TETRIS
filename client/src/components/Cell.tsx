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
    // Ghost piece - lấy màu từ type thật
    const realType = type.split(':')[1] as keyof typeof TETROMINOES;
    tetrominoType = realType in TETROMINOES ? realType : 0;
    
    // 🔧 FIX: Ghost của O piece (2x2 vàng) dùng màu trắng thay vì vàng
    const color = realType === 'O' ? '255, 255, 255' : TETROMINOES[tetrominoType].color;
    
    return <StyledCell type={'ghost'} color={color} data-ghost="true" isBuffer={isBuffer} />;
  } else if (type === 'garbage') {
    // Hàng rác - màu xám
    tetrominoType = 'garbage';
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