import { useCallback } from 'react';
import { checkCollision } from '../../gamehelper';

export const useInputHandler = (player: any, stage: any, updatePlayerPos: any, playerRotateSRS: Function) => {
  const movePlayer = useCallback((dir: number) => {
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
      return true;
    }
    return false;
  }, [player, stage, updatePlayerPos]);

  const hardDrop = useCallback(() => {
    let dropDistance = 0;
    while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) dropDistance += 1;
    updatePlayerPos({ x: 0, y: dropDistance, collided: true });
  }, [player, stage, updatePlayerPos]);

  return { movePlayer, hardDrop, playerRotateSRS };
};
