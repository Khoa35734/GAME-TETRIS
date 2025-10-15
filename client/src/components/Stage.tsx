import React from "react";
import Cell from "./Cell";
import { StyledStage } from "./styles/StyledStage";
import { END_BUFFER_ROWS } from "../gamehelper";

// Sửa lỗi: Import kiểu "Stage" trực tiếp từ gameHelpers
import type { Stage as StageType } from '../gamehelper'; 

type Props = {
  stage: StageType; // Sử dụng kiểu đã import
  showGhost?: boolean; // Optional prop to control ghost piece visibility
}

const Stage: React.FC<Props> = ({ stage, showGhost = true }) => (
  <StyledStage width={stage[0].length} height={stage.length} showGhost={showGhost}>
    {stage.map((row, y) =>
      row.map((cell, x) => (
        <Cell key={`${y}-${x}`} type={cell[0]} isBuffer={y < END_BUFFER_ROWS} />
      ))
    )}

  </StyledStage>
);

export default Stage;