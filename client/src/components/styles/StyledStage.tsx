import styled from "styled-components";

export const StyledStage = styled.div`
  display: grid;
  grid-template-rows: repeat(20, 20px);
  grid-template-columns: repeat(12, 20px);
  gap: 1px;
  border: 2px solid #333;
  background: #111;
`;
