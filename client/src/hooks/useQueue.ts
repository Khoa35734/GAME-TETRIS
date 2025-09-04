
import { useCallback, useMemo, useRef, useState } from "react";

export type TType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
const BAG: TType[] = ["I","J","L","O","S","T","Z"];

export function useQueue(previewSize = 5) {
  const [queue, setQueue] = useState<TType[]>(() => Array.from({length: previewSize}, () => BAG[Math.floor(Math.random() * BAG.length)]));
  const lastChosen = useRef<TType>(queue[0]);

  // Pop từ đầu queue, push random vào cuối
  const popNext = useCallback((): TType => {
    setQueue(prev => {
      const newPiece = BAG[Math.floor(Math.random() * BAG.length)];
      lastChosen.current = prev[0];
      return [...prev.slice(1), newPiece];
    });
    return lastChosen.current;
  }, [queue]);

  const nextN = useMemo(() => queue.slice(0, previewSize), [queue, previewSize]);

  return { nextN, popNext };
}

