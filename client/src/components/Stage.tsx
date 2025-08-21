import React from "react";
import Cell from "./Cell";
import { StyledStage } from "./styles/StyledStage";
// Sửa lỗi: Import kiểu "Stage" trực tiếp từ gameHelpers
import type { Stage as StageType } from '../gamehelper'; 

type Props = {
  stage: StageType; // Sử dụng kiểu đã import
}

const Stage: React.FC<Props> = ({ stage }) => (
  <StyledStage width={stage[0].length} height={stage.length}>
    {stage.map((row) => row.map((cell, x) => <Cell key={x} type={cell[0]} />))}
  </StyledStage>
);

export default Stage;