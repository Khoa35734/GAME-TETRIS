import { useState, useRef, useEffect, useCallback } from 'react';
import * as U from '../game/utils';

/**
 * Quản lý state cho Best of X series
 */
export const useSeriesState = () => {
  const [playerRole, setPlayerRole] = useState<'player1' | 'player2' | null>(null);
  const [seriesBestOf, setSeriesBestOf] = useState<number>(3);
  const [seriesWinsRequired, setSeriesWinsRequired] = useState<number>(U.getWinsRequired(3));
  const [seriesScore, setSeriesScore] = useState<{ me: number; opponent: number }>({ me: 0, opponent: 0 });
  const [seriesCurrentGame, setSeriesCurrentGame] = useState<number>(1);
  
  const seriesBestOfRef = useRef(seriesBestOf);
  const seriesWinsRequiredRef = useRef(seriesWinsRequired);
  const playerRoleRef = useRef<'player1' | 'player2' | null>(playerRole);
  const seriesCurrentGameRef = useRef(seriesCurrentGame);
  
  useEffect(() => {
    seriesBestOfRef.current = seriesBestOf;
    setSeriesWinsRequired(prev => {
      const computed = U.getWinsRequired(seriesBestOf);
      return prev === computed ? prev : computed;
    });
  }, [seriesBestOf]);
  
  useEffect(() => {
    seriesWinsRequiredRef.current = seriesWinsRequired;
  }, [seriesWinsRequired]);
  
  useEffect(() => {
    playerRoleRef.current = playerRole;
  }, [playerRole]);
  
  useEffect(() => {
    seriesCurrentGameRef.current = seriesCurrentGame;
  }, [seriesCurrentGame]);
  
  const applySeriesScore = useCallback((score: any) => {
    if (!score) {
      setSeriesScore({ me: 0, opponent: 0 });
      return;
    }
    if (typeof score.player === 'number' || typeof score.opponent === 'number') {
      setSeriesScore({
        me: Number(score.player) || 0,
        opponent: Number(score.opponent) || 0,
      });
      return;
    }
    const player1Wins = Number(score.player1Wins ?? score.player1 ?? 0) || 0;
    const player2Wins = Number(score.player2Wins ?? score.player2 ?? 0) || 0;
    const role = playerRoleRef.current;
    if (role === 'player2') {
      setSeriesScore({ me: player2Wins, opponent: player1Wins });
    } else if (role === 'player1') {
      setSeriesScore({ me: player1Wins, opponent: player2Wins });
    } else {
      setSeriesScore({ me: player1Wins, opponent: player2Wins });
    }
  }, []);

  return {
    playerRole,
    setPlayerRole,
    seriesBestOf,
    setSeriesBestOf,
    seriesWinsRequired,
    setSeriesWinsRequired,
    seriesScore,
    setSeriesScore,
    seriesCurrentGame,
    setSeriesCurrentGame,
    seriesBestOfRef,
    seriesWinsRequiredRef,
    playerRoleRef,
    seriesCurrentGameRef,
    applySeriesScore,
  };
};
