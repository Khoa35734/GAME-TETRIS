import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Message {
  message_id: number;
  recipient_id: number;
  sender_id: number | null;
  sender_name: string | null;
  sender_email: string | null;
  message_type: 'system' | 'admin_reply' | 'friend_request' | 'game_invite' | 'broadcast' | 'player_message';
  subject: string;
  content: string;
  is_read: boolean;
  is_starred: boolean;
  is_deleted: boolean;
  metadata?: any;
  created_at: string;
  read_at?: string;
}

interface InboxStats {
  total: string;
  unread: string;
  starred: string;
  system: string;
  admin_reply: string;
  player_message: string;
}

const Inbox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());

  const currentUser = JSON.parse(localStorage.getItem('tetris:user') || '{}');
  const userId = currentUser.accountId;

  useEffect(() => {
    if (userId) {
      fetchMessages();
      fetchStats();
    }
  }, [userId, filter]);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/messages?userId=${userId}&filter=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        throw new Error('Không thể tải tin nhắn');
      }
    } catch (err) {
      setError('Không thể kết nối đến máy chủ');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/messages/stats/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const markAsRead = async (messageId: number) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      await fetch(`${API_BASE}/api/messages/${messageId}/read`, { method: 'PATCH' });
      fetchMessages();
      fetchStats();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const toggleStar = async (messageId: number, currentStarred: boolean) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      await fetch(`${API_BASE}/api/messages/${messageId}/star`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: !currentStarred })
      });
      fetchMessages();
      fetchStats();
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!confirm('Bạn có chắc muốn xóa tin nhắn này?')) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      await fetch(`${API_BASE}/api/messages/${messageId}`, { method: 'DELETE' });
      fetchMessages();
      fetchStats();
      if (selectedMessage?.message_id === messageId) {
        setShowDetailModal(false);
      }
    } catch (err) {
      alert('Không thể xóa tin nhắn');
    }
  };

  const deleteBulk = async () => {
    if (selectedMessages.size === 0) {
      alert('Vui lòng chọn ít nhất 1 tin nhắn');
      return;
    }
    if (!confirm(`Xóa ${selectedMessages.size} tin nhắn đã chọn?`)) return;
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      await fetch(`${API_BASE}/api/messages/bulk/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: Array.from(selectedMessages) })
      });
      setSelectedMessages(new Set());
      fetchMessages();
      fetchStats();
    } catch (err) {
      alert('Không thể xóa tin nhắn');
    }
  };

  const markBulkAsRead = async () => {
    if (selectedMessages.size === 0) {
      alert('Vui lòng chọn ít nhất 1 tin nhắn');
      return;
    }
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      await fetch(`${API_BASE}/api/messages/bulk/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: Array.from(selectedMessages) })
      });
      setSelectedMessages(new Set());
      fetchMessages();
      fetchStats();
    } catch (err) {
      alert('Không thể đánh dấu đã đọc');
    }
  };

  const openMessage = (message: Message) => {
    setSelectedMessage(message);
    setShowDetailModal(true);
    if (!message.is_read) {
      markAsRead(message.message_id);
    }
  };

  const toggleSelectMessage = (messageId: number) => {
    const newSet = new Set(selectedMessages);
    if (newSet.has(messageId)) {
      newSet.delete(messageId);
    } else {
      newSet.add(messageId);
    }
    setSelectedMessages(newSet);
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      system: '⚙️',
      admin_reply: '💬',
      friend_request: '👥',
      game_invite: '🎮',
      broadcast: '📢',
      player_message: '✉️'
    };
    return icons[type] || '📧';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      system: '#3b82f6',
      admin_reply: '#10b981',
      friend_request: '#8b5cf6',
      game_invite: '#f59e0b',
      broadcast: '#ec4899',
      player_message: '#6366f1'
    };
    return colors[type] || '#6b7280';
  };

  if (!userId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #581c87 0%, #1f2937 50%, #581c87 100%)', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>🔒 Vui lòng đăng nhập để xem hộp thư</h2>
          <Link to="/" style={{ color: '#a855f7', textDecoration: 'underline' }}>Quay về trang chủ</Link>
        </div>
      </div>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #581c87 0%, #1f2937 50%, #581c87 100%)', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '4px solid transparent', borderTopColor: '#a855f7', borderRadius: '50%', width: '64px', height: '64px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ fontSize: '1.25rem' }}>📬 Đang tải hộp thư...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #581c87 0%, #1f2937 50%, #581c87 100%)', padding: '24px', color: 'white' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', background: 'linear-gradient(90deg, #c084fc, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              📬 Hộp Thư
            </h1>
            <p style={{ color: '#9ca3af', marginTop: '8px' }}>Xin chào, {currentUser.username || 'User'}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={fetchMessages} disabled={loading} style={{ background: '#9333ea', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
              🔄 Làm mới
            </button>
            <Link to="/" style={{ background: '#374151', color: 'white', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              ← Quay lại
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fecaca', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{ background: 'linear-gradient(135deg, #9333ea, #7e22ce)', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: '#e9d5ff', fontSize: '0.875rem' }}>Tổng số</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{stats.total}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: '#fecaca', fontSize: '0.875rem' }}>Chưa đọc</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{stats.unread}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: '#fef3c7', fontSize: '0.875rem' }}>Đánh dấu sao</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{stats.starred}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: '#dbeafe', fontSize: '0.875rem' }}>Hệ thống</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{stats.system}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: '#d1fae5', fontSize: '0.875rem' }}>Admin</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{stats.admin_reply}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: '#ede9fe', fontSize: '0.875rem' }}>Người chơi</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{stats.player_message}</p>
            </div>
          </div>
        )}

        {/* Filters & Bulk Actions */}
        <div style={{ background: 'rgba(31, 41, 55, 0.5)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid #374151' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setFilter('all')} style={{ background: filter === 'all' ? '#9333ea' : '#374151', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                📧 Tất cả
              </button>
              <button onClick={() => setFilter('unread')} style={{ background: filter === 'unread' ? '#9333ea' : '#374151', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                🔴 Chưa đọc
              </button>
              <button onClick={() => setFilter('starred')} style={{ background: filter === 'starred' ? '#9333ea' : '#374151', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                ⭐ Đánh dấu sao
              </button>
            </div>
            {selectedMessages.size > 0 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#9ca3af', padding: '8px' }}>{selectedMessages.size} đã chọn</span>
                <button onClick={markBulkAsRead} style={{ background: '#059669', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                  ✅ Đánh dấu đã đọc
                </button>
                <button onClick={deleteBulk} style={{ background: '#dc2626', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                  🗑️ Xóa
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Messages List */}
        <div style={{ background: 'rgba(31, 41, 55, 0.5)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid #374151', overflow: 'hidden' }}>
          {messages.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📭</div>
              <p style={{ fontSize: '1.25rem' }}>Không có tin nhắn nào</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'rgba(17, 24, 39, 0.5)' }}>
                  <tr>
                    <th style={{ padding: '16px 24px', textAlign: 'left', width: '40px' }}>
                      <input type="checkbox" checked={selectedMessages.size === messages.length && messages.length > 0} onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMessages(new Set(messages.map(m => m.message_id)));
                        } else {
                          setSelectedMessages(new Set());
                        }
                      }} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>⭐</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Loại</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Từ</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Tiêu đề</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Ngày</th>
                    <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => (
                    <tr key={msg.message_id} style={{ borderTop: '1px solid #374151', background: msg.is_read ? 'transparent' : 'rgba(147, 51, 234, 0.1)', transition: 'background 0.3s', cursor: 'pointer' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(55, 65, 81, 0.3)')} onMouseLeave={(e) => (e.currentTarget.style.background = msg.is_read ? 'transparent' : 'rgba(147, 51, 234, 0.1)')}>
                      <td style={{ padding: '16px 24px' }}>
                        <input type="checkbox" checked={selectedMessages.has(msg.message_id)} onChange={() => toggleSelectMessage(msg.message_id)} onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
                      </td>
                      <td style={{ padding: '16px 24px' }} onClick={(e) => { e.stopPropagation(); toggleStar(msg.message_id, msg.is_starred); }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>
                          {msg.is_starred ? '⭐' : '☆'}
                        </button>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ background: getTypeColor(msg.message_type), color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {getTypeIcon(msg.message_type)} {msg.message_type}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>
                        {msg.sender_name || 'Hệ thống'}
                      </td>
                      <td style={{ padding: '16px 24px', fontWeight: msg.is_read ? 'normal' : 'bold' }} onClick={() => openMessage(msg)}>
                        {msg.subject}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#9ca3af' }}>
                        {new Date(msg.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button onClick={() => openMessage(msg)} style={{ background: '#2563eb', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}>👁️</button>
                          <button onClick={(e) => { e.stopPropagation(); deleteMessage(msg.message_id); }} style={{ background: '#dc2626', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedMessage && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }} onClick={() => setShowDetailModal(false)}>
            <div style={{ background: '#1f2937', borderRadius: '12px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #374151' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ background: 'linear-gradient(90deg, #9333ea, #ec4899)', padding: '24px', borderRadius: '12px 12px 0 0' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                  {getTypeIcon(selectedMessage.message_type)} {selectedMessage.subject}
                </h2>
                <p style={{ color: '#e9d5ff', marginTop: '8px', fontSize: '0.875rem' }}>
                  Từ: {selectedMessage.sender_name || 'Hệ thống'} • {new Date(selectedMessage.created_at).toLocaleString('vi-VN')}
                </p>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ background: '#374151', padding: '16px', borderRadius: '8px', color: 'white', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {selectedMessage.content}
                </div>
                {selectedMessage.metadata && (
                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(147, 51, 234, 0.1)', borderRadius: '8px', fontSize: '0.875rem', color: '#c084fc' }}>
                    <strong>📎 Metadata:</strong> {JSON.stringify(selectedMessage.metadata, null, 2)}
                  </div>
                )}
              </div>
              <div style={{ background: 'rgba(17, 24, 39, 0.5)', padding: '16px 24px', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <button onClick={() => toggleStar(selectedMessage.message_id, selectedMessage.is_starred)} style={{ background: '#f59e0b', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                  {selectedMessage.is_starred ? '⭐ Bỏ đánh dấu' : '☆ Đánh dấu sao'}
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => deleteMessage(selectedMessage.message_id)} style={{ background: '#dc2626', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                    🗑️ Xóa
                  </button>
                  <button onClick={() => setShowDetailModal(false)} style={{ background: '#374151', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
