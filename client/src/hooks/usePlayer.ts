import { useState, useCallback } from "react";
import { STAGE_WIDTH, checkCollision } from "../gamehelper";
import type { Stage } from "./useStage";

export type Player = {
  pos: { x: number; y: number };
  tetromino: (string | number)[][];
  collided: boolean;
};

export const usePlayer = (): [
  Player,
  (pos: { x: number; y: number; collided: boolean }) => void,
  () => void,
  (stage: Stage, dir: number) => void
] => {
  const [player, setPlayer] = useState<Player>({
    pos: { x: STAGE_WIDTH / 2 - 2, y: 0 },
    tetromino: [[0]],
    collided: false,
  });

  const rotate = (matrix: (string | number)[][], dir: number): (string | number)[][] => {
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
    setPlayer((prev) => ({
      ...prev,
      pos: { x: prev.pos.x + x, y: prev.pos.y + y },
      collided,
    }));
  };

  const resetPlayer = useCallback((): void => {
    setPlayer({
      pos: { x: STAGE_WIDTH / 2 - 2, y: 0 },
      tetromino: [[0]],
      collided: false,
    });
  }, []);

  return [player, updatePlayerPos, resetPlayer, playerRotate];
};