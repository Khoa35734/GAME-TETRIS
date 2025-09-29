import styled from "styled-components";

type Props = {
  type: string | number;
  color: string;
  isBuffer?: boolean;
}

export const StyledCell = styled.div<Props>`
  width: auto;
  background: ${(props) => {
    const isEmpty = props.type === 0 || props.type === '0';
    if (props.isBuffer && isEmpty) return 'transparent';
    if (props.type === 'W') return 'rgba(255,255,255,1)';
    const alpha = props.type === 'ghost' ? '0.18' : '0.8';
    return `rgba(${props.color}, ${alpha})`;
  }};
  border: ${(props) => {
    const isEmpty = props.type === 0 || props.type === '0';
    if (props.isBuffer && isEmpty) return '0px solid transparent'; // 3 hàng đầu: ô trống không viền
    if (props.type === 'ghost') return '1px dashed rgba(0,0,0,0.35)';
    if (isEmpty) return '0px solid transparent';
    return '1px solid #000'; // Block luôn có viền đen, kể cả trong 3 hàng đầu
  }};
  border-color: ${(props) => {
    const isEmpty = props.type === 0 || props.type === '0';
    if (isEmpty) return 'transparent';
    if (props.type === 'ghost') return 'rgba(0,0,0,0.35)';
    return '#000';
  }};

`;