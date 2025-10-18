import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Feedback {
  id: string;
  user_id: string;
  user_name?: string;
  message: string;
  subject?: string;
  category?: string;
  status?: string;
  admin_response?: string;
  created_at: number;
}

const FeedbackManagement: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminResponse, setAdminResponse] = useState('');

  useEffect(() => {
    fetchFeedbacks();
    const interval = setInterval(fetchFeedbacks, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    setError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/feedbacks`);
      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data);
      } else {
        throw new Error('Không thể tải dữ liệu từ máy chủ.');
      }
    } catch (err) {
      setError('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/feedbacks/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        alert('✅ Cập nhật trạng thái thành công!');
        fetchFeedbacks();
      } else {
        throw new Error('Không thể cập nhật trạng thái');
      }
    } catch (err) {
      alert('❌ Lỗi khi cập nhật trạng thái');
    }
  };

  const handleReply = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setAdminResponse(feedback.admin_response || '');
    setShowResponseModal(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedFeedback || !adminResponse.trim()) {
      alert('Vui lòng nhập nội dung phản hồi');
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/feedbacks/${selectedFeedback.id}/response`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_response: adminResponse })
      });

      if (response.ok) {
        alert('✅ Đã gửi phản hồi thành công!');
        setShowResponseModal(false);
        setAdminResponse('');
        setSelectedFeedback(null);
        fetchFeedbacks();
      } else {
        throw new Error('Không thể gửi phản hồi');
      }
    } catch (err) {
      alert('❌ Lỗi khi gửi phản hồi');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('⚠️ Bạn có chắc muốn xóa phản hồi này?')) return;

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/feedbacks/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('✅ Xóa phản hồi thành công!');
        fetchFeedbacks();
      } else {
        throw new Error('Không thể xóa phản hồi');
      }
    } catch (err) {
      alert('❌ Lỗi khi xóa phản hồi');
    }
  };

  const getStatusStyle = (status?: string) => {
    const statusMap: Record<string, { bg: string; color: string; text: string }> = {
      pending: { bg: 'rgba(234, 179, 8, 0.2)', color: '#facc15', text: 'Chờ xử lý' },
      in_review: { bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', text: 'Đang xem xét' },
      resolved: { bg: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', text: 'Đã giải quyết' },
      rejected: { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', text: 'Đã từ chối' },
    };
    return statusMap[status || 'pending'] || statusMap.pending;
  };

  const filteredFeedbacks = feedbacks.filter(fb => {
    if (filter === 'all') return true;
    return fb.status === filter;
  });

  const stats = {
    total: feedbacks.length,
    pending: feedbacks.filter(f => f.status === 'pending').length,
    in_review: feedbacks.filter(f => f.status === 'in_review').length,
    resolved: feedbacks.filter(f => f.status === 'resolved').length,
    rejected: feedbacks.filter(f => f.status === 'rejected').length,
  };

  if (loading && feedbacks.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #581c87 0%, #1f2937 50%, #581c87 100%)', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '4px solid transparent', borderTopColor: '#a855f7', borderRadius: '50%', width: '64px', height: '64px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ fontSize: '1.25rem' }}>🔄 Đang tải phản hồi...</p>
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
              💬 Quản Lý Phản Hồi
            </h1>
            <p style={{ color: '#9ca3af', marginTop: '8px' }}>Xem và xử lý phản hồi từ người chơi</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={fetchFeedbacks} disabled={loading} style={{ background: '#9333ea', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.3s' }} onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#7e22ce')} onMouseLeave={(e) => (e.currentTarget.style.background = '#9333ea')}>
              <span>{loading ? '🔄' : '🔄'}</span> Làm mới
            </button>
            <Link to="/admin" style={{ background: '#374151', color: 'white', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', transition: 'background 0.3s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#4b5563')} onMouseLeave={(e) => (e.currentTarget.style.background = '#374151')}>
              ← Quay lại
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fecaca', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {/* Statistics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <div style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#dbeafe', fontSize: '0.875rem' }}>Tổng phản hồi</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', marginTop: '4px' }}>{stats.total}</p>
              </div>
              <div style={{ fontSize: '3rem', opacity: 0.3 }}>📊</div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#fef3c7', fontSize: '0.875rem' }}>Chờ xử lý</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', marginTop: '4px' }}>{stats.pending}</p>
              </div>
              <div style={{ fontSize: '3rem', opacity: 0.3 }}>⏳</div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#d1fae5', fontSize: '0.875rem' }}>Đã giải quyết</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', marginTop: '4px' }}>{stats.resolved}</p>
              </div>
              <div style={{ fontSize: '3rem', opacity: 0.3 }}>✅</div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #9333ea, #7e22ce)', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#e9d5ff', fontSize: '0.875rem' }}>Đã từ chối</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', marginTop: '4px' }}>{stats.rejected}</p>
              </div>
              <div style={{ fontSize: '3rem', opacity: 0.3 }}>❌</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ background: 'rgba(31, 41, 55, 0.5)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid #374151' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => setFilter('all')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'background 0.3s', background: filter === 'all' ? '#9333ea' : '#374151', color: 'white' }}>
              Tất cả ({stats.total})
            </button>
            <button onClick={() => setFilter('pending')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'background 0.3s', background: filter === 'pending' ? '#d97706' : '#374151', color: 'white' }}>
              Chờ xử lý ({stats.pending})
            </button>
            <button onClick={() => setFilter('in_review')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'background 0.3s', background: filter === 'in_review' ? '#9333ea' : '#374151', color: 'white' }}>
              Đang xem xét ({stats.in_review})
            </button>
            <button onClick={() => setFilter('resolved')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'background 0.3s', background: filter === 'resolved' ? '#059669' : '#374151', color: 'white' }}>
              Đã giải quyết ({stats.resolved})
            </button>
          </div>
        </div>

        {/* Feedbacks List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredFeedbacks.length === 0 ? (
            <div style={{ background: 'rgba(31, 41, 55, 0.5)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '48px', textAlign: 'center', border: '1px solid #374151' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📭</div>
              <p style={{ fontSize: '1.25rem', color: '#9ca3af' }}>Không có phản hồi nào</p>
            </div>
          ) : (
            filteredFeedbacks.map((feedback) => {
              const statusStyle = getStatusStyle(feedback.status);
              return (
                <div key={feedback.id} style={{ background: 'rgba(31, 41, 55, 0.5)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #374151', transition: 'border-color 0.3s' }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3b82f680')} onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#374151')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#60a5fa', margin: 0 }}>
                          {feedback.subject || 'Phản hồi'}
                        </h3>
                        <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', background: statusStyle.bg, color: statusStyle.color }}>
                          {statusStyle.text}
                        </span>
                        {feedback.category && (
                          <span style={{ padding: '4px 12px', background: '#374151', borderRadius: '12px', fontSize: '0.75rem', color: '#d1d5db' }}>
                            {feedback.category}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.875rem', color: '#9ca3af', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          👤 {feedback.user_name || feedback.user_id}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🕐 {new Date(feedback.created_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(17, 24, 39, 0.5)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <p style={{ color: '#e5e7eb', lineHeight: '1.6', margin: 0 }}>{feedback.message}</p>
                  </div>

                  {feedback.admin_response && (
                    <div style={{ background: 'rgba(30, 64, 175, 0.3)', borderLeft: '4px solid #3b82f6', padding: '16px', borderRadius: '4px', marginBottom: '16px' }}>
                      <p style={{ fontSize: '0.875rem', color: '#93c5fd', marginBottom: '4px', fontWeight: '600' }}>📝 Phản hồi từ Admin:</p>
                      <p style={{ color: '#d1d5db', margin: 0 }}>{feedback.admin_response}</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => handleReply(feedback)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', borderRadius: '8px', fontSize: '0.875rem', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#1d4ed8')} onMouseLeave={(e) => (e.currentTarget.style.background = '#2563eb')}>
                      💬 Trả lời
                    </button>
                    <button onClick={() => handleUpdateStatus(feedback.id, 'resolved')} style={{ padding: '8px 16px', background: '#059669', color: 'white', borderRadius: '8px', fontSize: '0.875rem', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#047857')} onMouseLeave={(e) => (e.currentTarget.style.background = '#059669')}>
                      ✅ Đánh dấu đã xử lý
                    </button>
                    <button onClick={() => handleDelete(feedback.id)} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', borderRadius: '8px', fontSize: '0.875rem', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')} onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}>
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Response Modal */}
        {showResponseModal && selectedFeedback && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }} onClick={() => setShowResponseModal(false)}>
            <div style={{ background: '#1f2937', borderRadius: '12px', maxWidth: '600px', width: '100%', border: '1px solid #374151' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ background: 'linear-gradient(90deg, #2563eb, #7c3aed)', padding: '24px', borderRadius: '12px 12px 0 0' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                  💬 Trả lời phản hồi
                </h2>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '4px' }}>Người gửi:</p>
                  <p style={{ color: 'white', fontWeight: '500' }}>{selectedFeedback.user_name || selectedFeedback.user_id}</p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '4px' }}>Tiêu đề:</p>
                  <p style={{ color: 'white', fontWeight: '500' }}>{selectedFeedback.subject}</p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '4px' }}>Nội dung phản hồi:</p>
                  <div style={{ background: 'rgba(17, 24, 39, 0.5)', padding: '12px', borderRadius: '8px', color: '#e5e7eb' }}>
                    {selectedFeedback.message}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.875rem', marginBottom: '8px' }}>Phản hồi của Admin:</label>
                  <textarea 
                    value={adminResponse} 
                    onChange={(e) => setAdminResponse(e.target.value)} 
                    placeholder="Nhập nội dung phản hồi..." 
                    rows={5} 
                    style={{ width: '100%', background: '#374151', color: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #4b5563', resize: 'none', outline: 'none' }}
                  ></textarea>
                </div>
              </div>
              <div style={{ background: 'rgba(17, 24, 39, 0.5)', padding: '16px 24px', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={() => setShowResponseModal(false)} style={{ background: '#374151', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                  Hủy
                </button>
                <button onClick={handleSubmitResponse} style={{ background: '#2563eb', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                  📨 Gửi phản hồi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackManagement;
