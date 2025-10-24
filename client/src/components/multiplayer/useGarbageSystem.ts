// import { useCallback, useState } from 'react';
// import type { Stage as StageType, Cell as StageCell } from '../../game/gamehelper';
// import socket from '../../socket';

// export const useGarbageSystem = (roomId: string | null, sendUDP: Function, _sendTopout: Function) => {
//   const [incomingGarbage, setIncomingGarbage] = useState(0);
//   const [opponentIncomingGarbage, setOpponentIncomingGarbage] = useState(0);

//   const sendGarbage = useCallback((lines: number) => {
//     const sent = sendUDP('garbage', { lines }, true);
//     if (!sent && roomId) socket.emit('game:attack', roomId, { lines });
//   }, [sendUDP, roomId]);

//   const applyGarbageRows = useCallback((setStage: any, _player: any, _updatePlayerPos: any, count: number) => {
//     if (count <= 0) return;
//     console.log(`[applyGarbageRows] Applying ${count} rows`);
//     setStage((prev: StageType) => {
//       const width = prev[0].length;
//       let stage = [...prev];
//       for (let i = 0; i < count; i++) {
//         const hole = Math.floor(Math.random() * width);
//         stage.shift();
//         stage.push(Array.from({ length: width }, (_, x) =>
//           x === hole ? [0, 'clear'] : ['garbage', 'merged']
//         ) as StageCell[]);
//       }
//       return stage;
//     });
//   }, []);

//   return {
//     incomingGarbage,
//     opponentIncomingGarbage,
//     sendGarbage,
//     applyGarbageRows,
//     setIncomingGarbage,
//     setOpponentIncomingGarbage,
//   };
// };
