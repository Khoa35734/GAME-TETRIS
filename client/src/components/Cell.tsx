import React from "react";
import { StyledCell } from "./styles/StyledCell";
import { TETROMINOES } from "./tetrominos";

interface CellProps {
  type: keyof typeof TETROMINOES;
}

const Cell: React.FC<CellProps> = ({ type }) => {
  const color = TETROMINOES[type].color;
  return <StyledCell type={type} color={color} />;
};

export default Cell;