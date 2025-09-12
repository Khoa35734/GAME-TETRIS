import styled from "styled-components";

type Props = {
  type: string | number;
  color: string;
}

export const StyledCell = styled.div<Props>`
  width: auto;
  background: ${(props) => props.type === 'W' ? 'rgba(255,255,255,1)' : `rgba(${props.color}, ${props.type === 'ghost' ? '0.18' : '0.8'})`};
  border: ${(props) => (props.type === 0 || props.type === '0' ? "0px solid" : props.type === 'ghost' ? "2px dashed" : "4px solid")};
  border-color: ${(props) => props.type === 'W' ? 'rgba(255,255,255,1)' : props.type === 'ghost' ? 'rgba(255,255,255,0.5)' : 'transparent'};
  border-bottom-color: ${(props) => props.type === 'W' ? 'rgba(255,255,255,1)' : `rgba(${props.color}, ${props.type === 'ghost' ? '0.2' : '0.1'})`};
  border-right-color: ${(props) => props.type === 'W' ? 'rgba(255,255,255,1)' : `rgba(${props.color}, ${props.type === 'ghost' ? '0.25' : '1'})`};
  border-top-color: ${(props) => props.type === 'W' ? 'rgba(255,255,255,1)' : `rgba(${props.color}, ${props.type === 'ghost' ? '0.25' : '1'})`};
  border-left-color: ${(props) => props.type === 'W' ? 'rgba(255,255,255,1)' : `rgba(${props.color}, ${props.type === 'ghost' ? '0.25' : '0.3'})`};
`;