import React, { useState, useEffect } from 'react';
import { getUserData } from '../services/authService';
import axios from 'axios';
import { getApiBaseUrl } from '../services/apiConfig';

interface InboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MessageItem {
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

interface MessageStats {
  total: number;
  unread: number;
  starred: number;
  system: number;
  admin_reply: number;
  player_message: number;
}

const InboxModal: React.FC<InboxModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      loadStats();
    }
  }, [isOpen, filter]);

  const loadMessages = async () => {
    const user = getUserData();
    if (!user || user.isGuest) return;

    setLoading(true);
    try {
      const response = await axios.get(`${getApiBaseUrl()}/messages`, {
        params: { userId: user.accountId, filter }
      });
      const data = response.data as { messages: MessageItem[] };
      setMessages(data.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const user = getUserData();
    if (!user || user.isGuest) return;

    try {
      const response = await axios.get(`${getApiBaseUrl()}/messages/stats/${user.accountId}`);
      setStats(response.data as MessageStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const markAsRead = async (messageId: number) => {
    try {
      await axios.patch(`${getApiBaseUrl()}/messages/${messageId}/read`);
      loadMessages();
      loadStats();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const toggleStar = async (messageId: number, starred: boolean) => {
    try {
      await axios.patch(`${getApiBaseUrl()}/messages/${messageId}/star`, { starred });
      loadMessages();
      loadStats();
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!confirm('Bạn có chắc muốn xóa tin nhắn này?')) return;
    
    try {
      await axios.delete(`${getApiBaseUrl()}/messages/${messageId}`);
      setSelectedMessage(null);
      loadMessages();
      loadStats();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleMessageClick = async (message: MessageItem) => {
    setSelectedMessage(message);
    if (!message.is_read) {
      await markAsRead(message.message_id);
    }
  };

  if (!isOpen) return null;

  const getMessageTypeIcon = (type: string) => {
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

  const getMessageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      system: 'Hệ thống',
      admin_reply: 'Admin',
      friend_request: 'Lời mời kết bạn',
      game_invite: 'Lời mời chơi',
      broadcast: 'Thông báo',
      player_message: 'Người chơi'
    };
    return labels[type] || type;
  };

  const getMessageTypeColor = (type: string) => {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '2px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '2px solid rgba(139, 92, 246, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ color: '#a78bfa', margin: 0, fontSize: '1.5rem' }}>
              📬 Hộp thư
            </h2>
            {stats && (
              <div style={{ color: '#999', fontSize: '0.85rem', marginTop: '4px' }}>
                {stats.total} tin nhắn • {stats.unread} chưa đọc
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Filter */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['all', 'unread', 'starred'] as const).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: filter === filterType
                    ? '2px solid #a78bfa'
                    : '2px solid rgba(255, 255, 255, 0.1)',
                  background: filter === filterType
                    ? 'rgba(139, 92, 246, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: filter === filterType ? '#a78bfa' : '#999',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                {filterType === 'all' && '📋 Tất cả'}
                {filterType === 'unread' && `📩 Chưa đọc ${stats ? `(${stats.unread})` : ''}`}
                {filterType === 'starred' && `⭐ Quan trọng ${stats ? `(${stats.starred})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
              Đang tải...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
              <p>Chưa có tin nhắn nào</p>
            </div>
          ) : selectedMessage ? (
            // Detail view
            <div>
              <button
                onClick={() => setSelectedMessage(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ccc',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginBottom: '16px',
                  fontSize: '0.9rem',
                }}
              >
                ← Quay lại danh sách
              </button>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '6px',
                          background: `${getMessageTypeColor(selectedMessage.message_type)}33`,
                          color: getMessageTypeColor(selectedMessage.message_type),
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        {getMessageTypeIcon(selectedMessage.message_type)} {getMessageTypeLabel(selectedMessage.message_type)}
                      </span>
                    </div>
                    <h3 style={{ color: '#fff', fontSize: '1.3rem', margin: '0 0 8px 0' }}>
                      {selectedMessage.subject}
                    </h3>
                    <div style={{ color: '#999', fontSize: '0.85rem' }}>
                      {selectedMessage.sender_name ? (
                        <>Từ: <strong>{selectedMessage.sender_name}</strong> • </>
                      ) : (
                        <>Từ: <strong>Hệ thống</strong> • </>
                      )}
                      {formatDate(selectedMessage.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => toggleStar(selectedMessage.message_id, !selectedMessage.is_starred)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: selectedMessage.is_starred ? '#fbbf24' : '#999',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                      }}
                      title={selectedMessage.is_starred ? 'Bỏ gắn sao' : 'Gắn sao'}
                    >
                      {selectedMessage.is_starred ? '⭐' : '☆'}
                    </button>
                    <button
                      onClick={() => deleteMessage(selectedMessage.message_id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                      }}
                      title="Xóa"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div
                  style={{
                    color: '#ccc',
                    lineHeight: 1.8,
                    fontSize: '1rem',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                  }}
                >
                  {selectedMessage.content}
                </div>

                {/* Metadata if exists */}
                {selectedMessage.metadata && (
                  <div
                    style={{
                      marginTop: '20px',
                      padding: '12px',
                      background: 'rgba(96, 165, 250, 0.1)',
                      border: '1px solid rgba(96, 165, 250, 0.2)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#93c5fd',
                    }}
                  >
                    ℹ️ Thông tin bổ sung: {JSON.stringify(selectedMessage.metadata)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // List view
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {messages.map((message) => (
                <div
                  key={message.message_id}
                  onClick={() => handleMessageClick(message)}
                  style={{
                    background: message.is_read 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'rgba(139, 92, 246, 0.08)',
                    border: message.is_read
                      ? '1px solid rgba(255, 255, 255, 0.1)'
                      : '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = message.is_read 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'rgba(139, 92, 246, 0.08)';
                    e.currentTarget.style.borderColor = message.is_read
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(139, 92, 246, 0.3)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: `${getMessageTypeColor(message.message_type)}33`,
                            color: getMessageTypeColor(message.message_type),
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {getMessageTypeIcon(message.message_type)} {getMessageTypeLabel(message.message_type)}
                        </span>
                        {!message.is_read && (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: '#ef4444',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            MỚI
                          </span>
                        )}
                        {message.is_starred && (
                          <span style={{ fontSize: '1rem' }}>⭐</span>
                        )}
                      </div>
                      <h4 style={{ 
                        color: '#fff', 
                        margin: '0 0 6px 0', 
                        fontSize: '1rem',
                        fontWeight: message.is_read ? 500 : 700
                      }}>
                        {message.subject}
                      </h4>
                      <p
                        style={{
                          color: '#aaa',
                          margin: 0,
                          fontSize: '0.9rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {message.content}
                      </p>
                    </div>
                    <div style={{ marginLeft: '12px', textAlign: 'right', minWidth: '100px' }}>
                      <div style={{ color: '#999', fontSize: '0.75rem' }}>
                        {formatDate(message.created_at)}
                      </div>
                      {message.sender_name && (
                        <div style={{ color: '#888', fontSize: '0.75rem', marginTop: '4px' }}>
                          {message.sender_name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxModal;
