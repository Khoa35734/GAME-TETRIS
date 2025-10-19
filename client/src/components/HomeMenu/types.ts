export interface User {
  username: string;
  email?: string;
  isGuest: boolean;
  accountId: number;
  role?: string;
}

export interface GameModeProps {
  icon: string;
  title: string;
  description: string;
  locked?: boolean;
  lockedReason?: string;
  onClick?: () => void;
}

export interface LeaderboardItem {
  username: string;
  level: number;
  stars: number;
  rank?: number;
}

