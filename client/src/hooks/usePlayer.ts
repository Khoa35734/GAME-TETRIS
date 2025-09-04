import { useState, useCallback } from "react";
import { useQueue } from "./useQueue";
import type { TType } from "./useQueue";
import { STAGE_WIDTH } from "../gamehelper";
import { TETROMINOES } from "../components/tetrominos";

export type Player = {
  pos: { x: number; y: number };
  tetromino: any;
  type: TType;
  collided: boolean;
};

export const usePlayer = () => {
  const { nextN, popNext } = useQueue(5);
  const [player, setPlayer] = useState<Player>({
    pos: { x: STAGE_WIDTH / 2 - 2, y: 0 },
    tetromino: TETROMINOES["T"].shape,
    type: "T",
    collided: false,
  });
  const [hold, setHold] = useState<TType | null>(null);

  const updatePlayerPos = useCallback(({ x, y, collided }: { x: number; y: number; collided: boolean }) => {
    setPlayer(prev => ({
      ...prev,
      pos: { x: prev.pos.x + x, y: prev.pos.y + y },
      collided,
    }));
  }, []);

  const spawnFromQueue = useCallback(() => {
    const t = popNext();
    setPlayer({
      pos: { x: STAGE_WIDTH / 2 - 2, y: 0 },
      tetromino: TETROMINOES[t].shape,
      type: t,
      collided: false,
    });
  }, [popNext]);

  const resetPlayer = useCallback(() => {
    spawnFromQueue();
  }, [spawnFromQueue]);

  const holdSwap = useCallback(() => {
    setPlayer(p => {
      if (hold === null) {
        setHold(p.type);
        const t = popNext();
        return { pos: { x: STAGE_WIDTH / 2 - 2, y: 0 }, tetromino: TETROMINOES[t].shape, type: t, collided: false };
      } else {
        const temp = p.type;
        setHold(temp);
        return { pos: { x: STAGE_WIDTH / 2 - 2, y: 0 }, tetromino: TETROMINOES[hold].shape, type: hold, collided: false };
      }
    });
  }, [hold, popNext]);

  const playerRotate = useCallback((stage, dir) => {
    // ...implement rotation logic here...
  }, []);
  }, []);

  return [player, updatePlayerPos, resetPlayer, playerRotate, hold, nextN, holdSwap];
};

