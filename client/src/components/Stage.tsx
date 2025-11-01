import React from "react";
import Cell from "./Cell";
import { StyledStage, BoardBackground } from "./styles/StyledStage";
import { END_BUFFER_ROWS } from "../game/gamehelper";
import type { Stage as StageType } from "../game/gamehelper";
import type { Player as PlayerType } from "../hooks/usePlayer";

type Props = {
  stage: StageType;
  showGhost?: boolean;
  player?: PlayerType;
  fillWhiteProgress?: number; // 0-100% fill white animation progress
};

const Stage: React.FC<Props> = ({
  stage,
  showGhost = true,
  fillWhiteProgress = 0,
}) => {
  const width = stage[0].length;
  const height = stage.length;

  return (
    <StyledStage width={width} height={height} $showGhost={showGhost}>
      {/* 🧱 Nền texture board (brick, metal, v.v.) */}
      <BoardBackground />

      {/* 🎮 Render toàn bộ grid */}
      {stage.map((row, y) =>
        row.map((cell, x) => {
          const totalRows = stage.length;
          const rowFromBottom = totalRows - y;
          const rowProgress = (rowFromBottom / totalRows) * 100;

          // Animation trắng khi clear hàng
          const shouldFillWhite =
            fillWhiteProgress >= rowProgress &&
            cell[1] === "merged" &&
            cell[0] !== "garbage";

          return (
            <Cell
              key={`${y}-${x}`}
              type={shouldFillWhite ? "W" : cell[0]}
              isBuffer={y < END_BUFFER_ROWS}
            />
          );
        })
      )}
    </StyledStage>
  );
};

export default Stage;
