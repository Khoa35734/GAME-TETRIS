export type TType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export const BAG: TType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

export function* bagGenerator(seed = Date.now()): Generator<TType, any, any> {
  // Simple LCG for deterministic shuffle per room
  let s = seed >>> 0;
  const rand = () => ((s = (1664525 * s + 1013904223) >>> 0) / 2 ** 32);
  while (true) {
    const bag = [...BAG];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    for (const t of bag) yield t;
  }
}

export function nextPieces(gen: Generator<TType, any, any>, n: number) {
  const arr: TType[] = [];
  for (let i = 0; i < n; i++) arr.push(gen.next().value as TType);
  return arr;
}
