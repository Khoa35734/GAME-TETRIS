import { useState, useCallback, useRef, useEffect } from 'react';
import { checkCollision } from '../../../game/gamehelper';
import * as U from '../game/utils';
import type { StageType, StageCell, GameCoreSetters } from '../game/types';
import type { Player } from '../../../hooks/usePlayer';

const GARBAGE_DELAY_MS = 340; // ~340ms is TETR.IO standard

interface GarbagePacket {
  id: number;
  amount: number;
  isLocked: boolean;
  holeColumn: number; // 🎯 Vị trí lỗ hổng cố định cho toàn bộ gói này
}

type GarbageProps = {
  player: Player;
  setStage: GameCoreSetters['setStage'];
  updatePlayerPos: GameCoreSetters['updatePlayerPos'];
  setIsApplyingGarbage: GameCoreSetters['setIsApplyingGarbage'];
};

export const useGarbage = ({ player, setStage, updatePlayerPos, setIsApplyingGarbage }: GarbageProps) => {
  const [garbagePackets, setGarbagePackets] = useState<GarbagePacket[]>([]);
  
  const packetLockTimers = useRef<Map<number, number>>(new Map());
  const animationFrameRef = useRef<number>();
  const lastHoleColumn = useRef<number | null>(null); // 🎯 Lỗ của gói trước đó

  const applyGarbageRows = useCallback(async (count: number, holeColumn?: number): Promise<StageType | null> => {
    if (count <= 0) return Promise.resolve(null);
    
    setIsApplyingGarbage(true);
    // 🎯 Sử dụng holeColumn từ packet (đã được random khi nhận)
    const hole = holeColumn !== undefined ? holeColumn : Math.floor(Math.random() * player.stage[0].length);
    console.log(`[Garbage] 🔽 Applying ${count} rows with hole at column ${hole}...`);
    
    // This implementation has a flaw: it uses setTimeout for animation, which can be slow and stuttery.
    // For now, we keep the logic but acknowledge it can be improved.
    return new Promise((resolve) => {
      let currentRow = 0;
      let finalStage: StageType | null = null;

      const applyNextRow = () => {
        let collisionDetected = false;
        let stageAfterPush: StageType | null = null;
        
        setStage(prev => {
          const newStage = prev.map(r => [...r] as StageCell[]) as StageType;
          newStage.shift();
          newStage.push(U.createGarbageRow(player.stage[0].length, hole));
          
          if (checkCollision(player, newStage, { x: 0, y: 0 })) {
            collisionDetected = true;
          }
          stageAfterPush = newStage;
          return newStage;
        });

        currentRow++;

        if (collisionDetected) {
          console.log(`[Garbage] ⚠️ Collision! Stopping at row ${currentRow}/${count}`);
          updatePlayerPos({ x: 0, y: 0, collided: true });
          setIsApplyingGarbage(false);
          resolve(stageAfterPush);
          return;
        }
        
        if (currentRow >= count) {
          console.log(`[Garbage] ✅ Applied ${count} rows successfully!`);
          setIsApplyingGarbage(false);
          resolve(stageAfterPush);
          return;
        }
        
        setTimeout(applyNextRow, 50); // Animation delay
      };
      
      applyNextRow();
    });
  }, [setStage, player, updatePlayerPos, setIsApplyingGarbage]);

  const receiveGarbage = useCallback((amount: number) => {
    if (amount <= 0) return;
    
    // 🎯 Random vị trí lỗ (tránh trùng với gói trước)
    const boardWidth = player.stage[0]?.length || 10;
    let holeColumn: number;
    
    if (lastHoleColumn.current !== null && boardWidth > 1) {
      // Chống lặp: tránh lỗ giống gói trước
      do {
        holeColumn = Math.floor(Math.random() * boardWidth);
      } while (holeColumn === lastHoleColumn.current && Math.random() < 0.75); // 75% tránh trùng
    } else {
      holeColumn = Math.floor(Math.random() * boardWidth);
    }
    
    lastHoleColumn.current = holeColumn;
    console.log(`[Garbage] 📨 Received packet: ${amount} lines, hole at column ${holeColumn}`);
    
    const newPacket: GarbagePacket = {
      id: Date.now() + Math.random(),
      amount,
      isLocked: false,
      holeColumn, // 🎯 Lưu vị trí lỗ cố định
    };
    
    setGarbagePackets(prev => [...prev, newPacket]);
    packetLockTimers.current.set(newPacket.id, GARBAGE_DELAY_MS);
  }, []);

  const cancelGarbage = useCallback((attackPower: number): number => {
    if (attackPower <= 0) return 0;
    
    let powerLeft = attackPower;
    let canceledAmount = 0;
    
    setGarbagePackets(prev => {
      const newPackets = [...prev];
      
      // ⚠️ CRITICAL: Cancel LOCKED (Red) packets first - they're immediate danger!
      for (let i = 0; i < newPackets.length && powerLeft > 0; i++) {
        const packet = newPackets[i];
        if (packet.isLocked) {
          const cancel = Math.min(powerLeft, packet.amount);
          packet.amount -= cancel;
          powerLeft -= cancel;
          canceledAmount += cancel;
          console.log(`[Garbage] 🛡️ Canceled ${cancel} LOCKED (red) lines!`);
        }
      }
      
      // Then cancel UNLOCKED (Green/Yellow) packets if attack power is left
      for (let i = 0; i < newPackets.length && powerLeft > 0; i++) {
        const packet = newPackets[i];
        if (!packet.isLocked) {
          const cancel = Math.min(powerLeft, packet.amount);
          packet.amount -= cancel;
          powerLeft -= cancel;
          canceledAmount += cancel;
          console.log(`[Garbage] 🛡️ Canceled ${cancel} UNLOCKED (green) lines!`);
        }
      }

      const filteredPackets = newPackets.filter(p => p.amount > 0);
      if (canceledAmount > 0) {
        console.log(`[Garbage] ✅ Total canceled: ${canceledAmount} lines!`);
      }
      
      // Clean up timers for removed packets
      const remainingIds = new Set(filteredPackets.map(p => p.id));
      for (const id of packetLockTimers.current.keys()) {
        if (!remainingIds.has(id)) {
          packetLockTimers.current.delete(id);
        }
      }
      
      return filteredPackets;
    });

    return canceledAmount;
  }, []);

  const triggerGarbageApply = useCallback(async () => {
    const packetToApply = garbagePackets.find(p => p.isLocked);
    if (!packetToApply) return null;

    console.log(`[Garbage] 🔻 Triggering apply for packet: ${packetToApply.amount} lines, hole=${packetToApply.holeColumn}`);
    
    setGarbagePackets(prev => prev.filter(p => p.id !== packetToApply.id));
    packetLockTimers.current.delete(packetToApply.id);

    // 🎯 Truyền holeColumn từ packet vào applyGarbageRows
    return await applyGarbageRows(packetToApply.amount, packetToApply.holeColumn);
  }, [garbagePackets, applyGarbageRows]);

  useEffect(() => {
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      let needsUpdate = false;
      for (const [id, timeLeft] of packetLockTimers.current.entries()) {
        const newTimeLeft = timeLeft - deltaTime;
        if (newTimeLeft <= 0) {
          packetLockTimers.current.delete(id);
          setGarbagePackets(prev => {
            const newPackets = prev.map(p => p.id === id ? { ...p, isLocked: true } : p);
            if (prev.some(p => p.id === id && !p.isLocked)) {
              console.log(`[Garbage] 🔴 Packet locked! Ready to apply.`);
              return newPackets;
            }
            return prev;
          });
        } else {
          packetLockTimers.current.set(id, newTimeLeft);
        }
        needsUpdate = true;
      }
      
      if (needsUpdate || garbagePackets.length > 0) {
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [garbagePackets.length]);

  const lockedAmount = garbagePackets.filter(p => p.isLocked).reduce((sum, p) => sum + p.amount, 0);
  const unlockedAmount = garbagePackets.filter(p => !p.isLocked).reduce((sum, p) => sum + p.amount, 0);

  return {
    garbageQueue: unlockedAmount, // For UI (yellow bar)
    garbageQueueLocked: lockedAmount > 0, // For UI (is there any red)
    lockedGarbageAmount: lockedAmount, // Specific amount for red bar
    
    receiveGarbage,
    cancelGarbage,
    triggerGarbageApply,
    applyGarbageRows,

    // Legacy compatibility for other hooks that might use these
    incomingGarbage: unlockedAmount + lockedAmount,
    setIncomingGarbage: () => {}, // This is now managed internally
    garbageToSend: 0, // Should be managed by useMechanics
    setGarbageToSend: () => {},
    opponentIncomingGarbage: 0,
    setOpponentIncomingGarbage: () => {},
  };
};
