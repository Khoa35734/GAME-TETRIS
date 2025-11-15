import axios from 'axios';
import { getApiBaseUrl } from './apiConfig';

const getApiUrl = () => getApiBaseUrl();

export interface GameStats {
  game_number: number;
  player_id: number;
  player_name: string;
  lines_cleared: number;
  pieces_placed: number;
  attacks_sent: number;
  garbage_received: number;
  holds: number;
  inputs: number;
  elapsed_ms: number;
  is_winner: boolean;
}

export interface MatchHistoryItem {
  match_id: number;
  player1_id: number;
  player2_id: number;
  player1_name: string;
  player2_name: string;
  winner_id: number;
  player1_score: number;
  player2_score: number;
  self_score: number;
  opponent_score: number;
  match_timestamp: string;
  result: 'WIN' | 'LOSE';
  opponent_name: string;
  score: string; // Numeric format in user perspective
  mode: 'casual' | 'ranked'; // Match mode
  end_reason?: string; // 'normal', 'player1_disconnect', 'player2_disconnect', etc.
}

export interface MatchDetail {
  match_id: number;
  player1_id: number;
  player2_id: number;
  player1_name: string;
  player2_name: string;
  winner_id: number;
  player1_score: number;
  player2_score: number;
  match_timestamp: string;
  games: GameStats[];
}

/**
 * Fetch match history for a user (10 most recent matches)
 */
export async function getMatchHistory(userId: number): Promise<MatchHistoryItem[]> {
  try {
    const response = await axios.get<MatchHistoryItem[]>(`${getApiUrl()}/match-history/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch match history:', error);
    throw error;
  }
}

/**
 * Fetch detailed match information including all game stats
 */
export async function getMatchDetail(userId: number, matchId: number): Promise<MatchDetail> {
  try {
    const response = await axios.get<MatchDetail>(`${getApiUrl()}/match-history/${userId}/${matchId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch match detail:', error);
    throw error;
  }
}

/**
 * Helper: Calculate PPS (Pieces Per Second) from game stats
 */
export function calculatePPS(pieces: number, elapsedMs: number): number {
  if (elapsedMs === 0) return 0;
  return pieces / (elapsedMs / 1000);
}

/**
 * Helper: Calculate finesse percentage
 * Note: We don't have finesse errors in DB, so this is approximated
 * Real finesse = (perfectInputs / totalInputs) * 100
 * For now, we'll return a placeholder
 */
export function calculateFinesse(inputs: number): number {
  // Placeholder: Higher inputs relative to pieces = lower finesse
  // Real implementation would require finesse_errors field in DB
  return 85; // Default value until we add proper tracking
}

/**
 * Helper: Format elapsed time to mm:ss
 */
export function formatElapsedTime(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Helper: Format timestamp to relative time (e.g., "2 giờ trước")
 */
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

/**
 * Get user statistics including ELO rating
 */
export interface UserStats {
  userId: number;
  username: string;
  eloRating: number;
  winStreak: number;
  totalMatches: number;
  wins: number;
  losses: number;
  rankedMatches: number;
  casualMatches: number;
  winRate: string;
}

export async function getUserStats(userId: number): Promise<UserStats> {
  const response = await axios.get<UserStats>(`${getApiUrl()}/match-history/stats/${userId}`);
  return response.data;
}
