
import { useState } from "react";

export const useGameStatus = (): [
    number,
    React.Dispatch<React.SetStateAction<number>>,
    number,
    React.Dispatch<React.SetStateAction<number>>,
    number,
    React.Dispatch<React.SetStateAction<number>>
] => {
  const [score, setScore] = useState(0);
  const [rows, setRows] = useState(0);
  const [level, setLevel] = useState(0);

  // Việc cộng rows sẽ được thực hiện tại Tetris.tsx dựa vào sự kiện clear (clearEventId)

  return [score, setScore, rows, setRows, level, setLevel];
};

