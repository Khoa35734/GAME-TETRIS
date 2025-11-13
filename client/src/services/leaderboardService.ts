import { getApiBaseUrl } from './apiConfig';

export interface LeaderboardPlayer {
  account_id: number;
  username: string;
  email: string;
  elo_rating: number;
  games_played: number;
  games_won: number;
  games_lost: number;
  win_rate: number;
  rank: number;
  created_at: string;
  last_login?: string;
}

export interface LeaderboardStats {
  totalPlayers: number;
  activePlayers: number;
  avgRating: number;
  maxRating: number;
  minRating: number;
  totalGames: number;
  totalWins: number;
}

export interface LeaderboardResponse {
  success: boolean;
  data: LeaderboardPlayer[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface StatsResponse {
  success: boolean;
  stats: LeaderboardStats;
}

/**
 * Fetch leaderboard data from API
 */
export async function fetchLeaderboard(params: {
  search?: string;
  sort?: 'rating' | 'wins' | 'games' | 'winrate';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<LeaderboardResponse> {
  const API_BASE = getApiBaseUrl();
  const queryParams = new URLSearchParams({
    search: params.search || '',
    sort: params.sort || 'rating',
    order: params.order || 'desc',
    limit: (params.limit || 50).toString(),
    offset: (params.offset || 0).toString()
  });

  const response = await fetch(`${API_BASE}/leaderboard?${queryParams}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch leaderboard statistics
 */
export async function fetchLeaderboardStats(): Promise<StatsResponse> {
  const API_BASE = getApiBaseUrl();
  const response = await fetch(`${API_BASE}/leaderboard/stats`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Save game session result (especially for ranked matches)
 */
export interface SaveGameSessionData {
  sessionUuid: string;
  gameMode: 'single' | 'casual' | 'ranked';
  matchType: 'BO1' | 'BO3';
  player1Id: number;
  player2Id?: number;
  winnerId: number;
  player1Score: number;
  player2Score: number;
  totalGames: number;
  durationSeconds: number;
  status?: 'completed' | 'abandoned' | 'disconnected';
  gameDetails?: Array<{
    gameNumber: number;
    winnerId: number;
    player1LinesCleared?: number;
    player1Score?: number;
    player1PiecesPlaced?: number;
    player2LinesCleared?: number;
    player2Score?: number;
    player2PiecesPlaced?: number;
    durationSeconds?: number;
  }>;
}

export async function saveGameSession(data: SaveGameSessionData) {
  const API_BASE = getApiBaseUrl();
  
  const response = await fetch(`${API_BASE}/game-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...data,
      status: data.status || 'completed'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save game session');
  }

  return response.json();
}

/**
 * Fetch match history for a user
 */
export async function fetchMatchHistory(userId: number, limit: number = 20, offset: number = 0) {
  const API_BASE = getApiBaseUrl();
  const response = await fetch(
    `${API_BASE}/game-sessions/history/${userId}?limit=${limit}&offset=${offset}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch match history');
  }

  return response.json();
}
