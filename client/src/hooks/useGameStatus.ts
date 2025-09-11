
import { useState, useEffect } from "react";

export const useGameStatus = (rowsCleared: number): [
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

  // Đơn giản: mỗi hàng xóa được -> rows + rowsCleared. Không cộng điểm.
  useEffect(() => {
    if (rowsCleared > 0) {
      setRows((prev) => prev + rowsCleared);
    }
  }, [rowsCleared]);

  return [score, setScore, rows, setRows, level, setLevel];
};

