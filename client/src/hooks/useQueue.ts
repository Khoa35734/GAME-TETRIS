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
  const [queue, setQueue] = useState<TType[]>(() => shuffle([...BAG, ...BAG]));
  const lastChosen = useRef<TType>("T"); // 🔒 giữ kết quả đã chọn một cách chắc chắn

  const refill = (rest: TType[]) =>
    rest.length < 7 ? [...rest, ...shuffle([...BAG])] : rest;

  // ✅ Bốc NGẪU NHIÊN trong N khối đầu, không phụ thuộc thời điểm setState
  const popNext = useCallback((): TType => {
    setQueue(prev => {
      const chosen = (prev[0] ?? "T") as TType;    // ⬅️ lấy phần tử đầu
      lastChosen.current = chosen;
      const rest = prev.slice(1);
      return refill(rest);
    });
    return lastChosen.current;
  }, []);
  const nextN = useMemo(() => queue.slice(0, previewSize), [queue, previewSize]);
  return { nextN, popNext };
}


