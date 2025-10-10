import React, { useCallback, useState } from "react";
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
  boolean,        // canHold
  TType[],        // nextFour
  () => void,     // holdSwap
  () => void,     // clearHold
  // server sync helpers
  (seed: TType[]) => void,
  (more: TType[]) => void,
  // SRS support
  React.Dispatch<React.SetStateAction<Player>>  // setPlayer for direct updates
] => {
  const { nextN, popNext, setSeed, pushMany } = useQueue(5); // 5 khối hiển thị


  const [player, setPlayer] = useState<Player>({
    pos: { x: 0, y: 0 },
    tetromino: TETROMINOES["T"].shape,
    type: "T",
    collided: false,
  });

  const [hold, setHold] = useState<TType | null>(null);
  // Chặn hold trước khi khối đầu tiên được spawn từ queue (fix race khi vừa Start đã Hold)
  const [canHold, setCanHold] = useState(false);

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
    const t = popNext();  // lấy khối đầu tiên, push random vào cuối
    const base = TETROMINOES[t].shape;
    // Tính 4 thế xoay (0, 90, 180, 270)
    const rotations = [0,1,2,3].map(r => {
      let matOriginal = base;
      const rot = (m: any[][]) => {
        const rt = m.map((_, i2) => m.map(c => c[i2]));
        return rt.map(row => row.reverse());
      };
      for (let i = 0; i < r; i++) matOriginal = rot(matOriginal as any) as any;
      // Tính kích thước thực tế cho tiêu chí chọn (không dùng để chơi)
      const mat = matOriginal as any[][];
      let topIdx = 0;
      while (topIdx < mat.length && mat[topIdx].every(v => v === 0)) topIdx++;
      let bottomIdx = mat.length - 1;
      while (bottomIdx >= 0 && mat[bottomIdx].every(v => v === 0)) bottomIdx--;
      const height = Math.max(0, bottomIdx - topIdx + 1);
      let leftIdx = 0;
      let rightIdx = (mat[0]?.length || 0) - 1;
      const isEmptyCol = (col: number) => mat.every(row => row[col] === 0);
      while (leftIdx <= rightIdx && isEmptyCol(leftIdx)) leftIdx++;
      while (rightIdx >= leftIdx && isEmptyCol(rightIdx)) rightIdx--;
      const width = Math.max(0, rightIdx - leftIdx + 1);
      return { r, matOriginal, height, width };
    });
    // Ưu tiên: height nhỏ nhất (nằm ngang nhất), tie-break width lớn nhất
    rotations.sort((a,b) => (a.height - b.height) || (b.width - a.width));
    const best = rotations[0];
  const pieceWidth = best.width || (best.matOriginal[0]?.length || 0);
    const startX = Math.floor((STAGE_WIDTH - pieceWidth) / 2);
    // Spawn ngay dưới vùng buffer để có không gian xoay/rơi
    const startY = 0; // chúng ta giữ 0 vì stage đã có buffer; vẽ/ẩn top đã xử lý trong Stage.tsx

    setPlayer({
      pos: { x: startX, y: startY },
  tetromino: best.matOriginal as any,
      type: t,
      collided: false,
    });
    setCanHold(true);
  }, [popNext]);

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
        // Lần hold đầu: đẩy khối hiện tại vào hold, spawn khối TIẾP THEO từ queue
        setHold(p.type);
        // Lấy khối tiếp theo từ queue (sẽ pop và thêm random vào cuối)
        const t = popNext();
        const base = TETROMINOES[t].shape;
        setCanHold(false);
        return { 
          pos: { x: STAGE_WIDTH / 2 - 2, y: 0 }, 
          tetromino: base, 
          type: t, 
          collided: false 
        };
      } else {
        // Đã có hold: hoán đổi khối hiện tại với hold (KHÔNG thay đổi queue)
        const t = hold;
        setHold(p.type);
        setCanHold(false);
        return { 
          pos: { x: STAGE_WIDTH / 2 - 2, y: 0 }, 
          tetromino: TETROMINOES[t].shape, 
          type: t, 
          collided: false 
        };
      }
    });
  }, [canHold, hold, popNext]);

  const clearHold = useCallback(() => {
    setHold(null);
    // Không bật canHold ở đây; spawnFromQueue sẽ bật khi đã có current hợp lệ từ queue
  }, []);

 
  return [
    player,
    updatePlayerPos,
    resetPlayer,
    playerRotate,
    hold,
    canHold,
    nextN,
    holdSwap,
    clearHold,
    setSeed,
    pushMany,
    setPlayer, // 🎮 Exposed for SRS rotation
  ];
};