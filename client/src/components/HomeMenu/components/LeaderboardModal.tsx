import React, { useMemo, useState } from 'react';
import type { LeaderboardItem, User } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

const defaultData: LeaderboardItem[] = [
  { username: 'ProGamer123', level: 22, stars: 1500, rank: 1 },
  { username: 'TetrisMaster', level: 20, stars: 1350, rank: 2 },
  { username: 'BlockBuster', level: 19, stars: 1200, rank: 3 },
  { username: 'SpeedRunner', level: 18, stars: 1100, rank: 4 },
  { username: 'ComboKing', level: 17, stars: 980, rank: 5 },
  { username: 'PuzzlePro', level: 16, stars: 850, rank: 6 },
  { username: 'LineClearer', level: 15, stars: 720, rank: 7 },
  { username: 'TetrisAce', level: 14, stars: 650, rank: 8 },
  { username: 'BlockMaster', level: 13, stars: 580, rank: 9 },
  { username: 'GridWarrior', level: 12, stars: 500, rank: 10 },
];

const LeaderboardModal: React.FC<Props> = ({ isOpen, onClose, currentUser }) => {
  const [leaderboardSort, setLeaderboardSort] = useState<'level' | 'stars'>('level');
  const leaderboardData = useMemo(() => defaultData, []);

  if (!isOpen) return null;

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.3s ease-out' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: 16, padding: '32px', maxWidth: '700px', width: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)', border: '1px solid rgba(78, 205, 196, 0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid rgba(78, 205, 196, 0.3)' }}>
          <h2 style={{ margin: 0, color: '#4ecdc4', fontSize: '1.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>🏆 Bảng xếp hạng</h2>
          <button
            onClick={onClose}
            style={{ background: 'rgba(244, 67, 54, 0.2)', border: '1px solid rgba(244, 67, 54, 0.5)', color: '#ff6b6b', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(244, 67, 54, 0.4)'; e.currentTarget.style.transform = 'rotate(90deg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)'; e.currentTarget.style.transform = 'rotate(0)'; }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => setLeaderboardSort('level')}
            style={{ flex: 1, padding: '12px 20px', background: leaderboardSort === 'level' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255, 255, 255, 0.08)', border: leaderboardSort === 'level' ? '2px solid rgba(102, 126, 234, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, transition: 'all 0.3s ease' }}
            onMouseEnter={(e) => { if (leaderboardSort !== 'level') { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; } }}
            onMouseLeave={(e) => { if (leaderboardSort !== 'level') { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; } }}
          >
            📊 Xếp theo Level
          </button>
          <button
            onClick={() => setLeaderboardSort('stars')}
            style={{ flex: 1, padding: '12px 20px', background: leaderboardSort === 'stars' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 'rgba(255, 255, 255, 0.08)', border: leaderboardSort === 'stars' ? '2px solid rgba(240, 147, 251, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, transition: 'all 0.3s ease' }}
            onMouseEnter={(e) => { if (leaderboardSort !== 'stars') { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; } }}
            onMouseLeave={(e) => { if (leaderboardSort !== 'stars') { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; } }}
          >
            ⭐ Xếp theo Stars
          </button>
        </div>

        <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px 100px', padding: '14px 20px', background: 'rgba(78, 205, 196, 0.15)', borderBottom: '1px solid rgba(78, 205, 196, 0.3)', fontWeight: 700, fontSize: '0.85rem', color: '#4ecdc4', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <div>Hạng</div>
            <div>Người chơi</div>
            <div>Level</div>
            <div>Stars</div>
          </div>

          {[...leaderboardData]
            .sort((a, b) => {
              if (leaderboardSort === 'level') return b.level - a.level || b.stars - a.stars;
              return b.stars - a.stars || b.level - a.level;
            })
            .map((player, index) => {
              const isCurrentUser = player.username === currentUser?.username;
              const rank = index + 1;
              const getMedalEmoji = (r: number) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`);

              return (
                <div
                  key={player.username}
                  style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px 100px', padding: '16px 20px', borderBottom: index < leaderboardData.length - 1 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none', background: isCurrentUser ? 'rgba(78, 205, 196, 0.15)' : 'transparent', transition: 'all 0.3s ease', fontSize: '0.95rem' }}
                  onMouseEnter={(e) => { if (!isCurrentUser) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                  onMouseLeave={(e) => { if (!isCurrentUser) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ fontWeight: 700, color: rank <= 3 ? '#ffc107' : '#888', fontSize: rank <= 3 ? '1.1rem' : '0.95rem' }}>{getMedalEmoji(rank)}</div>
                  <div style={{ fontWeight: isCurrentUser ? 700 : 500, color: isCurrentUser ? '#4ecdc4' : '#fff' }}>
                    {player.username}
                    {isCurrentUser && (
                      <span style={{ marginLeft: '8px', color: '#4ecdc4', fontSize: '0.8rem' }}>(Bạn)</span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, color: '#9b59b6' }}>{player.level}</div>
                  <div style={{ fontWeight: 600, color: '#ffc107' }}>{player.stars}</div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(LeaderboardModal);

