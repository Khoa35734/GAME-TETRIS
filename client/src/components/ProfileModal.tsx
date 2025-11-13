import React, { useState, useEffect } from 'react';
import { getUserData } from '../services/authService';
import {
  getMatchHistory,
  getMatchDetail,
  calculatePPS,
  calculateFinesse,
  formatElapsedTime,
  formatRelativeTime,
  getUserStats,
  type MatchHistoryItem,
  type MatchDetail,
  type GameStats as ApiGameStats,
  type UserStats,
} from '../services/matchHistoryService';

interface PlayerStats {
  lines: number;
  pps: number;
  finesse: number;
  pieces: number;
  holds: number;
  inputs: number;
  time: number;
}

interface GameResult {
  playerScore: number;
  opponentScore: number;
  winner: 'player' | 'opponent';
  playerStats: PlayerStats;
  opponentStats: PlayerStats;
}

interface MatchHistory {
  matchId: string;
  mode: 'casual' | 'ranked';
  opponent: string;
  result: 'WIN' | 'LOSE';
  score: string;
  timestamp: number;
  games: GameResult[];
  bo3Score: {
    playerWins: number;
    opponentWins: number;
  };
  endReason?: string; // 'normal', 'player1_disconnect', 'player2_disconnect', etc.
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUserData();
      loadMatchHistory();
      loadUserStats();
    }
  }, [isOpen]);

  const loadUserData = async () => {
    const user = getUserData();
    setCurrentUser(user);
  };

  const loadUserStats = async () => {
    try {
      const user = getUserData();
      if (!user || user.isGuest) return;

      const stats = await getUserStats(user.accountId);
      setUserStats(stats);
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  const loadMatchHistory = async () => {
    try {
      setLoading(true);
      const user = getUserData();
      if (!user || user.isGuest) {
        setMatchHistory([]);
        return;
      }

      // Fetch real data from API
      const matches = await getMatchHistory(user.accountId);

      // Transform API data to component format
      const transformedMatches: MatchHistory[] = matches.map((match) => ({
        matchId: match.match_id.toString(),
        mode: match.mode || 'casual', // Use mode from API
        opponent: match.opponent_name,
        result: match.result,
        score: match.score,
        timestamp: new Date(match.match_timestamp).getTime(),
        bo3Score: {
          playerWins: match.result === 'WIN' ? match.player1_score : match.player2_score,
          opponentWins: match.result === 'WIN' ? match.player2_score : match.player1_score,
        },
        games: [], // Will be loaded when user clicks on the match
        endReason: match.end_reason, // Add end_reason from API
      }));

      setMatchHistory(transformedMatches);
    } catch (error) {
      console.error('Failed to load match history:', error);
      setMatchHistory([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const loadMatchDetail = async (match: MatchHistory) => {
    try {
      setLoadingDetail(true);
      const user = getUserData();
      if (!user || user.isGuest) return;

      // Fetch detailed match data including game stats
      const detail = await getMatchDetail(user.accountId, parseInt(match.matchId));

      // Group game stats by game number and organize by player
      const gamesMap = new Map<number, { playerStats?: ApiGameStats; opponentStats?: ApiGameStats }>();

      detail.games.forEach((game) => {
        if (!gamesMap.has(game.game_number)) {
          gamesMap.set(game.game_number, {});
        }

        const gameData = gamesMap.get(game.game_number)!;

        // Determine if this is the current user's stats or opponent's
        if (game.player_id === user.accountId) {
          gameData.playerStats = game;
        } else {
          gameData.opponentStats = game;
        }
      });

      // Transform to GameResult format
      const games: GameResult[] = Array.from(gamesMap.entries())
        .sort((a, b) => a[0] - b[0]) // Sort by game number
        .map(([gameNum, data]) => {
          const playerStats = data.playerStats;
          const opponentStats = data.opponentStats;

          if (!playerStats || !opponentStats) {
            console.warn(`Missing stats for game ${gameNum}`);
            // Return placeholder
            return {
              playerScore: 0,
              opponentScore: 0,
              winner: 'player' as const,
              playerStats: { lines: 0, pps: 0, finesse: 0, pieces: 0, holds: 0, inputs: 0, time: 0 },
              opponentStats: { lines: 0, pps: 0, finesse: 0, pieces: 0, holds: 0, inputs: 0, time: 0 },
            };
          }

          return {
            playerScore: 0,
            opponentScore: 0,
            winner: playerStats.is_winner ? ('player' as const) : ('opponent' as const),
            playerStats: {
              lines: playerStats.lines_cleared,
              pps: calculatePPS(playerStats.pieces_placed, playerStats.elapsed_ms),
              finesse: calculateFinesse(playerStats.inputs),
              pieces: playerStats.pieces_placed,
              holds: playerStats.holds,
              inputs: playerStats.inputs,
              time: Math.floor(playerStats.elapsed_ms / 1000),
            },
            opponentStats: {
              lines: opponentStats.lines_cleared,
              pps: calculatePPS(opponentStats.pieces_placed, opponentStats.elapsed_ms),
              finesse: calculateFinesse(opponentStats.inputs),
              pieces: opponentStats.pieces_placed,
              holds: opponentStats.holds,
              inputs: opponentStats.inputs,
              time: Math.floor(opponentStats.elapsed_ms / 1000),
            },
          };
        });

      // Update the match with full game data
      const matchWithGames: MatchHistory = {
        ...match,
        games,
      };

      setSelectedMatch(matchWithGames);
    } catch (error) {
      console.error('Failed to load match detail:', error);
      // Still show the match but with empty games
      setSelectedMatch(match);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (!isOpen) return null;

  const getWinRate = () => {
    if (matchHistory.length === 0) return '0.0';
    const wins = matchHistory.filter(m => m.result === 'WIN').length;
    return ((wins / matchHistory.length) * 100).toFixed(1);
  };

  const getTotalWins = () => matchHistory.filter(m => m.result === 'WIN').length;
  const getTotalLosses = () => matchHistory.filter(m => m.result === 'LOSE').length;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(5px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          overflow: 'hidden',
          border: '2px solid rgba(78, 205, 196, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '2px solid rgba(78, 205, 196, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(78, 205, 196, 0.05)'
          }}
        >
          <h2 style={{ color: '#4ecdc4', margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>
            HỒ SƠ CÁ NHÂN
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 59, 48, 0.2)',
              border: '2px solid rgba(255, 59, 48, 0.5)',
              color: '#ff3b30',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 59, 48, 0.3)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 59, 48, 0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ĐÓNG
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Panel - Profile Info */}
          <div
            style={{
              width: '320px',
              padding: '24px',
              borderRight: '2px solid rgba(78, 205, 196, 0.2)',
              background: 'rgba(0, 0, 0, 0.2)',
              overflowY: 'auto'
            }}
          >
            {/* Avatar */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3.5rem',
                  fontWeight: 'bold',
                  color: '#fff',
                  border: '4px solid #4ecdc4',
                  boxShadow: '0 0 30px rgba(78, 205, 196, 0.5)',
                  margin: '0 auto 16px'
                }}
              >
                {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: '1.5rem' }}>
                {currentUser?.username || 'Unknown'}
              </h3>
              <div
                style={{
                  fontSize: '0.9rem',
                  color: '#888',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '6px 14px',
                  borderRadius: '12px',
                  display: 'inline-block'
                }}
              >
                ID: {currentUser?.accountId || 'N/A'}
              </div>
            </div>

            {/* ELO Rating - Prominent Display */}
            {userStats && (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 170, 0, 0.2) 0%, rgba(255, 140, 0, 0.1) 100%)',
                  border: '2px solid rgba(255, 170, 0, 0.5)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(255, 170, 0, 0.3)'
                }}
              >
                <div style={{ color: '#ffaa00', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>
                  ⭐ ELO RATING
                </div>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: '8px' }}>
                  {userStats.eloRating}
                </div>
                {userStats.winStreak > 0 && (
                  <div style={{ fontSize: '0.9rem', color: '#4ade80', fontWeight: 600 }}>
                    🔥 Chuỗi thắng: {userStats.winStreak}
                  </div>
                )}
              </div>
            )}

            {/* Stats Overview */}
            <div style={{ marginBottom: '24px' }}>
              <h4
                style={{
                  color: '#4ecdc4',
                  marginBottom: '16px',
                  fontSize: '1.1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                THỐNG KÊ
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <StatCard label="Tổng trận" value={userStats?.totalMatches?.toString() || '0'} color="#4ecdc4" />
                <StatCard label="Thắng" value={userStats?.wins?.toString() || '0'} color="#4ade80" />
                <StatCard label="Thua" value={userStats?.losses?.toString() || '0'} color="#f87171" />
                <StatCard label="Tỷ lệ thắng" value={`${userStats?.winRate || '0'}%`} color="#fbbf24" />
                <StatCard label="ELO" value={userStats?.eloRating?.toString() || '1000'} color="#ff9800" />
                <StatCard label="Casual" value={userStats?.casualMatches?.toString() || '0'} color="#9e9e9e" />
              </div>
            </div>

            {/* BO3 Info */}
            <div
              style={{
                background: 'rgba(78, 205, 196, 0.1)',
                border: '1px solid rgba(78, 205, 196, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px'
              }}
            >
              <div style={{ color: '#4ecdc4', fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px' }}>
                THỂ THỨC THI ĐẤU
              </div>
              <div style={{ color: '#ccc', fontSize: '0.85rem', lineHeight: 1.6 }}>
                • Best of 3 (BO3)<br />
                • Thắng 2/3 ván để chiến thắng<br />
                • Áp dụng cả Casual và Ranked
              </div>
            </div>
          </div>

          {/* Right Panel - Match History */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {loadingDetail ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#888' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
                  <div style={{ fontSize: '1.1rem' }}>Đang tải chi tiết trận đấu...</div>
                </div>
              </div>
            ) : selectedMatch ? (
              <MatchDetailView
                match={selectedMatch}
                onBack={() => setSelectedMatch(null)}
              />
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: '1.4rem' }}>
                    LỊCH SỬ TRẬN ĐẤU
                  </h3>
                  <div style={{ color: '#888', fontSize: '0.9rem' }}>
                    Lưu 10 trận gần nhất
                  </div>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
                    <div style={{ fontSize: '1.1rem' }}>Đang tải...</div>
                  </div>
                ) : matchHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎮</div>
                    <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Chưa có trận đấu nào</div>
                    <div style={{ fontSize: '0.9rem' }}>Hãy tham gia trận đấu đầu tiên!</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {matchHistory.map((match) => (
                      <MatchHistoryCard
                        key={match.matchId}
                        match={match}
                        onClick={() => loadMatchDetail(match)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div
    style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: `1px solid ${color}40`,
      borderRadius: '8px',
      padding: '14px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}
  >
    <span style={{ color: '#ccc', fontSize: '0.9rem', fontWeight: 500 }}>{label}</span>
    <span style={{ color, fontSize: '1.3rem', fontWeight: 700 }}>{value}</span>
  </div>
);

// Match History Card Component
const MatchHistoryCard: React.FC<{ match: MatchHistory; onClick: () => void }> = ({ match, onClick }) => {
  const isWin = match.result === 'WIN';

  return (
    <div
      onClick={onClick}
      style={{
        background: isWin
          ? 'linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)'
          : 'linear-gradient(135deg, rgba(248, 113, 113, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
        border: isWin ? '2px solid rgba(74, 222, 128, 0.4)' : '2px solid rgba(248, 113, 113, 0.4)',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateX(4px)';
        e.currentTarget.style.boxShadow = isWin
          ? '0 4px 12px rgba(74, 222, 128, 0.3)'
          : '0 4px 12px rgba(248, 113, 113, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateX(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: isWin ? '#4ade80' : '#f87171',
              minWidth: '70px'
            }}
          >
            {isWin ? 'THẮNG' : 'THUA'}
          </div>
          <div
            style={{
              background: match.mode === 'ranked' ? 'rgba(255, 170, 0, 0.2)' : 'rgba(78, 205, 196, 0.2)',
              color: match.mode === 'ranked' ? '#ffaa00' : '#4ecdc4',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              border: `1px solid ${match.mode === 'ranked' ? 'rgba(255, 170, 0, 0.5)' : 'rgba(78, 205, 196, 0.5)'}`
            }}
          >
            {match.mode === 'ranked' ? 'RANKED' : 'CASUAL'}
          </div>
        </div>

        <div style={{ color: '#ccc', fontSize: '0.95rem', marginBottom: '6px' }}>
          Đối thủ: <span style={{ color: '#fff', fontWeight: 600 }}>{match.opponent}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>
            Tỷ số: {match.score}
          </div>
          <div style={{ color: '#888', fontSize: '0.85rem' }}>
            {formatRelativeTime(new Date(match.timestamp).toISOString())}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '1.2rem', color: '#888' }}>›</div>
    </div>
  );
};

// Match Detail View Component
const MatchDetailView: React.FC<{ match: MatchHistory; onBack: () => void }> = ({ match, onBack }) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('vi-VN');
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
      {/* Back Button */}
      <button
        onClick={onBack}
        style={{
          background: 'rgba(78, 205, 196, 0.2)',
          border: '2px solid rgba(78, 205, 196, 0.5)',
          color: '#4ecdc4',
          borderRadius: '8px',
          padding: '10px 20px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: 600,
          marginBottom: '20px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(78, 205, 196, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(78, 205, 196, 0.2)';
        }}
      >
        ‹ QUAY LẠI
      </button>

      {/* Match Overview */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '2px solid rgba(78, 205, 196, 0.3)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: '#4ecdc4', margin: 0, fontSize: '1.5rem', textTransform: 'uppercase' }}>
            {match.mode === 'ranked' ? 'RANKED MATCH' : 'CASUAL MATCH'}
          </h3>
          <div style={{ color: '#888', fontSize: '0.9rem' }}>
            {formatDate(match.timestamp)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', margin: '30px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600, marginBottom: '12px' }}>BẠN</div>
            <div
              style={{
                fontSize: '3rem',
                fontWeight: 700,
                color: match.result === 'WIN' ? '#4ade80' : '#f87171'
              }}
            >
              {match.bo3Score.playerWins}
            </div>
          </div>

          <div style={{ fontSize: '2.5rem', color: '#888', fontWeight: 700 }}>-</div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600, marginBottom: '12px' }}>
              {match.opponent.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: '3rem',
                fontWeight: 700,
                color: match.result === 'LOSE' ? '#4ade80' : '#f87171'
              }}
            >
              {match.bo3Score.opponentWins}
            </div>
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: '20px',
            padding: '16px',
            background: match.result === 'WIN' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)',
            borderRadius: '8px',
            border: match.result === 'WIN' ? '1px solid rgba(74, 222, 128, 0.5)' : '1px solid rgba(248, 113, 113, 0.5)'
          }}
        >
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: match.result === 'WIN' ? '#4ade80' : '#f87171' }}>
            {match.result === 'WIN' ? 'CHIẾN THẮNG' : 'THẤT BẠI'}
          </div>
          <div style={{ color: '#ccc', fontSize: '1rem', marginTop: '6px' }}>
            Tỷ số: {match.score}
          </div>
          {/* Display disconnect/AFK reason if match ended abnormally */}
          {match.endReason && match.endReason !== 'normal' && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px',
                background: 'rgba(251, 191, 36, 0.2)',
                border: '1px solid rgba(251, 191, 36, 0.5)',
                borderRadius: '6px',
                color: '#fbbf24',
                fontSize: '0.95rem',
                fontWeight: 600
              }}
            >
              ⚠️ {match.endReason.includes('disconnect') ? 'Đối thủ đã mất kết nối' : 'Đối thủ đã AFK'}
            </div>
          )}
        </div>
      </div>

      {/* Game-by-Game Results */}
      <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.2rem', textTransform: 'uppercase' }}>
        CHI TIẾT TỪNG VÁN
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {match.games.map((game, index) => (
          <GameResultCard
            key={index}
            gameNumber={index + 1}
            game={game}
            playerName="BẠN"
            opponentName={match.opponent.toUpperCase()}
          />
        ))}
      </div>
    </div>
  );
};

// Game Result Card Component
const GameResultCard: React.FC<{
  gameNumber: number;
  game: GameResult;
  playerName: string;
  opponentName: string;
}> = ({ gameNumber, game, playerName, opponentName }) => {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '20px',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          color: '#4ecdc4',
          fontSize: '1.1rem',
          fontWeight: 600,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        VÁN {gameNumber}
        <span
          style={{
            marginLeft: 'auto',
            color: game.winner === 'player' ? '#4ade80' : '#f87171',
            fontSize: '1rem'
          }}
        >
          {game.winner === 'player' ? 'THẮNG' : 'THUA'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Player Stats */}
        <div
          style={{
            flex: 1,
            background: 'rgba(78, 205, 196, 0.08)',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid rgba(78, 205, 196, 0.2)'
          }}
        >
          <div style={{ color: '#4ecdc4', fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>
            {playerName}
          </div>
          <StatsDisplay stats={game.playerStats} />
        </div>

        {/* Opponent Stats */}
        <div
          style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>
            {opponentName}
          </div>
          <StatsDisplay stats={game.opponentStats} />
        </div>
      </div>
    </div>
  );
};

// Stats Display Component
const StatsDisplay: React.FC<{ stats: PlayerStats }> = ({ stats }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
      <StatItem label="Lines" value={stats.lines.toString()} />
      <StatItem label="PPS" value={stats.pps.toFixed(2)} />
      <StatItem label="Finesse" value={`${stats.finesse}%`} />
      <StatItem label="Pieces" value={stats.pieces.toString()} />
      <StatItem label="Holds" value={stats.holds.toString()} />
      <StatItem label="Inputs" value={stats.inputs.toString()} />
      <StatItem label="Time" value={formatTime(stats.time)} colSpan={2} />
    </div>
  );
};

const StatItem: React.FC<{ label: string; value: string; colSpan?: number }> = ({
  label,
  value,
  colSpan = 1
}) => (
  <div style={{ gridColumn: colSpan === 2 ? 'span 2' : 'span 1' }}>
    <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '2px' }}>{label}</div>
    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{value}</div>
  </div>
);

export default ProfileModal;
