import styled from "styled-components";

type Props = {
  height: number;
  width: number;
};

export const StyledStage = styled.div<Props>`
  --boardW: clamp(400px, 25vw, 560px);
  display: grid;
  grid-template-rows: repeat(
    ${(props) => props.height},
    calc(var(--boardW) / ${(props) => props.width})
  );
  grid-template-columns: repeat(${(props) => props.width}, 1fr);
  grid-gap: 1px;
  border: 2px solid #333;
  width: var(--boardW);
  max-width: var(--boardW);
  background: #111;
`;