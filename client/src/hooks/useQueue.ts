// useQueue.ts
/**
 * 🎲 7-Bag Randomizer System
 * 
 * Cơ chế hoạt động:
 * 1. Tạo một túi chứa đủ 7 khối: I, J, L, O, S, T, Z
 * 2. Xáo trộn (shuffle) 7 khối theo thứ tự ngẫu nhiên
 * 3. Phát lần lượt từng khối ra (hiện trong NEXT + rơi xuống field)
 * 4. Khi túi hết, tạo túi mới và tiếp tục
 * 
 * Ví dụ:
 * Túi 1: [T, L, I, S, O, J, Z] ← 7 khối đã shuffle
 * Túi 2: [O, Z, T, I, J, L, S] ← 7 khối đã shuffle
 * Túi 3: [J, S, L, O, T, Z, I] ← 7 khối đã shuffle
 * 
 * Đặc điểm:
 * ✅ Mọi khối xuất hiện đúng 1 lần trong mỗi 7 khối liên tiếp
 * ✅ Không có khối nào bị "thiên vị" hay "bỏ quên"
 * ✅ Vẫn có ngẫu nhiên (thứ tự trong túi là random)
 * ⚠️ Có thể gặp "trùng túi": Túi 1 kết thúc = L, Túi 2 bắt đầu = L
 */
import { useCallback, useMemo, useRef, useState } from "react";

export type TType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
const BAG: TType[] = ["I","J","L","O","S","T","Z"];

/**
 * Hàm shuffle mảng theo thuật toán Fisher-Yates
 * Đảm bảo mỗi hoán vị có xác suất bằng nhau
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Tạo một túi 7-bag mới (7 khối khác nhau, xáo trộn ngẫu nhiên)
 */
function generateNewBag(): TType[] {
  return shuffle([...BAG]);
}

export function useQueue(previewSize = 5) {
  // Khởi tạo queue với 2 túi đầu tiên để đảm bảo có đủ khối cho preview
  const initialQueue = [...generateNewBag(), ...generateNewBag()];
  const [queue, setQueue] = useState<TType[]>(initialQueue);
  const queueRef = useRef<TType[]>(initialQueue);
  
  // Theo dõi vị trí trong bag hiện tại (để biết khi nào cần tạo bag mới)
  const bagPositionRef = useRef<number>(0);

  // Xem trước phần tử đầu tiên trong queue (không mutate)
  const peekNext = useCallback((): TType => {
    return queueRef.current[0];
  }, []);

  // Pop từ đầu queue, tự động tạo bag mới khi cần
  const popNext = useCallback((): TType => {
    const current = queueRef.current;
    const chosen = current[0];
    
    // Loại bỏ khối vừa lấy
    let updated = current.slice(1);
    
    // Kiểm tra xem còn đủ khối trong queue không
    // Nếu queue còn ít hơn previewSize + 7, tạo thêm bag mới
    if (updated.length < previewSize + 7) {
      const newBag = generateNewBag();
      updated = [...updated, ...newBag];
    }
    
    queueRef.current = updated;
    setQueue(updated);
    return chosen;
  }, [previewSize]);

  const nextN = useMemo(() => queue.slice(0, previewSize), [queue, previewSize]);

  // External controls for server-synced queues (cho multiplayer)
  const setSeed = useCallback((pieces: TType[]) => {
    const seed = pieces.length >= previewSize ? pieces.slice(0, pieces.length) : [...pieces];
    queueRef.current = seed;
    setQueue(seed);
    bagPositionRef.current = 0; // Reset bag position khi set seed
  }, [previewSize]);

  const pushMany = useCallback((pieces: TType[]) => {
    if (!pieces || pieces.length === 0) return;
    const updated = [...queueRef.current, ...pieces];
    queueRef.current = updated;
    setQueue(updated);
  }, []);

  return { nextN, popNext, peekNext, setSeed, pushMany };
}