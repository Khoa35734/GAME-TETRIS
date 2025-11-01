import { useState, useCallback, useRef, useEffect } from 'react';
import { checkCollision } from '../../../game/gamehelper';
import * as U from '../game/utils';
import type { StageType, StageCell, GameCoreSetters } from '../game/types';
import type { Player } from '../../../hooks/usePlayer';

type GarbageProps = {
  player: Player;
  setStage: GameCoreSetters['setStage'];
  updatePlayerPos: GameCoreSetters['updatePlayerPos'];
  setIsApplyingGarbage: GameCoreSetters['setIsApplyingGarbage'];
};

/**
 * 🎯 Garbage System theo cơ chế TETR.IO
 * 
 * - garbageQueue: Hàng rác đang chờ (màu xanh - có thể cancel)
 * - garbageToSend: Hàng rác sẽ gửi đi (tích lũy từ combo)
 * - opponentIncomingGarbage: Hàng rác đối phương đang nhận
 */
export const useGarbage = ({ player, setStage, updatePlayerPos, setIsApplyingGarbage }: GarbageProps) => {
  // Garbage Queue: Hàng rác đang chờ
  const [garbageQueue, setGarbageQueue] = useState(0); // Hiển thị trên GarbageQueueBar (màu xanh)
  const [garbageQueueLocked, setGarbageQueueLocked] = useState(false); // Đỏ = locked, không thể cancel
  
  // Garbage to Send: Hàng rác tích lũy để gửi
  const [garbageToSend, setGarbageToSend] = useState(0);
  
  // Opponent's incoming garbage (để hiển thị trên UI)
  const [opponentIncomingGarbage, setOpponentIncomingGarbage] = useState(0);
  
  const garbageDelayTimerRef = useRef<number | null>(null);
  const lastClearTimeRef = useRef<number>(0);

  /**
   * 🎲 Apply garbage rows với animation (chèn từ đáy lên)
   * Mỗi hàng có 1 lỗ ngẫu nhiên cố định cho toàn bộ batch
   */
  const applyGarbageRows = useCallback((count: number, holeColumn?: number): Promise<StageType | null> => {
    if (count <= 0) return Promise.resolve(null);
    console.log(`[Garbage] 🔽 Applying ${count} rows...`);
    
    setIsApplyingGarbage(true);
    
    // Random hole cho toàn bộ batch
    const hole = holeColumn !== undefined ? holeColumn : Math.floor(Math.random() * 10);
    
    return new Promise((resolve) => {
      let currentRow = 0;
      let finalStage: StageType | null = null;
      let collisionDetected = false;
      
      const applyNextRow = () => {
        if (collisionDetected) {
          console.log(`[Garbage] ⚠️ Collision! Stopping at row ${currentRow}/${count}`);
          setIsApplyingGarbage(false);
          updatePlayerPos({ x: 0, y: 0, collided: true });
          resolve(finalStage);
          return;
        }
        
        if (currentRow >= count) {
          console.log(`[Garbage] ✅ Applied ${count} rows successfully!`);
          setIsApplyingGarbage(false);
          resolve(finalStage);
          return;
        }
        
        setStage(prev => {
          if (!prev.length) {
            finalStage = prev;
            return prev;
          }
          const width = prev[0].length;
          const cloned = prev.map(row => row.map(cell => [cell[0], cell[1]] as StageCell)) as StageType;
          
          cloned.shift(); // Remove top row
          cloned.push(U.createGarbageRow(width, hole)); // Same hole for all rows
          
          if (checkCollision(player, cloned, { x: 0, y: 0 })) {
            collisionDetected = true;
          }
          
          finalStage = cloned;
          return cloned;
        });
        
        currentRow++;
        setTimeout(applyNextRow, collisionDetected ? 0 : 100);
      };
      
      applyNextRow();
    });
  }, [setStage, player, updatePlayerPos, setIsApplyingGarbage]);

  /**
   * 📨 Nhận garbage từ đối phương
   * Push vào queue (màu xanh), bắt đầu đếm delay
   */
  const receiveGarbage = useCallback((amount: number) => {
    if (amount <= 0) return;
    
    console.log(`[Garbage] 📨 Received ${amount} lines from opponent`);
    setGarbageQueue(prev => prev + amount);
    lastClearTimeRef.current = Date.now();
    
    // Clear timer cũ
    if (garbageDelayTimerRef.current) {
      clearTimeout(garbageDelayTimerRef.current);
    }
    
    // Set timer 500ms để lock garbage (chuyển sang đỏ)
    garbageDelayTimerRef.current = window.setTimeout(() => {
      setGarbageQueueLocked(true);
      console.log(`[Garbage] 🔴 Queue locked! Ready to apply.`);
    }, 500);
  }, []);

  /**
   * 💥 Cancel garbage khi tấn công
   * Trừ garbage trong queue trước khi nó lock
   */
  const cancelGarbage = useCallback((attackPower: number): number => {
    if (attackPower <= 0) return 0;
    
    let actualCanceled = 0;
    
    setGarbageQueue(prev => {
      const remaining = Math.max(0, prev - attackPower);
      const canceled = prev - remaining;
      actualCanceled = canceled;
      
      if (canceled > 0) {
        console.log(`[Garbage] 🛡️ Canceled ${canceled} lines! (${remaining} remaining)`);
        
        // Reset delay timer nếu còn garbage
        if (remaining > 0) {
          if (garbageDelayTimerRef.current) {
            clearTimeout(garbageDelayTimerRef.current);
          }
          setGarbageQueueLocked(false);
          garbageDelayTimerRef.current = window.setTimeout(() => {
            setGarbageQueueLocked(true);
          }, 500);
        } else if (remaining === 0) {
          // Hết garbage → clear timer
          if (garbageDelayTimerRef.current) {
            clearTimeout(garbageDelayTimerRef.current);
            garbageDelayTimerRef.current = null;
          }
          setGarbageQueueLocked(false);
        }
      }
      
      return remaining;
    });
    
    return actualCanceled;
  }, []);

  /**
   * 🎯 Trigger apply garbage khi lock
   * Được gọi từ bên ngoài khi cần apply (ví dụ: sau khi piece lock)
   */
  const triggerGarbageApply = useCallback(async () => {
    if (garbageQueue > 0 && garbageQueueLocked) {
      const amount = garbageQueue;
      setGarbageQueue(0);
      setGarbageQueueLocked(false);
      
      if (garbageDelayTimerRef.current) {
        clearTimeout(garbageDelayTimerRef.current);
        garbageDelayTimerRef.current = null;
      }
      
      console.log(`[Garbage] 🔻 Triggering apply: ${amount} lines`);
      return await applyGarbageRows(amount);
    }
    return null;
  }, [garbageQueue, garbageQueueLocked, applyGarbageRows]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (garbageDelayTimerRef.current) {
        clearTimeout(garbageDelayTimerRef.current);
      }
    };
  }, []);

  return {
    // Queue state (để hiển thị trên UI)
    garbageQueue,
    garbageQueueLocked,
    
    // Outgoing garbage
    garbageToSend,
    setGarbageToSend,
    
    // Opponent garbage (để hiển thị)
    opponentIncomingGarbage,
    setOpponentIncomingGarbage,
    
    // Functions
    receiveGarbage,
    cancelGarbage,
    triggerGarbageApply,
    applyGarbageRows,
    
    // Legacy compatibility (backward compat với code cũ)
    incomingGarbage: garbageQueue,
    setIncomingGarbage: setGarbageQueue,
  };
};
