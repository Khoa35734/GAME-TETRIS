import { useState, useEffect } from "react";
import { createStage } from "../gamehelper";
import type { Player } from "./usePlayer";

export type CellValue = string | number;
export type Cell = [CellValue, string];
export type Stage = Cell[][];

export const useStage = (player: Player): [Stage, React.Dispatch<React.SetStateAction<Stage>>, number] => {
  const [stage, setStage] = useState<Stage>(createStage());
  const [rowsCleared, setRowsCleared] = useState(0);

  useEffect(() => {
    setRowsCleared(0);

    const sweepRows = (newStage: Stage): Stage =>
      newStage.reduce((ack: Stage, row) => {
        if (row.findIndex((cell) => cell[0] === 0) === -1) {
          setRowsCleared((prev) => prev + 1);
          ack.unshift(new Array(newStage[0].length).fill([0, 'clear']) as Cell[]);
          return ack;
        }
        ack.push(row);
        return ack;
      }, [] as Stage);

    const updateStage = (prevStage: Stage): Stage => {
      const newStage = prevStage.map(
        (row) => row.map((cell) => (cell[1] === 'clear' ? [0, 'clear'] : cell)) as Cell[]
      );

      player.tetromino.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            newStage[y + player.pos.y][x + player.pos.x] = [
              value,
              `${player.collided ? 'merged' : 'clear'}`,
            ];
          }
        });
      });

      if (player.collided) {
        return sweepRows(newStage);
      }
      return newStage;
    };

    setStage((prev) => updateStage(prev));
  }, [player]);

  return [stage, setStage, rowsCleared];
};