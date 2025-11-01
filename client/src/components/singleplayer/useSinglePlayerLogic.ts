import { useState, useRef, useEffect, useCallback } from 'react';
import { createStage, checkCollision, isGameOverFromBuffer, isTSpin } from '../../game/gamehelper';
import { usePlayer } from '../../hooks/usePlayer';
import { useStage } from '../../hooks/useStage';
import { useGameStatus } from '../../hooks/useGameStatus';
import { useInterval } from '../../hooks/useInterval';
import { getFallSpeed } from './getFallSpeed'; // Tách hàm getFallSpeed ra file riêng
const MAX_LEVEL = 29; // Define locally since MAX_LEVEL is not exported from getFallSpeed.ts
import { DAS_DELAY, MOVE_INTERVAL, INACTIVITY_LOCK_MS, HARD_CAP_MS, HARD_DROP_DELAY } from './constants'; // Tách hằng số ra file riêng

// (Bạn có thể cần định nghĩa lại kiểu Player/Stage hoặc import từ nơi khác nếu cần)
type GameSettings = {
  linesToClear: number;
  showGhost: boolean;
  enableHardDrop: boolean;
  showNext: boolean;
  showHold: boolean;
};

export const useSinglePlayerLogic = (gameSettings: GameSettings) => {
  // --- STATE VÀ REFS CHO LOGIC GAME ---
  const [player, updatePlayerPos, resetPlayer, playerRotate, hold, canHold, nextFour, holdSwap, clearHold] = usePlayer();
  const [stage, setStage, rowsCleared, clearEventId] = useStage(player);
  const [, , rows, setRows, level, setLevel] = useGameStatus();
  const lastMoveTimeRef = useRef<number>(0);

  const [hasHeld, setHasHeld] = useState(false);
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [startGameOverSequence, setStartGameOverSequence] = useState(false);
  const [locking, setLocking] = useState(false);
  const [isGrounded, setIsGrounded] = useState(false);
  const [win, setWin] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  const [piecesPlaced, setPiecesPlaced] = useState(0);
  const [inputs, setInputs] = useState(0);
  const [holds, setHolds] = useState(0);
  const [isSoftDropping, setIsSoftDropping] = useState(false);
  const inactivityTimeoutRef = useRef<number | null>(null);
  const capTimeoutRef = useRef<number | null>(null);
  const capExpiredRef = useRef<boolean>(false);
  const groundedSinceRef = useRef<number | null>(null);
  const lastGroundActionRef = useRef<number | null>(null);
  const prevPlayerRef = useRef<{ x: number; y: number; rotKey: string } | null>(null);
const [moveIntent, setMoveIntent] = useState<{ 
  dir: number; 
  startTime: number; 
  dasCharged: boolean; 
  movedInitial: boolean;
} | null>(null);
  const hardDropLastTimeRef = useRef<number>(0);
  // const afkTimeoutRef = useRef<number | null>(null); // Giữ lại nếu bạn muốn dùng sau

  // --- HÀM LOGIC GAME ---
  
  const clearInactivity = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  const clearCap = useCallback(() => {
    if (capTimeoutRef.current) {
      clearTimeout(capTimeoutRef.current);
      capTimeoutRef.current = null;
    }
  }, []);

 const doLock = useCallback(() => {
    if (isGameOverFromBuffer(stage)) {
      setStartGameOverSequence(true); // Trigger sequence instead of direct game over
      setDropTime(null);
      setTimerOn(false);
      clearInactivity(); clearCap(); capExpiredRef.current = false; groundedSinceRef.current = null; lastGroundActionRef.current = null; setIsGrounded(false);
      return;
    }
    const tspin = (player.type === 'T') && isTSpin(player as any, stage as any);
    if (tspin) console.log('T-Spin!');
    setLocking(true);
    clearInactivity(); clearCap(); capExpiredRef.current = false; groundedSinceRef.current = null; lastGroundActionRef.current = null; setIsGrounded(false);
    updatePlayerPos({ x: 0, y: 0, collided: true }); // Cập nhật collided ở đây
  }, [
    stage, player, updatePlayerPos, clearInactivity, clearCap, 
    // 🛑 THÊM DEPENDENCIES
    setStartGameOverSequence, setDropTime, setTimerOn, setIsGrounded, setLocking
]);// Thêm dependencies

  const startGroundTimers = useCallback(() => {
  setIsGrounded(true);
  const now = Date.now();
  const firstTouch = groundedSinceRef.current == null;
  groundedSinceRef.current = groundedSinceRef.current ?? now;
  lastGroundActionRef.current = now;
  clearInactivity();

  // 🕐 Nếu đang soft drop, delay 1000ms thay vì INACTIVITY_LOCK_MS
  const lockDelay = isSoftDropping ? 750 : INACTIVITY_LOCK_MS;

  inactivityTimeoutRef.current = window.setTimeout(doLock, lockDelay);

  if (firstTouch && !capTimeoutRef.current) {
    capExpiredRef.current = false;
    capTimeoutRef.current = window.setTimeout(() => {
      capExpiredRef.current = true;
    }, HARD_CAP_MS);
  }
}, [clearInactivity, clearCap, doLock, isSoftDropping]);
// Thêm dependencies

  const onGroundAction = useCallback(() => {
    if (capExpiredRef.current) {
      doLock();
      return;
    }
    lastGroundActionRef.current = Date.now();
    clearInactivity();
    inactivityTimeoutRef.current = window.setTimeout(doLock, INACTIVITY_LOCK_MS);
  }, [clearInactivity, doLock]); // Thêm dependency

  const startGame = useCallback((): void => {
    console.log("Starting game from hook..."); // Debug log
    setStage(createStage());
    setDropTime(getFallSpeed(0));
    setGameOver(false);
    setStartGameOverSequence(false);
    setLocking(false);
    setMoveIntent(null);
    setRows(0);
    setLevel(0);
    setWin(false);
    setElapsedMs(0);
    setTimerOn(true);
    setPiecesPlaced(0);
    setInputs(0);
    setHolds(0);
    hardDropLastTimeRef.current = 0;
    clearHold();
    setHasHeld(false);
    clearInactivity(); clearCap(); capExpiredRef.current = false; groundedSinceRef.current = null; lastGroundActionRef.current = null; setIsGrounded(false);
    resetPlayer();
  }, [setStage, setDropTime, setGameOver, setStartGameOverSequence, setRows, setLevel, setWin, setElapsedMs, setTimerOn, setPiecesPlaced, setInputs, setHolds, clearHold, setHasHeld, clearInactivity, clearCap, resetPlayer]); // Thêm dependencies

  const drop = useCallback((): void => {
    // Tăng level nếu cần
    if (rows > (level + 1) * 10) { // Sửa lỗi: Cần check rows, không phải level
       const newLevel = level + 1;
       if (newLevel < MAX_LEVEL) { // Chỉ tăng nếu chưa max
           setLevel(newLevel); // Dùng setLevel trực tiếp
           setDropTime(getFallSpeed(newLevel));
       }
    }
    // Rơi xuống
    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      updatePlayerPos({ x: 0, y: 1, collided: false });
    } else {
      // Chạm đất
      setDropTime(null);
      startGroundTimers();
    }
  }, [level, player, stage, updatePlayerPos, rows, setLevel, setDropTime]); // Thêm dependencies

// SỬA LỖI: Đơn giản hóa hardDrop khi đã chạm đất
const hardDrop = useCallback((): void => {
  if (gameOver || startGameOverSequence || !gameSettings.enableHardDrop) return;

  const now = Date.now();
  if (now - hardDropLastTimeRef.current < HARD_DROP_DELAY) return;
  hardDropLastTimeRef.current = now;

  // 🟢 Nếu đang trong lock delay (đang grounded) → lock luôn khối đó
  if (isGrounded && !locking) {
    console.log("[HardDrop] Lock instantly during lock delay");
    setInputs(prev => prev + 1); // Ghi nhận input
    
    // 🛑 FIX: Chỉ cần gọi doLock(). 
    // doLock() sẽ set locking/collided, và useEffect (on lock) sẽ xử lý
    // việc resetPlayer() một cách nhất quán.
    doLock(); 

    // 🛑 XÓA TẤT CẢ LOGIC CŨ BÊN DƯỚI (setTimeout, resetPlayer...)
    /*
     // Dọn toàn bộ timer cũ
     clearInactivity();
     clearCap();
     // ...
     updatePlayerPos({ x: 0, y: 0, collided: true });
     // ...
     setTimeout(() => {
       resetPlayer(); 
       // ...
     }, 80); 
    */
    return; // Quan trọng
  }

  // 🧱 Hard drop bình thường (khi đang rơi)
  let dropDistance = 0;
  while (!checkCollision(player, stage, { x: 0, y: dropDistance + 1 })) dropDistance += 1;

  // 🔴 Game Over thật nếu spawn bị chặn trên đỉnh
  if (dropDistance === 0 && player.pos.y === 0 && checkCollision(player, stage, { x: 0, y: 1 })) {
    console.log("[HardDrop] True Game Over at spawn");
    setStartGameOverSequence(true);
    setDropTime(null);
    setTimerOn(false);
    clearInactivity();
    clearCap();
    capExpiredRef.current = false;
    groundedSinceRef.current = null;
    lastGroundActionRef.current = null;
    setIsGrounded(false);
    return;
  }

  // 🔵 Hard Drop giữa không trung
  setDropTime(null);
  setLocking(true);
  clearInactivity();
  clearCap();
  capExpiredRef.current = false;
  groundedSinceRef.current = null;
  lastGroundActionRef.current = null;
  setIsGrounded(false);
  updatePlayerPos({ x: 0, y: dropDistance, collided: true });
  setInputs(prev => prev + 1);
}, [
  gameOver,
  startGameOverSequence,
  gameSettings.enableHardDrop,
  player,
  stage,
  updatePlayerPos,
  resetPlayer,
  clearInactivity,
  clearCap,
  getFallSpeed,
  level,
  isGrounded,
  locking,
  // 🛑 THÊM DEPENDENCIES
  doLock,
  setInputs,
  setDropTime,
  setStartGameOverSequence,
  setTimerOn,
  setIsGrounded,
  setLocking
]);


 // Thêm dependencies

 // Code MỚI ĐÃ SỬA
// Code MỚI - An toàn hơn cho Wall Clip
const movePlayer = useCallback((dir: number): boolean => {
    if (gameOver || startGameOverSequence || locking) return false;

    // Lấy player hiện tại để tính toán
    const currentPiece = player.tetromino;
    const currentX = player.pos.x;
    const stageWidth = stage[0]?.length; // Lấy chiều rộng stage

    // Tính vị trí X mới dự định
    const intendedX = currentX + dir;

    // === KIỂM TRA BIÊN TRƯỚC KHI CHECK COLLISION ===
    let isMoveValid = true;
    for (let y = 0; y < currentPiece.length; y += 1) {
        for (let x = 0; x < currentPiece[y].length; x += 1) {
            if (currentPiece[y][x] !== 0) { // Nếu là một ô của khối
                const newX = intendedX + x; // Vị trí X mới của ô này trên board
                // Kiểm tra xem ô này có ra ngoài biên trái/phải không
                if (newX < 0 || newX >= stageWidth) {
                    isMoveValid = false; // Ra ngoài biên -> Di chuyển không hợp lệ
                    break; // Không cần kiểm tra các ô khác của khối
                }
            }
        }
        if (!isMoveValid) break; // Thoát vòng lặp ngoài nếu đã tìm thấy lỗi
    }
    // ===============================================

    // Nếu không ra ngoài biên VÀ không va chạm với các khối khác
   // === FIXED: chống spam move vượt biên / đục tường ===
const now = Date.now();
const cooldown = Math.min(MOVE_INTERVAL * 0.5, 16);
if (now - lastMoveTimeRef.current < cooldown) return false; // chặn spam
lastMoveTimeRef.current = now;

if (isMoveValid && !checkCollision(player, stage, { x: dir, y: 0 })) {
  updatePlayerPos({ x: dir, y: 0, collided: false });
  // Clamp player.x để đảm bảo không bao giờ ra ngoài biên
player.pos.x = Math.max(0, Math.min(player.pos.x, stage[0].length - player.tetromino[0].length));

  setInputs(prev => prev + 1);
  if (isGrounded) onGroundAction();
  return true;
} else {
  // Nếu va chạm hoặc ra biên → reset intent để ngắt ARR
  setMoveIntent(null);
  return false;
}


}, [gameOver, startGameOverSequence, locking, player, stage, updatePlayerPos, isGrounded, onGroundAction, stage]); // Thêm 'stage' vào dependency vì dùng stageWidth // Giữ nguyên dependencies

  const movePlayerToSide = useCallback((dir: number) => {
    if (gameOver || startGameOverSequence || locking) return;
    let distance = 0;
    while (!checkCollision(player, stage, { x: dir * (distance + 1), y: 0 })) distance += 1;
    if (distance > 0) {
      updatePlayerPos({ x: dir * distance, y: 0, collided: false });
      setInputs(prev => prev + 1);
      if (isGrounded) onGroundAction(); // Gọi onGroundAction nếu đang chạm đất
    }
  }, [gameOver, startGameOverSequence, locking, player, stage, updatePlayerPos, isGrounded, onGroundAction]); // Thêm dependencies

  const rotatePlayer = useCallback(() => {
      if (gameOver || startGameOverSequence || locking) return;
      playerRotate(stage, 1);
      setInputs(prev => prev + 1);
      if (checkCollision(player, stage, { x: 0, y: 1 })) { // Check chạm đất SAU KHI xoay
          onGroundAction();
      }
  }, [gameOver, startGameOverSequence, locking, playerRotate, stage, player, onGroundAction]); // Thêm dependencies

  const holdPiece = useCallback(() => {
    if (gameOver || startGameOverSequence || locking || !gameSettings.showHold || hasHeld || !canHold) return;
    holdSwap();
    setHasHeld(true);
    setHolds(prev => prev + 1);
    setInputs(prev => prev + 1);
    // Reset timers khi hold
    clearInactivity(); clearCap(); capExpiredRef.current = false; groundedSinceRef.current = null; lastGroundActionRef.current = null; setIsGrounded(false);
  }, [gameOver, startGameOverSequence, locking, gameSettings.showHold, hasHeld, canHold, holdSwap, clearInactivity, clearCap]); // Thêm dependencies

  // --- USEEFFECTS CHO LOGIC GAME ---

  // Gravity interval
  useInterval(() => {
    if (!gameOver && !startGameOverSequence && !locking && !win) drop();
  }, dropTime); // Sửa: dropTime có thể là null

  // DAS interval
 // DAS / ARR handler chuẩn TETR.IO
// === DAS + ARR interval — CHUẨN TETR.IO ===
useInterval(() => {
  if (!moveIntent || locking) return;

  const { dir, startTime, dasCharged, movedInitial } = moveIntent;
  const now = Date.now();
  const elapsed = now - startTime;

  // 1️⃣ Di chuyển 1 ô ngay khi vừa nhấn (nếu chưa moveInitial)
  if (!movedInitial) {
    const success = movePlayer(dir);
    // Nếu move hợp lệ, đánh dấu đã di chuyển
    if (success) {
      setMoveIntent(prev => prev ? { ...prev, movedInitial: true } : null);
    } else {
      // Nếu đụng tường, huỷ luôn intent để tránh spam
      setMoveIntent(null);
    }
    return;
  }

  // 2️⃣ Khi chưa đủ DAS delay, chờ
  if (!dasCharged && elapsed < DAS_DELAY) return;

  // 3️⃣ Khi đủ DAS, bật chế độ repeat
  if (!dasCharged && elapsed >= DAS_DELAY) {
    setMoveIntent(prev => prev ? { ...prev, dasCharged: true } : null);
    return;
  }

  // 4️⃣ Khi DAS đã nạp, thực hiện ARR
  if (dasCharged) {
    if (MOVE_INTERVAL > 0) {
      const success = movePlayer(dir);
      if (!success) setMoveIntent(null); // chạm tường thì ngắt ARR
    } else {
      movePlayerToSide(dir); // instant slide
    }
  }
}, 33); // tick mỗi frame logic (≈60fps)
 // check mỗi frame logic (~60fps)
// Luôn chạy interval check DAS charge

  // ARR interval
  useInterval(() => {
    if (moveIntent?.dasCharged && MOVE_INTERVAL > 0 && !locking) {
      movePlayer(moveIntent.dir);
    }
  }, MOVE_INTERVAL > 0 ? MOVE_INTERVAL : null);

  // Xử lý sau khi khối lock (collided)
// Xử lý sau khi khối lock (collided)
  // Xử lý sau khi khối lock (collided)
  useEffect(() => {
    if (locking && player.collided && !gameOver && !startGameOverSequence) {
        setPiecesPlaced(prev => prev + 1);
        resetPlayer(); // Spawn khối mới
        setHasHeld(false); // Cho phép hold lại
        setMoveIntent(null); // Reset DAS/ARR
        setLocking(false); // Cho phép khối mới rơi
        setDropTime(getFallSpeed(level)); // Bắt đầu rơi
        
        // 🛑 FIX: Reset lại trạng thái soft dropping khi khối mới spawn
        setIsSoftDropping(false);

        // Reset lock timers
        clearInactivity(); clearCap(); capExpiredRef.current = false; groundedSinceRef.current = null; lastGroundActionRef.current = null; setIsGrounded(false);
    }
}, [
    locking, player.collided, gameOver, startGameOverSequence, resetPlayer, 
    setHasHeld, level, clearInactivity, clearCap, 
    
    // 🛑 THÊM CÁC HÀM SETTER VÀO DEPENDENCIES
    setMoveIntent, setLocking, setDropTime, setIsSoftDropping, setIsGrounded 
]); // Thêm dependencies

  // Kiểm tra game over ngay khi spawn
  useEffect(() => {
    // Chỉ check khi y=0 và không phải đang lock/collided
    if (player.pos.y === 0 && !player.collided && !locking && !gameOver && !startGameOverSequence) {
      if (checkCollision(player, stage, { x: 0, y: 0 })) {
        setStartGameOverSequence(true); // Bắt đầu sequence thay vì set gameOver trực tiếp
      }
    }
  }, [player, stage, locking, gameOver, startGameOverSequence]); // Thêm dependencies

  // Xử lý khi startGameOverSequence=true
  useEffect(() => {
    if (startGameOverSequence && !gameOver) {
      updatePlayerPos({ x: 0, y: 0, collided: true }); // Đảm bảo khối cuối cùng được vẽ
      setGameOver(true); // Set game over thực sự
      setTimerOn(false); // Dừng timer
      // Dọn dẹp timers
      clearInactivity(); clearCap(); capExpiredRef.current = false; groundedSinceRef.current = null; lastGroundActionRef.current = null; setIsGrounded(false);
      setDropTime(null); // Dừng rơi
    }
  }, [startGameOverSequence, gameOver, updatePlayerPos, clearInactivity, clearCap]); // Thêm dependencies

  // Cập nhật số dòng đã xóa và kiểm tra win
  useEffect(() => {
    if (rowsCleared > 0) {
      setRows((prev) => prev + rowsCleared);
    }
  }, [clearEventId, rowsCleared, setRows]); // Sử dụng clearEventId để trigger đúng 1 lần

  useEffect(() => {
    if (!win && rows >= gameSettings.linesToClear) {
      setWin(true);
      setTimerOn(false);
      setDropTime(null);
    }
  }, [rows, win, gameSettings.linesToClear]);

  // Đếm thời gian
  useEffect(() => {
    if (!timerOn) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      setElapsedMs((prev) => prev + (now - last));
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timerOn]);

  // Cập nhật trạng thái chạm đất và timers dựa trên player/stage
  useEffect(() => {
    const currKey = JSON.stringify(player.tetromino);
    const prev = prevPlayerRef.current;
    prevPlayerRef.current = { x: player.pos.x, y: player.pos.y, rotKey: currKey };

    if (gameOver || startGameOverSequence || player.collided || locking) {
      // Dọn dẹp timers nếu game over hoặc đã lock
      clearInactivity(); clearCap(); capExpiredRef.current = false; groundedSinceRef.current = null; lastGroundActionRef.current = null; setIsGrounded(false);
      return;
    }

    const touching = checkCollision(player, stage, { x: 0, y: 1 });

    if (touching) {
      if (!isGrounded) {
        startGroundTimers(); // Mới chạm đất
      } else {
        // Đã chạm đất, kiểm tra có hành động không
         if (prev && (prev.x !== player.pos.x || prev.y !== player.pos.y || prev.rotKey !== currKey)) {
             onGroundAction(); // Có di chuyển/xoay khi chạm đất
         }
      }
    } else {
      if (isGrounded) {
        // Nhấc khỏi đất
        clearInactivity(); clearCap(); capExpiredRef.current = false; groundedSinceRef.current = null; lastGroundActionRef.current = null; setIsGrounded(false);
        setDropTime(getFallSpeed(level)); // Bắt đầu rơi lại
      }
    }
  }, [player, stage, gameOver, startGameOverSequence, locking, isGrounded, level, startGroundTimers, onGroundAction, clearInactivity, clearCap]); // Thêm dependencies

  // Dọn dẹp timers khi unmount
  useEffect(() => () => { clearInactivity(); clearCap(); /* clearAFKTimer(); */ }, [clearInactivity, clearCap]);

  // --- TRẢ VỀ STATE VÀ ACTIONS CHO UI ---
  return {
    stage,
    player, // UI cần player để vẽ ghost piece
    hold,
    nextFour,
    gameOver,
    startGameOverSequence, // UI cần biết để bắt đầu animation
    win,
    rows,
    level,
    elapsedMs,
    piecesPlaced,
    inputs,
    holds,
    gameSettings, // Trả về settings để UI biết hiển thị gì

    // Actions
    startGame,
    movePlayer,
    rotatePlayer,
    hardDrop,
    holdPiece,
    setMoveIntent, // UI cần để xử lý keyUp
    setDropTime,   // UI cần để xử lý soft drop keyUp
    updatePlayerPos,
    setIsSoftDropping// UI cần để xử lý soft drop keyDown
  };
};
