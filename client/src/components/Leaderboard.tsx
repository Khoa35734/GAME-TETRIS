import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiBaseUrl } from '../services/apiConfig';

interface LeaderboardPlayer {
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

interface LeaderboardStats {
  totalPlayers: number;
  activePlayers: number;
  avgRating: number;
  maxRating: number;
  minRating: number;
  totalGames: number;
  totalWins: number;
}

const Leaderboard: React.FC = () => {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'wins' | 'games' | 'winrate'>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem('tetris:user') || '{}');

  useEffect(() => {
    fetchLeaderboard();
    fetchStats();
  }, [searchTerm, sortBy, sortOrder, limit, offset]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_BASE = getApiBaseUrl();
      const params = new URLSearchParams({
        search: searchTerm,
        sort: sortBy,
        order: sortOrder,
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      console.log('[Leaderboard] Fetching:', `${API_BASE}/leaderboard?${params.toString()}`);
      
      const response = await fetch(`${API_BASE}/leaderboard?${params.toString()}`);
      
      console.log('[Leaderboard] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Leaderboard] Data received:', data);
        setPlayers(data.data || []);
        setHasMore(data.pagination?.hasMore || false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Leaderboard] Error response:', errorData);
        throw new Error(errorData.message || 'Không thể tải bảng xếp hạng');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ';
      setError(errorMessage);
      console.error('[Leaderboard] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/leaderboard/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setOffset(0); // Reset to first page
  };

  const handleSortChange = (newSort: typeof sortBy) => {
    if (sortBy === newSort) {
      // Toggle order if clicking same column
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSort);
      setSortOrder('desc');
    }
    setOffset(0);
  };

  const handleLoadMore = () => {
    setOffset(offset + limit);
  };

  const handleReset = () => {
    setSearchTerm('');
    setSortBy('rating');
    setSortOrder('desc');
    setOffset(0);
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'linear-gradient(135deg, #ffd700, #ffed4e)';
    if (rank === 2) return 'linear-gradient(135deg, #c0c0c0, #e8e8e8)';
    if (rank === 3) return 'linear-gradient(135deg, #cd7f32, #e9ad7c)';
    return 'linear-gradient(135deg, #6b7280, #9ca3af)';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 2000) return '#dc2626'; // Red (Master)
    if (rating >= 1800) return '#f97316'; // Orange (Diamond)
    if (rating >= 1600) return '#8b5cf6'; // Purple (Platinum)
    if (rating >= 1400) return '#3b82f6'; // Blue (Gold)
    if (rating >= 1200) return '#10b981'; // Green (Silver)
    return '#6b7280'; // Gray (Bronze)
  };

  const getRatingTier = (rating: number) => {
    if (rating >= 2000) return 'Master';
    if (rating >= 1800) return 'Diamond';
    if (rating >= 1600) return 'Platinum';
    if (rating >= 1400) return 'Gold';
    if (rating >= 1200) return 'Silver';
    return 'Bronze';
  };

  if (loading && players.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #581c87 0%, #1f2937 50%, #581c87 100%)', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '4px solid transparent', borderTopColor: '#a855f7', borderRadius: '50%', width: '64px', height: '64px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ fontSize: '1.25rem' }}>🏆 Đang tải bảng xếp hạng...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #581c87 0%, #1f2937 50%, #581c87 100%)', padding: '24px', color: 'white' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', background: 'linear-gradient(90deg, #ffd700, #ffa500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              🏆 Bảng Xếp Hạng
            </h1>
            <p style={{ color: '#9ca3af', marginTop: '8px' }}>Xếp hạng người chơi theo ELO Rating</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={fetchLeaderboard} disabled={loading} style={{ background: '#9333ea', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
              🔄 Làm mới
            </button>
            <Link to="/" style={{ background: '#374151', color: 'white', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              ← Trang chủ
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fecaca', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Statistics */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{ background: 'linear-gradient(135deg, #9333ea, #7e22ce)', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: '#e9d5ff', fontSize: '0.875rem' }}>Tổng người chơi</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{stats.totalPlayers}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: '#d1fae5', fontSize: '0.875rem' }}>Đang hoạt động</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{stats.activePlayers}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: '#dbeafe', fontSize: '0.875rem' }}>ELO trung bình</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{stats.avgRating}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: '#fecaca', fontSize: '0.875rem' }}>ELO cao nhất</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{stats.maxRating}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: '#fef3c7', fontSize: '0.875rem' }}>Tổng trận đấu</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{stats.totalGames}</p>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div style={{ background: 'rgba(31, 41, 55, 0.5)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #374151' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>🔍 Tìm kiếm</label>
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => handleSearch(e.target.value)} 
                placeholder="Tên người chơi hoặc email..." 
                style={{ width: '100%', background: '#374151', color: 'white', padding: '10px 16px', borderRadius: '8px', border: '1px solid #4b5563', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>📊 Sắp xếp theo</label>
              <select value={sortBy} onChange={(e) => handleSortChange(e.target.value as typeof sortBy)} style={{ width: '100%', background: '#374151', color: 'white', padding: '10px 16px', borderRadius: '8px', border: '1px solid #4b5563', outline: 'none', cursor: 'pointer' }}>
                <option value="rating">⭐ ELO Rating</option>
                <option value="wins">🏅 Số trận thắng</option>
                <option value="games">🎮 Số trận đấu</option>
                <option value="winrate">📈 Tỷ lệ thắng</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>⬆️ Thứ tự</label>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')} style={{ width: '100%', background: '#374151', color: 'white', padding: '10px 16px', borderRadius: '8px', border: '1px solid #4b5563', outline: 'none', cursor: 'pointer' }}>
                <option value="desc">Giảm dần</option>
                <option value="asc">Tăng dần</option>
              </select>
            </div>
            <div>
              <button onClick={handleReset} style={{ width: '100%', background: '#dc2626', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
                🔄 Đặt lại
              </button>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div style={{ background: 'rgba(31, 41, 55, 0.5)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid #374151', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(17, 24, 39, 0.5)' }}>
                <tr>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Hạng</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Người chơi</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase', cursor: 'pointer' }} onClick={() => handleSortChange('rating')}>
                    ⭐ ELO {sortBy === 'rating' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Hạng</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase', cursor: 'pointer' }} onClick={() => handleSortChange('games')}>
                    🎮 Trận đấu {sortBy === 'games' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase', cursor: 'pointer' }} onClick={() => handleSortChange('wins')}>
                    🏅 Thắng {sortBy === 'wins' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>❌ Thua</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase', cursor: 'pointer' }} onClick={() => handleSortChange('winrate')}>
                    📈 Tỷ lệ {sortBy === 'winrate' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '48px 24px', textAlign: 'center', color: '#9ca3af' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏆</div>
                      <p>Không tìm thấy người chơi nào</p>
                    </td>
                  </tr>
                ) : (
                  players.map((player) => {
                    const isCurrentUser = player.account_id === currentUser.accountId;
                    return (
                      <tr 
                        key={player.account_id} 
                        style={{ 
                          borderTop: '1px solid #374151', 
                          background: isCurrentUser ? 'rgba(147, 51, 234, 0.15)' : 'transparent',
                          transition: 'background 0.3s' 
                        }} 
                        onMouseEnter={(e) => (e.currentTarget.style.background = isCurrentUser ? 'rgba(147, 51, 234, 0.25)' : 'rgba(55, 65, 81, 0.3)')} 
                        onMouseLeave={(e) => (e.currentTarget.style.background = isCurrentUser ? 'rgba(147, 51, 234, 0.15)' : 'transparent')}
                      >
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ background: getRankColor(player.rank), padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.125rem', display: 'inline-block', minWidth: '60px', textAlign: 'center', color: player.rank <= 3 ? '#000' : '#fff' }}>
                            {getRankMedal(player.rank)}
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                            {player.username} {isCurrentUser && <span style={{ color: '#a855f7', fontSize: '0.875rem' }}>(Bạn)</span>}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>{player.email}</div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ background: getRatingColor(player.elo_rating), color: 'white', padding: '6px 14px', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 'bold', display: 'inline-block' }}>
                            {player.elo_rating}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ color: getRatingColor(player.elo_rating), fontWeight: '600' }}>
                            {getRatingTier(player.elo_rating)}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>{player.games_played}</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#10b981', fontWeight: '600' }}>{player.games_won}</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#ef4444', fontWeight: '600' }}>{player.games_lost}</td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, background: '#374151', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                              <div style={{ 
                                width: `${Math.min(player.win_rate, 100)}%`, 
                                height: '100%', 
                                background: player.win_rate >= 60 ? '#10b981' : player.win_rate >= 40 ? '#f59e0b' : '#ef4444',
                                transition: 'width 0.3s'
                              }}></div>
                            </div>
                            <span style={{ fontSize: '0.875rem', fontWeight: '600', minWidth: '50px' }}>
                              {player.win_rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Load More */}
          {hasMore && players.length > 0 && (
            <div style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid #374151' }}>
              <button 
                onClick={handleLoadMore} 
                disabled={loading}
                style={{ 
                  background: '#9333ea', 
                  color: 'white', 
                  padding: '12px 32px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  fontWeight: '600',
                  fontSize: '1rem'
                }}
              >
                {loading ? '⏳ Đang tải...' : '📥 Xem thêm'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;