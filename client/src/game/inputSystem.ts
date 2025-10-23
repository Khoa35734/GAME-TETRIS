// ========================================
// INPUT SYSTEM - DAS/ARR/IRS/IHS Management
// ========================================

// ========================================
// 6️⃣ DAS (Delayed Auto Shift) & ARR (Auto Repeat Rate)
// ========================================

export interface DASState {
  direction: number | null; // -1 (left), 1 (right), null (no input)
  chargeStartTime: number | null; // When the key was first pressed
  isCharged: boolean; // Has DAS delay been met?
}

export const createDASState = (): DASState => ({
  direction: null,
  chargeStartTime: null,
  isCharged: false,
});

/**
 * Update DAS state based on current input
 * @param state - Current DAS state
 * @param direction - Current direction input (-1, 1, or null)
 * @param currentTime - Current timestamp (ms)
 * @param dasDelay - DAS delay in ms (default 120ms)
 * @returns Updated DAS state
 */
export const updateDAS = (
  state: DASState,
  direction: number | null,
  currentTime: number,
  dasDelay: number = 120
): DASState => {
  // No input - reset
  if (direction === null) {
    return createDASState();
  }

  // Direction changed - restart DAS
  if (direction !== state.direction) {
    return {
      direction,
      chargeStartTime: currentTime,
      isCharged: false,
    };
  }

  // Same direction - check if charged
  if (!state.isCharged && state.chargeStartTime !== null) {
    const elapsed = currentTime - state.chargeStartTime;
    if (elapsed >= dasDelay) {
      return {
        ...state,
        isCharged: true,
      };
    }
  }

  return state;
};

// ========================================
// 7️⃣ IRS (Initial Rotation System) & IHS (Initial Hold System)
// ========================================

export interface IRSIHSState {
  rotationIntent: number | null; // 1 (CW), -1 (CCW), 2 (180°), null
  holdIntent: boolean; // true if hold key is pressed
}

export const createIRSIHSState = (): IRSIHSState => ({
  rotationIntent: null,
  holdIntent: false,
});

/**
 * Check if IRS/IHS should be applied on spawn
 * Call this when spawning a new piece
 */
export const getSpawnIntent = (state: IRSIHSState): {
  shouldRotate: boolean;
  rotationDirection: number | null;
  shouldHold: boolean;
} => {
  return {
    shouldRotate: state.rotationIntent !== null,
    rotationDirection: state.rotationIntent,
    shouldHold: state.holdIntent,
  };
};

// ========================================
// 8️⃣ LOCK DELAY MANAGEMENT
// ========================================

export interface LockDelayState {
  isGrounded: boolean; // Is piece touching ground?
  lockTimer: number | null; // Time remaining until lock (ms)
  moveResetCount: number; // Number of moves that reset lock delay
  maxMoveResets: number; // Max resets allowed (default 15 for TETR.IO)
}

export const createLockDelayState = (maxResets: number = 15): LockDelayState => ({
  isGrounded: false,
  lockTimer: null,
  moveResetCount: 0,
  maxMoveResets: maxResets,
});

/**
 * Update lock delay state
 * @param state - Current lock delay state
 * @param isGrounded - Is piece currently touching ground?
 * @param hasMoved - Did piece move/rotate this frame?
 * @param lockDelay - Lock delay duration in ms (default 500ms)
 * @returns Updated lock delay state and whether piece should lock
 */
export const updateLockDelay = (
  state: LockDelayState,
  isGrounded: boolean,
  hasMoved: boolean,
  lockDelay: number = 500
): {
  newState: LockDelayState;
  shouldLock: boolean;
} => {
  // Not grounded - reset everything
  if (!isGrounded) {
    return {
      newState: createLockDelayState(state.maxMoveResets),
      shouldLock: false,
    };
  }

  // First time grounded - start timer
  if (!state.isGrounded && isGrounded) {
    return {
      newState: {
        isGrounded: true,
        lockTimer: lockDelay,
        moveResetCount: 0,
        maxMoveResets: state.maxMoveResets,
      },
      shouldLock: false,
    };
  }

  // Already grounded - check for movement
  if (hasMoved && state.moveResetCount < state.maxMoveResets) {
    // Reset timer on move (infinite spin)
    return {
      newState: {
        ...state,
        lockTimer: lockDelay,
        moveResetCount: state.moveResetCount + 1,
      },
      shouldLock: false,
    };
  }

  // Max resets reached or no movement - timer counts down
  if (state.lockTimer !== null && state.lockTimer <= 0) {
    return {
      newState: state,
      shouldLock: true,
    };
  }

  return {
    newState: state,
    shouldLock: false,
  };
};

/**
 * Tick lock delay timer
 * Call this in your game loop to decrement the timer
 */
export const tickLockDelay = (
  state: LockDelayState,
  deltaTime: number
): LockDelayState => {
  if (state.lockTimer === null || !state.isGrounded) {
    return state;
  }

  return {
    ...state,
    lockTimer: Math.max(0, state.lockTimer - deltaTime),
  };
};

// ========================================
// 9️⃣ ARE (Entry Delay)
// ========================================

export interface AREState {
  isActive: boolean; // Is ARE active?
  timeRemaining: number; // Time remaining in ms
}

export const createAREState = (): AREState => ({
  isActive: false,
  timeRemaining: 0,
});

/**
 * Start ARE delay
 * @param duration - ARE duration in ms (0 for instant spawn, 200 for TETR.IO classic)
 */
export const startARE = (duration: number = 0): AREState => ({
  isActive: duration > 0,
  timeRemaining: duration,
});

/**
 * Update ARE state
 * @param state - Current ARE state
 * @param deltaTime - Time elapsed since last update (ms)
 * @returns Updated ARE state and whether ARE has finished
 */
export const updateARE = (
  state: AREState,
  deltaTime: number
): {
  newState: AREState;
  isFinished: boolean;
} => {
  if (!state.isActive) {
    return {
      newState: state,
      isFinished: true,
    };
  }

  const newTime = Math.max(0, state.timeRemaining - deltaTime);

  if (newTime === 0) {
    return {
      newState: createAREState(),
      isFinished: true,
    };
  }

  return {
    newState: {
      isActive: true,
      timeRemaining: newTime,
    },
    isFinished: false,
  };
};
