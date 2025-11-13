import React, { useCallback, useState } from "react";
import { STAGE_WIDTH, checkCollision } from "../game/gamehelper";
import { TETROMINOES } from "../components/tetrominos";
import type { Stage, CellValue } from "./useStage"; // Assuming useStage exports these types
import { useQueue, type TType } from "./useQueue";   // Assuming useQueue exports these

export type Player = {
  pos: { x: number; y: number };
  tetromino: CellValue[][];
  type: TType;
  collided: boolean;
};

// Helper function to rotate a matrix (tetromino shape)
const rotate = (m: CellValue[][], dir: number): CellValue[][] => {
  // Transpose matrix (swap rows and columns)
  const transposed = m.map((_, i) => m.map(c => c[i]));
  // Reverse each row for clockwise, or reverse the whole matrix for counter-clockwise
  if (dir > 0) { // Clockwise
    return transposed.map(row => row.reverse());
  } else { // Counter-clockwise (default for dir <= 0)
    return transposed.reverse();
  }
};

export const usePlayer = (): [
  Player,                                     // Current player state
  (pos: { x: number; y: number; collided: boolean }) => void, // updatePlayerPos
  () => void,                                 // resetPlayer (spawn)
  (stage: Stage, dir: number) => Player | null, // playerRotate (returns new player state or null)
  TType | null,                               // hold piece type
  boolean,                                    // canHold status
  TType[],                                    // nextFour pieces
  () => void,                                 // holdSwap function
  () => void,                                 // clearHold function
  (seed: TType[]) => void,                    // setSeed (from useQueue)
  (more: TType[]) => void,                    // pushMany (from useQueue)
  React.Dispatch<React.SetStateAction<Player>> // setPlayer (direct state setter)
] => {
  // Use the queue hook to manage upcoming pieces
  // Requesting 5 for hold + next 4 visibility
  const { nextN, popNext, setSeed, pushMany } = useQueue(5);

  const [player, setPlayer] = useState<Player>(() => {
    // Initial state setup to avoid issues before first spawn
    const initialType = 'T'; // Or any default piece
    const initialShape = TETROMINOES[initialType].shape;
    const startX = Math.floor((STAGE_WIDTH - initialShape[0].length) / 2);
    return {
      pos: { x: startX, y: 0 },
      tetromino: initialShape,
      type: initialType,
      collided: false,
    };
  });

  const [hold, setHold] = useState<TType | null>(null);
  // Prevent holding right after start/hold until a piece is properly spawned
  const [canHold, setCanHold] = useState(false);

  // Function to update player position relatively
  const updatePlayerPos = useCallback(({ x, y, collided }: { x: number; y: number; collided: boolean }) => {
    setPlayer(prev => ({
      ...prev,
      pos: { x: prev.pos.x + x, y: prev.pos.y + y },
      collided, // Update collision status
    }));
  }, []); // Empty dependency array as setPlayer doesn't change

  // Function to spawn the next piece from the queue
  const spawnFromQueue = useCallback(() => {
    const nextType = popNext(); // Get the next piece type and update queue
    if (!nextType) {
      console.error("Queue is empty, cannot spawn piece!");
      return; // Should ideally not happen if queue is managed well
    }

    const piece = TETROMINOES[nextType];
    const initialTetromino = piece.shape;
    // Standard SRS spawn position calculation
    const pieceWidth = initialTetromino[0].length;
    const startX = Math.floor((STAGE_WIDTH - pieceWidth) / 2);
    const startY = 0; // Assuming stage buffer handles initial visibility

    const newPlayerState: Player = {
      pos: { x: startX, y: startY },
      tetromino: initialTetromino,
      type: nextType,
      collided: false, // Reset collision status on spawn
    };

    setPlayer(newPlayerState); // Update player state
    setCanHold(true);        // Allow holding after a piece is spawned

  }, [popNext]); // Depends on popNext from useQueue

  // Simple wrapper for spawnFromQueue, used after locking a piece
  const resetPlayer = useCallback(() => {
    spawnFromQueue();
  }, [spawnFromQueue]);

  // Player rotation function with basic wall kick and bounds check
  const playerRotate = useCallback((stage: Stage, dir: number): Player | null => {
    if (player.type === 'O') return null; // 'O' tetromino doesn't rotate

    // 1. Create a deep copy to attempt rotation
    const clonedPlayer = JSON.parse(JSON.stringify(player)) as Player;
    clonedPlayer.tetromino = rotate(clonedPlayer.tetromino, dir); // Rotate the shape

    const originalX = player.pos.x; // Store original position for kick calculations
    let offsetX = 1; // Initial kick offset (try moving right first)

    // 2. Loop through potential kick positions (0, +1, -2, +3, -4...)
    // Limit iterations to prevent infinite loops (max kick = piece width)
    const maxKicks = clonedPlayer.tetromino[0]?.length || 4;
    for (let i = 0; i <= maxKicks; ++i) {
      const kickX = (i === 0) ? 0 : offsetX; // Apply kick offset (0 on first check)
      clonedPlayer.pos.x = originalX + kickX; // Set potential new X position

      // 3. Check for collisions AND out-of-bounds at the potential position
      let collision = checkCollision(clonedPlayer, stage, { x: 0, y: 0 });
      let outOfBounds = false;

      if (!collision) {
        // Explicitly check bounds AFTER collision check passes
        for (let y = 0; y < clonedPlayer.tetromino.length; y += 1) {
          for (let x = 0; x < clonedPlayer.tetromino[y].length; x += 1) {
            if (clonedPlayer.tetromino[y][x] !== 0) { // If it's part of the shape
              const boardX = clonedPlayer.pos.x + x;
              const boardY = clonedPlayer.pos.y + y;
              // Check left, right, and bottom bounds (top bound check isn't usually needed for rotation)
              if (boardX < 0 || boardX >= STAGE_WIDTH || boardY >= stage.length) {
                outOfBounds = true;
                break; // Stop checking this piece if one part is out
              }
            }
          }
          if (outOfBounds) break; // Stop checking rows if out of bounds
        }
      }

      // 4. If NO collision AND NO out-of-bounds, the rotation is successful
      if (!collision && !outOfBounds) {
        // console.log(`[Rotate] Success with kick offset: ${kickX}`);
        setPlayer(clonedPlayer); // Update the actual player state
        return clonedPlayer;     // Return the successfully rotated player state
      }

      // 5. If failed, calculate the next kick offset (alternating sign, increasing magnitude)
      offsetX = -(offsetX + (offsetX > 0 ? 1 : -1)); // 1 -> -2 -> 3 -> -4 ...
    }

    // 6. If all kick attempts failed
    console.log("[Rotate] Failed - All kick positions invalid");
    return null; // Return null to indicate rotation failure
  }, [player]); // Depends only on the current player state

  // Function to handle swapping the current piece with the hold piece
  const holdSwap = useCallback(() => {
    if (!canHold) return; // Only allow holding once per piece spawn

    setPlayer(p => {
      const currentPieceType = p.type; // Piece currently being played
      let nextSpawnType: TType | null = null;

      if (hold === null) {
        // First time holding: current piece goes to hold, next piece from queue spawns
        nextSpawnType = popNext(); // Get next piece from queue
      } else {
        // Subsequent holds: piece from hold comes out, current piece goes in
        nextSpawnType = hold;
      }

      // If queue was empty on first hold (shouldn't happen with proper init)
      if (!nextSpawnType) return p;

      setHold(currentPieceType); // Put the current piece into hold
      setCanHold(false);         // Disable holding until next piece locks

      // Spawn the new piece (logic similar to spawnFromQueue)
      const piece = TETROMINOES[nextSpawnType];
      const initialTetromino = piece.shape;
      const pieceWidth = initialTetromino[0].length;
      const startX = Math.floor((STAGE_WIDTH - pieceWidth) / 2);
      const startY = 0;

      return { // Return the new player state
        pos: { x: startX, y: startY },
        tetromino: initialTetromino,
        type: nextSpawnType,
        collided: false,
      };
    });
  }, [canHold, hold, popNext]); // Dependencies

  // Function to clear the hold piece (e.g., at game start)
  const clearHold = useCallback(() => {
    setHold(null);
    setCanHold(false); // Can't hold until a piece spawns
  }, []);

  // Return the state and functions needed by the game logic hook
  return [
    player,         // The current player state (pos, tetromino, type, collided)
    updatePlayerPos,// Function to move the player relatively
    resetPlayer,    // Function to spawn the next piece
    playerRotate,   // Function to rotate the player (with wall kick)
    hold,           // The type of piece currently in hold (or null)
    canHold,        // Boolean indicating if hold action is allowed
    nextN,          // Array of the next N upcoming piece types
    holdSwap,       // Function to perform the hold action
    clearHold,      // Function to clear the hold piece state
    setSeed,        // Function to set the queue seed (from useQueue)
    pushMany,       // Function to add pieces to the queue (from useQueue)
    setPlayer,      // Direct state setter (use with caution, e.g., for complex rotations/updates)
  ];
};