import { useState, useCallback } from 'react';
import { randomTetromino, TETROMINOS } from '../components/tetrominos';
export const usePlayer = () => {
  const [player, setPlayer] = useState<{
    pos: { x: number; y: number };
    tetromino: { shape: (string | number)[][]; color: string };
    collided: boolean;
  }>({
    pos: { x: 0, y: 0 },
    tetromino: TETROMINOS[0],
    collided: false,
  });

  const updatePlayerPos = ({ x, y, collided }: { x: number, y: number, collided: boolean }) => {
    setPlayer(prev => ({
      ...prev,
      pos: { x: (prev.pos.x += x), y: (prev.pos.y += y) },
      collided,
    }));
  };

  const resetPlayer = useCallback(() => {
    setPlayer({
      pos: { x: 5, y: 0 }, // Vị trí bắt đầu
      tetromino: randomTetromino(),
      collided: false,
    });
  }, []);

  return [player, updatePlayerPos, resetPlayer];
};