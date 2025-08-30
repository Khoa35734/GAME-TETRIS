import { useState, useEffect } from "react";
import { createStage, calculateGhostPosition, getGhostTetromino } from "../gamehelper";
import type { Player } from "./usePlayer";

export type CellValue = string | number;
export type Cell = [CellValue, string];
export type Stage = Cell[][];

export const useStage = (player: Player): [Stage, React.Dispatch<React.SetStateAction<Stage>>, number, Player] => {
  const [stage, setStage] = useState<Stage>(createStage());
  const [rowsCleared, setRowsCleared] = useState(0);
  const [ghostPlayer, setGhostPlayer] = useState<Player>({
    pos: { x: 0, y: 0 },
    tetromino: [],
    collided: false
  });

  useEffect(() => {
    setRowsCleared(0);

    // Tính toán ghost piece position
    const ghostPos = calculateGhostPosition(player, stage);
    const ghostTetromino = getGhostTetromino(player);
    
    setGhostPlayer({
      pos: ghostPos,
      tetromino: ghostTetromino,
      collided: false
    });

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
      // First, create a clean stage
      const newStage = prevStage.map(
        (row) => row.map((cell) => (cell[1] === 'clear' || cell[1] === 'ghost') ? [0, 'clear'] : cell) as Cell[]
      );

      // Draw ghost piece first (behind the actual piece)
      ghostTetromino.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const stageY = y + ghostPos.y;
            const stageX = x + ghostPos.x;
            
            if (stageY >= 0 && stageY < newStage.length &&
                stageX >= 0 && stageX < newStage[0].length &&
                newStage[stageY][stageX][1] === 'clear') {
              newStage[stageY][stageX] = [value, 'ghost'];
            }
          }
        });
      });

      // Then draw the actual player piece
      player.tetromino.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const stageY = y + player.pos.y;
            const stageX = x + player.pos.x;
            
            if (stageY >= 0 && stageY < newStage.length &&
                stageX >= 0 && stageX < newStage[0].length) {
              newStage[stageY][stageX] = [
                value,
                `${player.collided ? 'merged' : 'clear'}`,
              ];
            }
          }
        });
      });

      if (player.collided) {
        return sweepRows(newStage);
      }
      return newStage;
    };

    setStage((prev) => updateStage(prev));
  }, [player, stage]); // Thêm stage vào dependencies

  return [stage, setStage, rowsCleared, ghostPlayer];
};