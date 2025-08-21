import React from "react";
import { StyledCell } from "./styles/StyledCell";
import { TETROMINOS } from "./tetrominos";

interface CellProps {
  type: keyof typeof TETROMINOS;
}

const Cell: React.FC<CellProps> = ({ type }) => (
  <StyledCell type={type} color={TETROMINOS[type].color}>
    {console.log("rerender")}
  </StyledCell>
);
export default React.memo(Cell);
