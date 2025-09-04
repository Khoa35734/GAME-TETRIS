import React from "react";
import Cell from "./Cell";
import { StyledStage } from "./styles/StyledStage";
import type { Player, Stage as StageType } from '../gamehelper'; 
import { STAGE_WIDTH, STAGE_HEIGHT } from '../gamehelper';

interface StageProps {
  stage: StageType;
  player: Player
}

const Stage: React.FC<StageProps> = ({ stage }) => {
  return (
    <StyledStage height={STAGE_HEIGHT} width={STAGE_WIDTH}>
      {stage.map((row, y) =>
        row.map((cell, x) => {
          // Xác định loại cell để hiển thị
          const cellType = cell[1] === 'ghost' ? 'ghost' : cell[0];
          return <Cell key={`${y}-${x}`} type={cellType} />;
        })
      )}
    </StyledStage>
  );
};

export default Stage;