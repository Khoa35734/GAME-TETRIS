// BO3 Match Manager
// File: server/src/bo3MatchManager.ts

import { Server, Socket } from 'socket.io';

const DEFAULT_BEST_OF = 3;

const calculateWinsRequired = (bestOf: number): number => Math.floor(bestOf / 2) + 1;

interface GameStats {
  lines: number;
  pps: number;
  finesse: number;
  pieces: number;
  holds: number;
  inputs: number;
  time: number;
}

interface GameResult {
  gameNumber: number;
  winner: 'player1' | 'player2';
  player1Stats: GameStats;
  player2Stats: GameStats;
  timestamp: number;
}

interface BO3Match {
  matchId: string;
  roomId: string;
  player1: {
    socketId: string;
    accountId: number;
    username: string;
  };
  player2: {
    socketId: string;
    accountId: number;
    username: string;
  };
  mode: 'casual' | 'ranked';
  currentGame: number; // 1, 2, or 3
  bestOf: number;
  winsRequired: number;
  score: {
    player1Wins: number;
    player2Wins: number;
  };
  games: GameResult[];
  status: 'in-progress' | 'completed';
  createdAt: number;
}

class BO3MatchManager {
  private io: Server;
  private activeMatches: Map<string, BO3Match> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      // Game finished in current round
      socket.on('bo3:game-finished', (data: {
        roomId: string;
        winner: 'player1' | 'player2';
        stats: {
          player1: GameStats;
          player2: GameStats;
        };
      }) => {
        this.handleGameFinished(socket, data);
      });

      // Player ready for next game
      socket.on('bo3:ready-next', (data: { roomId: string }) => {
        this.handlePlayerReady(socket, data.roomId);
      });

      // Get match status
      socket.on('bo3:get-status', (data: { roomId: string }) => {
        this.sendMatchStatus(socket, data.roomId);
      });
    });
  }

  // Create new BO3 match
  public createMatch(
    matchId: string,
    roomId: string,
    player1: { socketId: string; accountId: number; username: string },
    player2: { socketId: string; accountId: number; username: string },
    mode: 'casual' | 'ranked',
    bestOf: number = DEFAULT_BEST_OF
  ): BO3Match {
    const normalizedBestOf = Math.max(1, bestOf % 2 === 0 ? bestOf + 1 : bestOf);
    const winsRequired = calculateWinsRequired(normalizedBestOf);

    const match: BO3Match = {
      matchId,
      roomId,
      player1,
      player2,
      mode,
      currentGame: 1,
      bestOf: normalizedBestOf,
      winsRequired,
      score: {
        player1Wins: 0,
        player2Wins: 0
      },
      games: [],
      status: 'in-progress',
      createdAt: Date.now()
    };

    this.activeMatches.set(roomId, match);
    
    // Notify both players
    this.io.to(roomId).emit('bo3:match-start', {
      matchId,
      mode,
      currentGame: 1,
      score: match.score,
      bestOf: normalizedBestOf,
      winsRequired,
      player1: {
        socketId: player1.socketId,
        accountId: player1.accountId,
        username: player1.username,
      },
      player2: {
        socketId: player2.socketId,
        accountId: player2.accountId,
        username: player2.username,
      },
    });

    console.log(`[BO3] Match created: ${matchId} (${player1.username} vs ${player2.username})`);
    return match;
  }

  private handleGameFinished(
    socket: Socket,
    data: {
      roomId: string;
      winner: 'player1' | 'player2';
      stats: {
        player1: GameStats;
        player2: GameStats;
      };
    }
  ) {
    const match = this.activeMatches.get(data.roomId);
    if (!match) {
      socket.emit('error', { message: 'Match not found' });
      return;
    }

    // Record game result
    const gameResult: GameResult = {
      gameNumber: match.currentGame,
      winner: data.winner,
      player1Stats: data.stats.player1,
      player2Stats: data.stats.player2,
      timestamp: Date.now()
    };

    match.games.push(gameResult);

    // Update score
    if (data.winner === 'player1') {
      match.score.player1Wins++;
    } else {
      match.score.player2Wins++;
    }

    console.log(`[BO3] Game ${match.currentGame} finished in ${data.roomId}: ${data.winner} wins`);
    console.log(`[BO3] Score: ${match.score.player1Wins}-${match.score.player2Wins}`);

    // Check if match is over (someone reached required wins)
    if (
      match.score.player1Wins >= match.winsRequired ||
      match.score.player2Wins >= match.winsRequired ||
      match.currentGame >= match.bestOf
    ) {
      this.finishMatch(match);
    } else {
      // Prepare for next game
      match.currentGame = Math.min(match.currentGame + 1, match.bestOf);
      
      this.io.to(data.roomId).emit('bo3:game-result', {
        gameNumber: gameResult.gameNumber,
        winner: data.winner,
        score: match.score,
        nextGame: match.currentGame,
        bestOf: match.bestOf,
        winsRequired: match.winsRequired,
      });

      // Start countdown for next game (e.g., 5 seconds)
      setTimeout(() => {
        this.io.to(data.roomId).emit('bo3:next-game-start', {
          gameNumber: match.currentGame,
          score: match.score,
          bestOf: match.bestOf,
          winsRequired: match.winsRequired,
        });
      }, 5000);
    }
  }

  private async finishMatch(match: BO3Match) {
    match.status = 'completed';
    
    const overallWinner = match.score.player1Wins > match.score.player2Wins ? 'player1' : 'player2';
    const finalScore = `${match.score.player1Wins}-${match.score.player2Wins}`;

    console.log(`[BO3] Match ${match.matchId} completed: ${overallWinner} wins (${finalScore})`);

    // Notify players
    this.io.to(match.roomId).emit('bo3:match-end', {
      winner: overallWinner,
      score: match.score,
      finalScore,
      games: match.games,
      bestOf: match.bestOf,
      winsRequired: match.winsRequired,
    });

    // Save match history to database
    await this.saveMatchHistory(match, overallWinner);

    // Clean up after 30 seconds
    setTimeout(() => {
      this.activeMatches.delete(match.roomId);
      console.log(`[BO3] Match ${match.matchId} cleaned up`);
    }, 30000);
  }

  private async saveMatchHistory(match: BO3Match, winner: 'player1' | 'player2') {
    try {
      const player1Result = winner === 'player1' ? 'WIN' : 'LOSE';
      const player2Result = winner === 'player2' ? 'WIN' : 'LOSE';
      const player1Score = `${match.score.player1Wins}-${match.score.player2Wins}`;
      const player2Score = `${match.score.player2Wins}-${match.score.player1Wins}`;

      // Convert games data for player1 perspective
      const player1Games = match.games.map(game => ({
        playerScore: 0, // Not used in BO3
        opponentScore: 0, // Not used in BO3
        winner: game.winner === 'player1' ? 'player' : 'opponent',
        playerStats: game.player1Stats,
        opponentStats: game.player2Stats
      }));

      // Convert games data for player2 perspective
      const player2Games = match.games.map(game => ({
        playerScore: 0,
        opponentScore: 0,
        winner: game.winner === 'player2' ? 'player' : 'opponent',
        playerStats: game.player2Stats,
        opponentStats: game.player1Stats
      }));

      // Save to database via API
      const response = await fetch('http://localhost:4000/api/matches/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: match.player1.accountId,
          opponentId: match.player2.accountId,
          opponentName: match.player2.username,
          mode: match.mode,
          result: player1Result,
          score: player1Score,
          games: player1Games,
          playerWins: match.score.player1Wins,
          opponentWins: match.score.player2Wins
        })
      });

      if (response.ok) {
        console.log(`[BO3] Match history saved for ${match.player1.username}`);
      }
    } catch (error) {
      console.error('[BO3] Failed to save match history:', error);
    }
  }

  private handlePlayerReady(socket: Socket, roomId: string) {
    const match = this.activeMatches.get(roomId);
    if (!match) return;

    // Broadcast ready status
    this.io.to(roomId).emit('bo3:player-ready', {
      socketId: socket.id
    });
  }

  private sendMatchStatus(socket: Socket, roomId: string) {
    const match = this.activeMatches.get(roomId);
    
    if (!match) {
      socket.emit('bo3:status', { error: 'Match not found' });
      return;
    }

    socket.emit('bo3:status', {
      matchId: match.matchId,
      mode: match.mode,
      currentGame: match.currentGame,
      score: match.score,
      games: match.games,
      status: match.status
    });
  }

  // Get match by room ID
  public getMatch(roomId: string): BO3Match | undefined {
    return this.activeMatches.get(roomId);
  }

  // Get all active matches
  public getActiveMatchesCount(): number {
    return this.activeMatches.size;
  }
}

export default BO3MatchManager;
export type { BO3Match, GameResult, GameStats };
