import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface RoomInfo {
  id: string;
  players: number;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

interface PlayerInfo {
  id: string;
  name: string;
  rating: number;
  online: boolean;
  inRoom?: string;
}

const AdminDashboard: React.FC = () => {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

      const roomsResponse = await fetch(`${API_BASE}/api/rooms`);
      const playersResponse = await fetch(`${API_BASE}/api/players`);

      if (roomsResponse.ok && playersResponse.ok) {
        const roomsData = await roomsResponse.json();
        const playersData = await playersResponse.json();
        setRooms(roomsData);
        setPlayers(playersData);
      } else {
        throw new Error('Server không khả dụng');
      }
    } catch (err) {
      setError('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalPlayers: players.length,
    onlinePlayers: players.filter(p => p.online).length,
    totalRooms: rooms.length,
    activeRooms: rooms.filter(r => r.status === 'playing').length,
    waitingRooms: rooms.filter(r => r.status === 'waiting').length,
    avgRating: players.length > 0 
      ? Math.round(players.reduce((sum, p) => sum + p.rating, 0) / players.length) 
      : 0,
  };

  if (loading && rooms.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{
            width: '64px',
            height: '64px',
            border: '4px solid transparent',
            borderTop: '4px solid white',
            borderBottom: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ fontSize: '1.25rem' }}>🔄 Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: 'white',
              margin: 0,
              marginBottom: '0.5rem'
            }}>
              🎮 Bảng Điều Khiển Quản Trị
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
              Quản lý hệ thống Tetris Game
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={fetchData}
              disabled={loading}
              style={{
                background: loading ? '#8b5cf6' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
              }}
            >
              <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>
                🔄
              </span>
              Làm mới
            </button>
            <Link
              to="/"
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                display: 'inline-block'
              }}
            >
              ← Về Trang Chủ
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: '#fee2e2',
            border: '2px solid #ef4444',
            color: '#991b1b',
            padding: '1rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 'bold', margin: 0 }}>{error}</p>
              <p style={{ fontSize: '0.9rem', margin: '0.25rem 0 0 0', color: '#dc2626' }}>
                Vui lòng kiểm tra kết nối server
              </p>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '2px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Tổng người chơi</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6', margin: '0.25rem 0 0 0' }}>
                  {stats.totalPlayers}
                </p>
              </div>
              <div style={{ fontSize: '3rem', opacity: 0.3 }}>👥</div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '2px solid rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Online</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', margin: '0.25rem 0 0 0' }}>
                  {stats.onlinePlayers}
                </p>
              </div>
              <div style={{ fontSize: '3rem', opacity: 0.3 }}>🟢</div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '2px solid rgba(139, 92, 246, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Phòng đang chơi</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6', margin: '0.25rem 0 0 0' }}>
                  {stats.activeRooms}/{stats.totalRooms}
                </p>
              </div>
              <div style={{ fontSize: '3rem', opacity: 0.3 }}>🎮</div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '2px solid rgba(245, 158, 11, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Điểm TB</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b', margin: '0.25rem 0 0 0' }}>
                  {stats.avgRating}
                </p>
              </div>
              <div style={{ fontSize: '3rem', opacity: 0.3 }}>⭐</div>
            </div>
          </div>
        </div>

        {/* Management Links */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <Link
            to="/admin/broadcast"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: '2px solid rgba(139, 92, 246, 0.3)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              display: 'block'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 12px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📢</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
              Quản Lý Thông Báo
            </h2>
            <p style={{ color: '#6b7280', margin: 0 }}>Gửi thông báo đến người chơi</p>
          </Link>

          <Link
            to="/admin/feedback"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              display: 'block'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 12px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
              Quản Lý Phản Hồi
            </h2>
            <p style={{ color: '#6b7280', margin: 0 }}>Xem và trả lời phản hồi</p>
          </Link>

          <Link
            to="/admin/reports"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: '2px solid rgba(239, 68, 68, 0.3)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              display: 'block'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 12px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚨</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
              Quản Lý Báo Cáo
            </h2>
            <p style={{ color: '#6b7280', margin: 0 }}>Xử lý báo cáo vi phạm</p>
          </Link>
        </div>

        {/* Data Tables */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Rooms Table */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '2px solid rgba(139, 92, 246, 0.3)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              padding: '1rem',
              color: 'white'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🎪 Phòng Chơi ({rooms.length})
              </h3>
            </div>
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{
                  position: 'sticky',
                  top: 0,
                  background: '#f3f4f6',
                  zIndex: 1
                }}>
                  <tr>
                    <th style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      color: '#374151'
                    }}>ID</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      color: '#374151'
                    }}>Người chơi</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      color: '#374151'
                    }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#9ca3af'
                      }}>
                        Không có phòng nào
                      </td>
                    </tr>
                  ) : (
                    rooms.slice(0, 10).map((room, index) => (
                      <tr key={room.id} style={{
                        borderBottom: '1px solid #e5e7eb',
                        background: index % 2 === 0 ? 'white' : '#f9fafb',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#f9fafb'}
                      >
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <code style={{
                            background: '#e5e7eb',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            color: '#374151'
                          }}>
                            {room.id}
                          </code>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            color: room.players > 0 ? '#10b981' : '#9ca3af',
                            fontWeight: 'bold'
                          }}>
                            {room.players}/2
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            background: room.status === 'playing' ? '#d1fae5' :
                                       room.status === 'waiting' ? '#fef3c7' : '#f3f4f6',
                            color: room.status === 'playing' ? '#065f46' :
                                   room.status === 'waiting' ? '#92400e' : '#6b7280'
                          }}>
                            {room.status === 'playing' ? 'Đang chơi' :
                             room.status === 'waiting' ? 'Đang chờ' : 'Kết thúc'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Players Table */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '2px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              padding: '1rem',
              color: 'white'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                👥 Người Chơi ({players.length})
              </h3>
            </div>
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{
                  position: 'sticky',
                  top: 0,
                  background: '#f3f4f6',
                  zIndex: 1
                }}>
                  <tr>
                    <th style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      color: '#374151'
                    }}>Tên</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      color: '#374151'
                    }}>Điểm</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      color: '#374151'
                    }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {players.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#9ca3af'
                      }}>
                        Không có người chơi nào
                      </td>
                    </tr>
                  ) : (
                    players.slice(0, 10).map((player, index) => (
                      <tr key={player.id} style={{
                        borderBottom: '1px solid #e5e7eb',
                        background: index % 2 === 0 ? 'white' : '#f9fafb',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#f9fafb'}
                      >
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: player.online ? '#10b981' : '#6b7280'
                            }}></div>
                            <span style={{ color: '#111827', fontWeight: '500' }}>{player.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: player.rating > 1200 ? '#f59e0b' :
                                   player.rating > 1000 ? '#3b82f6' : '#6b7280'
                          }}>
                            {player.rating}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {player.inRoom ? (
                            <code style={{
                              background: '#ddd6fe',
                              color: '#6b21a8',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.85rem'
                            }}>
                              {player.inRoom}
                            </code>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.9rem'
        }}>
          <p style={{ margin: 0 }}>Dữ liệu được cập nhật tự động mỗi 30 giây</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;