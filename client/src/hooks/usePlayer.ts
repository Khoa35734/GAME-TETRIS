import { useCallback, useMemo, useState } from "react";
import { STAGE_WIDTH, checkCollision } from "../gamehelper";
import { TETROMINOES } from "../components/tetrominos";
import type { Stage, CellValue } from "./useStage";
import { useQueue, type TType } from "./useQueue";





export type Player = {
  pos: { x: number; y: number };
  tetromino: CellValue[][];
  type: TType;
  collided: boolean;
};

const rotate = (m: CellValue[][], dir: number) => {
  const r = m.map((_, i) => m.map(c => c[i]));
  return dir > 0 ? r.map(row => row.reverse()) : r.reverse();
};

export const usePlayer = (): [
  Player,
  (pos: { x: number; y: number; collided: boolean }) => void,
  () => void,
  (stage: Stage, dir: number) => void,
  // các giá trị thêm cho UI tetr.io:
  TType | null,   // hold
  TType[],        // nextFour
  () => void      // holdSwap
] => {
  const { nextN, popRandomNext } = useQueue(5); // 5 khối hiển thị


  const [player, setPlayer] = useState<Player>({
    pos: { x: 0, y: 0 },
    tetromino: TETROMINOES["T"].shape,
    type: "T",
    collided: false,
  });

  const [hold, setHold] = useState<TType | null>(null);
  const [canHold, setCanHold] = useState(true);

  const updatePlayerPos = ({
    x, y, collided,
  }: { x: number; y: number; collided: boolean }) => {
    setPlayer(prev => ({
      ...prev,
      pos: { x: prev.pos.x + x, y: prev.pos.y + y },
      collided,
    }));
  };

  const spawnFromQueue = useCallback(() => {
  const t = popRandomNext();  // ✅ bốc random trong 5
  setPlayer({
    pos: { x: STAGE_WIDTH / 2 - 2, y: 0 },
    tetromino: TETROMINOES[t].shape,
    type: t,
    collided: false,
  });
  setCanHold(true);
}, [popRandomNext]);

  const resetPlayer = useCallback(() => {
    spawnFromQueue();
  }, [spawnFromQueue]);

  const playerRotate = (stage: Stage, dir: number) => {
    const cloned = JSON.parse(JSON.stringify(player)) as Player;
    if (cloned.type === "O") return;
    cloned.tetromino = rotate(cloned.tetromino, dir);

    const pos = cloned.pos.x;
    let offset = 1;
    while (checkCollision(cloned, stage, { x: 0, y: 0 })) {
      cloned.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > cloned.tetromino[0].length) {
        cloned.tetromino = rotate(cloned.tetromino, -dir);
        cloned.pos.x = pos;
        return;
      }
    }
    setPlayer(cloned);
  };

  const holdSwap = useCallback(() => {
  if (!canHold) return;
  setPlayer(p => {
    if (hold === null) {
      setHold(p.type);
      const t = popRandomNext(); // ✅ cũng bốc random trong 5
      setCanHold(false);
      return { pos:{x:STAGE_WIDTH/2-2,y:0}, tetromino:TETROMINOES[t].shape, type:t, collided:false };
    } else {
      const t = hold;
      setHold(p.type);
      setCanHold(false);
      return { pos:{x:STAGE_WIDTH/2-2,y:0}, tetromino:TETROMINOES[t].shape, type:t, collided:false };
    }
  });
}, [canHold, hold, popRandomNext]);

<<<<<<< HEAD
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
=======
 
  return [
    player,
    updatePlayerPos,
    resetPlayer,
    playerRotate,
    hold,
    nextN,
    holdSwap,
  ];
};
>>>>>>> Thu
