import styled from "styled-components";

interface StyledCellProps {
  type: string;
  color: string;
}

export const StyledCell = styled.div<StyledCellProps>`
  width: auto;
  background: rgba(${props => props.color}, 0.8);
  border: ${props => (props.type === 0 ? "0px solid" : "4px solid")};
  border-bottom-color: ${props => `rgba(${props.color}, 0.1)`};
  border-right-color: ${props => `rgba(${props.color}, 1)`};
  border-top-color: ${props => `rgba(${props.color}, 1)`};
  border-left-color: ${props => `rgba(${props.color}, 0.3)`};
`;
