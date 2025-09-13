import { useState, useEffect } from "react";
import { createStage, calculateGhostPosition } from "../gamehelper";
import type { Player } from "./usePlayer";

export type CellValue = string | number;
export type Cell = [CellValue, string];
export type Stage = Cell[][];

export const useStage = (player: Player): [Stage, React.Dispatch<React.SetStateAction<Stage>>, number, number] => {
  const [stage, setStage] = useState<Stage>(createStage());
  const [rowsCleared, setRowsCleared] = useState(0);
  const [clearEventId, setClearEventId] = useState(0);

  useEffect(() => {
    setRowsCleared(0);

    const sweepRows = (newStage: Stage): { stage: Stage; cleared: number } => {
      let cleared = 0;
      const result = newStage.reduce((ack: Stage, row) => {
        if (row.findIndex((cell) => cell[0] === 0) === -1) {
          cleared += 1;
          ack.unshift(new Array(newStage[0].length).fill([0, 'clear']) as Cell[]);
          return ack;
        }
        ack.push(row);
        return ack;
      }, [] as Stage);
      return { stage: result, cleared };
    };

    const updateStage = (prevStage: Stage): Stage => {
      const newStage = prevStage.map(
        (row) => row.map((cell) => (cell[1] === 'clear' ? [0, 'clear'] : cell)) as Cell[]
      );

      // Vẽ ghost trước (để bị đè bởi khối thật)
      const ghostPos = calculateGhostPosition(player as any, newStage as any);
      player.tetromino.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const gy = y + ghostPos.y;
            const gx = x + ghostPos.x;
            if (newStage[gy] && newStage[gy][gx] && newStage[gy][gx][1] === 'clear') {
              // Mã hóa ghost theo loại khối hiện tại để tô cùng màu: ghost:<type>
              const ghostValue = (`ghost:${(player as any).type}`) as unknown as CellValue;
              newStage[gy][gx] = [ghostValue, 'clear'];
            }
          }
        });
      });

      player.tetromino.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const drawY = y + player.pos.y;
            const drawX = x + player.pos.x;
            if (
              newStage[drawY] &&
              newStage[drawY][drawX] !== undefined
            ) {
              newStage[drawY][drawX] = [
                value,
                `${player.collided ? 'merged' : 'clear'}`,
              ];
            }
          }
        });
      });

      if (player.collided) {
        const { stage: swept, cleared } = sweepRows(newStage);
        if (cleared > 0) {
          setRowsCleared(cleared);
          setClearEventId((prev) => prev + 1);
        } else {
          setRowsCleared(0);
        }
        return swept;
      }
      setRowsCleared(0);
      return newStage;
    };

    setStage((prev) => updateStage(prev));
  }, [player]);

  return [stage, setStage, rowsCleared, clearEventId];
};