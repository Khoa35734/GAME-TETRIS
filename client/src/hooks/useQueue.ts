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
  const popRandomNext = useCallback((): TType => {
    setQueue(prev => {
      const window = Math.min(previewSize, prev.length);
      const idx = Math.floor(Math.random() * window);
      const chosen = prev[idx] as TType;

      // lưu ra ref để trả về NGAY lập tức, tránh bị trả về 'T' mặc định
      lastChosen.current = chosen;

      const rest = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      return refill(rest);
    });

    return lastChosen.current;
  }, [previewSize]);

  const nextN = useMemo(() => queue.slice(0, previewSize), [queue, previewSize]);

  return { nextN, popRandomNext };
}


