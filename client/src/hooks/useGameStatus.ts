import { useState, useEffect } from "react";

const LINE_POINTS = [40, 100, 300, 1200] as const;

export const useGameStatus = (rowsCleared: number) => {
  const [score, setScore] = useState(0);
  const [rows, setRows] = useState(0);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (rowsCleared > 0) {
      const cleared = Math.max(1, Math.min(rowsCleared, 4)); // giới hạn 1–4
      setScore((prev) => prev + LINE_POINTS[cleared - 1] * (level + 1));
      setRows((prev) => prev + cleared);
    }
  }, [rowsCleared, level]);

  const resetGameStatus = () => {
    setScore(0);
    setRows(0);
    setLevel(0);
  };

  return { score, rows, level, setLevel, resetGameStatus };
};
