import React from "react";
import Cell from "./Cell";
import { StyledStage } from "./styles/StyledStage";
import type { Stage as StageType, Player } from '../gamehelper'; 
import { STAGE_WIDTH, STAGE_HEIGHT, getGhostTetromino, calculateGhostPosition } from '../gamehelper';

interface StageProps {
  stage: StageType;
  player: Player;
}

const Stage: React.FC<StageProps> = ({ stage, player }) => {
  // Tính vị trí ghost piece
  const ghostPos = calculateGhostPosition(player, stage);
  const ghostTetromino = getGhostTetromino(player);

  // Tạo ghost cells
  const ghostCells: React.ReactNode[] = [];
  for (let y = 0; y < ghostTetromino.length; y++) {
    for (let x = 0; x < ghostTetromino[y].length; x++) {
      if (ghostTetromino[y][x] !== 0) {
        const ghostCellX = ghostPos.x + x;
        const ghostCellY = ghostPos.y + y;
        if (
          ghostCellX >= 0 &&
          ghostCellX < STAGE_WIDTH &&
          ghostCellY >= 0 &&
          ghostCellY < STAGE_HEIGHT &&
          stage[ghostCellY][ghostCellX][1] === 'clear' // Chỉ hiển thị ghost nếu ô trống
        ) {
          ghostCells.push(<Cell key={`ghost-${ghostCellX}-${ghostCellY}`} type="ghost" />);
        }
      }
    }
  }

  return (
    <StyledStage height={STAGE_HEIGHT} width={STAGE_WIDTH}>
      {stage.map((row, y) =>
        row.map((cell, x) => (
          <Cell key={`${y}-${x}`} type={cell[0] as keyof typeof import('./tetrominos').TETROMINOES} />
        ))
      )}
      {ghostCells}
    </StyledStage>
  );
};

export default Stage;