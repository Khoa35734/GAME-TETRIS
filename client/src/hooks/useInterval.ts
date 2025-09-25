import { useEffect, useRef } from "react";

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>(undefined);

  // Ghi nhớ callback mới nhất
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Thiết lập interval
  useEffect(() => {
    function tick() {
      if(savedCallback.current) {
        savedCallback.current();
      }
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => {
        clearInterval(id);
      };
    }
  }, [delay]);
}