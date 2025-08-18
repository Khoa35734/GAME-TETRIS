import React from 'react';
import styled from 'styled-components'; // Cần cài đặt: npm install styled-components

type CellProps = {
  type: keyof typeof TETROMINOS;
}

// Bạn sẽ cần định nghĩa TETROMINOS ở đâu đó để import vào đây
// Ví dụ: import { TETROMINOS } from '../tetrominos';
// const Cell = ({ type }) => <StyledCell type={type} color={TETROMINOS[type].color} />

// Ví dụ đơn giản hóa:
const StyledCell = styled.div`
  width: auto;
  background: rgba(${props => props.color}, 0.8);
  border: ${props => (props.type === 0 ? '0px solid' : '4px solid')};
  border-bottom-color: rgba(${props => props.color}, 0.1);
  border-right-color: rgba(${props => props.color}, 1);
  border-top-color: rgba(${props => props.color}, 1);
  border-left-color: rgba(${props => props.color}, 0.3);
`;

const Cell: React.FC<{ type: string }> = ({ type }) => (
    // Logic render cell dựa trên type
    <div>{type !== '0' ? '■' : ' '}</div> // Đây là ví dụ đơn giản, bạn nên dùng CSS để vẽ
);

export default Cell;