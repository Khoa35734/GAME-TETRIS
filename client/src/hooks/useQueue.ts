// useQueue.ts
import { useCallback, useMemo, useRef, useState } from "react";

export type TType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
const BAG: TType[] = ["I","J","L","O","S","T","Z"];

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

export function useQueue(previewSize = 5) {
  const [queue, setQueue] = useState<TType[]>(() => Array.from({length: previewSize}, () => BAG[Math.floor(Math.random() * BAG.length)]));
  const lastChosen = useRef<TType>(queue[0]);

  // Pop từ đầu queue, push random vào cuối
  const popNext = useCallback((): TType => {
    let chosen: TType;
    setQueue(prev => {
      chosen = prev[0];
      lastChosen.current = chosen;
      // Push random vào cuối
      const newPiece = BAG[Math.floor(Math.random() * BAG.length)];
      return [...prev.slice(1), newPiece];
    });
    return lastChosen.current;
  }, []);

  const nextN = useMemo(() => queue.slice(0, previewSize), [queue, previewSize]);

  return { nextN, popNext };
}

