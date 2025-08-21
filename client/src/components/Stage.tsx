import React from "react";
import { StyledStage } from "./styles/StyledStage";
import Cell from "./Cell";

interface StageProps {
  stage: Array<Array<{ type: string }>>;
}

const Stage: React.FC<StageProps> = ({ stage }) => (
  <StyledStage>
    {stage.map((row, y) =>
      row.map((cell, x) => <Cell key={`${x}-${y}`} type={cell.type} />)
    )}
  </StyledStage>
);

export default Stage;
