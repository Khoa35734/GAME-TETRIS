import { useCallback, useRef, useState } from 'react';
import { createStage } from '../../game/gamehelper';

type MatchResult = {
  outcome: 'win' | 'lose';
  reason?: string;
};

export const useGameLifecycle = (navigate: Function, cleanupWebRTC: Function) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [autoExitCountdown, setAutoExitCountdown] = useState<number | null>(null);
  const autoExitTimerRef = useRef<number | null>(null);

  const startGame = useCallback((resetPlayer: Function, setStage: Function) => {
    setStage(createStage());
    resetPlayer();
    setCountdown(null);
  }, [setCountdown]);

  const handleGameOver = useCallback((socketId: string, winner: string, reason?: string) => {
    console.log('🏁 Game Over', winner === socketId ? 'WIN' : 'LOSE', reason);
    setMatchResult({ outcome: winner === socketId ? 'win' : 'lose', reason });
    setAutoExitCountdown(60);
    autoExitTimerRef.current = window.setInterval(() => {
      setAutoExitCountdown(prev => {
        if (prev && prev > 0) return prev - 1;
        clearInterval(autoExitTimerRef.current!);
        navigate('/');
        cleanupWebRTC('auto-exit');
        return null;
      });
    }, 1000);
  }, [navigate, cleanupWebRTC]);

  return { countdown, setCountdown, matchResult, setMatchResult, startGame, handleGameOver, autoExitCountdown };
};
