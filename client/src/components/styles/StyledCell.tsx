import styled from "styled-components";

type Props = {
  type: string | number;
  color: string;
}

export const StyledCell = styled.div<Props>`
  width: auto;
  background: rgba(${(props) => props.color}, ${(props) => (props.type === 'ghost' ? '0.2' : '0.8')});
  border: ${(props) => (props.type === 0 || props.type === '0' ? "0px solid" : props.type === 'ghost' ? "2px solid" : "4px solid")};
  border-bottom-color: rgba(${(props) => props.color}, ${(props) => (props.type === 'ghost' ? '0.1' : '0.1')});
  border-right-color: rgba(${(props) => props.color}, ${(props) => (props.type === 'ghost' ? '0.3' : '1')});
  border-top-color: rgba(${(props) => props.color}, ${(props) => (props.type === 'ghost' ? '0.3' : '1')});
  border-left-color: rgba(${(props) => props.color}, ${(props) => (props.type === 'ghost' ? '0.3' : '0.3')});
`;