import React from "react";
import { StyledCell } from "./styles/StyledCell";
import { TETROMINOES } from "../components/tetrominos";

type Props = {
  type: string | number;
}

const Cell: React.FC<Props> = ({ type }) => (
  <StyledCell type={type} color={TETROMINOES[type].color} />
);

export default React.memo(Cell);