import { useEffect, useState, useCallback } from 'react';
import type { KeyBindings } from '../services/settingsService';
import { DEFAULT_KEY_BINDINGS, getUserSettings, getLocalKeyBindings } from '../services/settingsService';

export type GameAction =
  | 'moveLeft'
  | 'moveRight'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateClockwise'
  | 'rotateCounterClockwise'
  | 'rotate180'
  | 'hold'
  | 'restart';

/**
 * Custom hook to manage key bindings for the game
 * Loads key bindings from server if logged in, otherwise from localStorage
 */
export const useKeyBindings = () => {
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(DEFAULT_KEY_BINDINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKeyBindings();
  }, []);

  const loadKeyBindings = async () => {
    setLoading(true);
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    
    if (token) {
      // Load from server
      const result = await getUserSettings();
      if (result.success && result.settings?.key_bindings) {
        setKeyBindings(result.settings.key_bindings);
      } else {
        // Fallback to local storage
        setKeyBindings(getLocalKeyBindings());
      }
    } else {
      // Load from local storage
      setKeyBindings(getLocalKeyBindings());
    }
    
    setLoading(false);
  };

  /**
   * Check if a key press matches a game action
   */
  const isKeyForAction = useCallback(
    (key: string, action: GameAction): boolean => {
      const boundKey = keyBindings[action];
      
      // Normalize key names
      const normalizedKey = key === ' ' ? 'Space' : key;
      const normalizedBoundKey = boundKey === ' ' ? 'Space' : boundKey;
      
      return normalizedKey === normalizedBoundKey;
    },
    [keyBindings]
  );

  /**
   * Get the key string for a specific action
   */
  const getKeyForAction = useCallback(
    (action: GameAction): string => {
      return keyBindings[action] || DEFAULT_KEY_BINDINGS[action];
    },
    [keyBindings]
  );

  /**
   * Create a key event handler that maps keys to actions
   */
  const createKeyHandler = useCallback(
    (actionHandlers: Partial<Record<GameAction, () => void>>) => {
      return (event: KeyboardEvent) => {
        for (const [action, handler] of Object.entries(actionHandlers)) {
          if (handler && isKeyForAction(event.key, action as GameAction)) {
            event.preventDefault();
            handler();
            break;
          }
        }
      };
    },
    [isKeyForAction]
  );

  return {
    keyBindings,
    loading,
    isKeyForAction,
    getKeyForAction,
    createKeyHandler,
    reloadKeyBindings: loadKeyBindings,
  };
};
