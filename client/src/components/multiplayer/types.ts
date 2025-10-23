export type MatchOutcome = 'win' | 'lose' | 'draw';
export type MatchSummary = { outcome: MatchOutcome; reason?: string } | null;

export interface UDPStats {
  sent: number;
  received: number;
  failed: number;
  parseErrors: number;
}
