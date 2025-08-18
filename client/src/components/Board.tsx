import React from 'react';
import Cell from './Cell';

// Giả sử board là một mảng 2 chiều
const Board: React.FC<{ board: any[][] }> = ({ board }) => (
  <div>
    {board.map(row => row.map((cell, x) => <Cell key={x} type={cell[0]} />))}
  </div>
);

export default Board;