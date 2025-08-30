import { useState, useCallback } from "react";
import { STAGE_WIDTH, checkCollision } from "../gamehelper";
import { TETROMINOES, randomTetromino } from "../components/tetrominos";
import type { Stage } from "./useStage";
import type { CellValue } from "./useStage";

export type Player = {
  pos: { x: number; y: number };
  tetromino: CellValue[][];
  collided: boolean;
};

export const usePlayer = (): [
  Player,
  (pos: { x: number; y: number; collided: boolean }) => void,
  () => void,
  (stage: Stage, dir: number) => void
] => {
  const [player, setPlayer] = useState<Player>({
    pos: { x: 0, y: 0 },
    tetromino: TETROMINOES[0].shape,
    collided: false,
  });

  const rotate = (matrix: CellValue[][], dir: number): CellValue[][] => {
    // Chuyển hàng thành cột (chuyển vị)
    const rotatedTetro = matrix.map((_, index) =>
      matrix.map((col) => col[index])
    );
    // Đảo ngược mỗi hàng để xoay toàn bộ ma trận
    if (dir > 0) return rotatedTetro.map((row) => row.reverse());
    return rotatedTetro.reverse();
  };

  const playerRotate = (stage: Stage, dir: number): void => {
    const clonedPlayer = JSON.parse(JSON.stringify(player));
    clonedPlayer.tetromino = rotate(clonedPlayer.tetromino, dir);

    const pos = clonedPlayer.pos.x;
    let offset = 1;
    while (checkCollision(clonedPlayer, stage, { x: 0, y: 0 })) {
      clonedPlayer.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > clonedPlayer.tetromino[0].length) {
        rotate(clonedPlayer.tetromino, -dir);
        clonedPlayer.pos.x = pos;
        return;
      }
    }
    setPlayer(clonedPlayer);
  };

  const updatePlayerPos = ({ x, y, collided }: { x: number; y: number; collided: boolean }): void => {
    setPlayer((prev) => {
      const newX = prev.pos.x + x;
      const newY = prev.pos.y + y;
      
      return {
        ...prev,
        pos: { x: newX, y: newY },
        collided,
      };
    });
  };

  const resetPlayer = useCallback((): void => {
    const tetro = randomTetromino();
    const isT = tetro.shape.length === 3 && tetro.shape[1][1] === "T";
    setPlayer({
      pos: { x: STAGE_WIDTH / 2 - 2, y: isT ? -1 : 0 },
      tetromino: tetro.shape,
      collided: false,
    });
  }, []);

  return [player, updatePlayerPos, resetPlayer, playerRotate];
};