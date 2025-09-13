// useQueue.ts
import { useCallback, useMemo, useRef, useState } from "react";

export type TType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
const BAG: TType[] = ["I","J","L","O","S","T","Z"];

// Note: shuffle was previously used for 7-bag; removed to avoid unused warnings.

export function useQueue(previewSize = 5) {
  const initial = Array.from({ length: previewSize }, () => BAG[Math.floor(Math.random() * BAG.length)]);
  const [queue, setQueue] = useState<TType[]>(initial);
  const queueRef = useRef<TType[]>(initial);

  // Xem trước phần tử đầu tiên trong queue (không mutate)
  const peekNext = useCallback((): TType => {
    return queueRef.current[0];
  }, []);

  // Pop từ đầu queue, push random vào cuối (đồng bộ, không buffer)
  const popNext = useCallback((): TType => {
    const current = queueRef.current;
    const chosen = current[0];
    const newPiece = BAG[Math.floor(Math.random() * BAG.length)];
    const updated = [...current.slice(1), newPiece];
    queueRef.current = updated;
    setQueue(updated);
    return chosen;
  }, []);

  const nextN = useMemo(() => queue.slice(0, previewSize), [queue, previewSize]);

  return { nextN, popNext, peekNext };
}