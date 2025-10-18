import React from "react";
import Cell from "./Cell";
import { StyledStage } from "./styles/StyledStage";
import { END_BUFFER_ROWS } from "../gamehelper";

// Sửa lỗi: Import kiểu "Stage" trực tiếp từ gameHelpers
import type { Stage as StageType } from '../gamehelper'; 

type Props = {
  stage: StageType; // Sử dụng kiểu đã import
  showGhost?: boolean; // Optional prop to control ghost piece visibility
  fillWhiteProgress?: number; // 0-100% fill white animation progress
}

const Stage: React.FC<Props> = ({ stage, showGhost = true, fillWhiteProgress = 0 }) => (
  <StyledStage width={stage[0].length} height={stage.length} showGhost={showGhost}>
    {stage.map((row, y) =>
      row.map((cell, x) => {
        // Calculate if this cell should be filled white based on progress
        // Fill from bottom up: bottom row = y=stage.length-1
        const totalRows = stage.length;
        const rowFromBottom = totalRows - y; // 1 = bottom row, totalRows = top row
        const rowProgress = (rowFromBottom / totalRows) * 100;
        const shouldFillWhite = (
          fillWhiteProgress >= rowProgress &&
          cell[1] === 'merged' &&
          cell[0] !== 'garbage'
        );
        
        return (
          <Cell 
            key={`${y}-${x}`} 
            type={shouldFillWhite ? 'W' : cell[0]} 
            isBuffer={y < END_BUFFER_ROWS} 
          />
        );
      })
    )}

  </StyledStage>
);

export default Stage;