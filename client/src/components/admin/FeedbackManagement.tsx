import React, { useState } from 'react';

interface Feedback {
  id: string;
  user: string;
  message: string;
  rating: number;
  status: 'pending' | 'resolved';
  createdAt: number;
}

const mockFeedbacks: Feedback[] = [
  { id: 'f1', user: 'Gamma', message: 'Game hay! Tôi thích cơ chế chơi.', rating: 5, status: 'pending', createdAt: Date.now() - 1000 * 60 * 15 },
  { id: 'f2', user: 'Delta', message: 'Làm ơn thêm nhiều cấp độ hơn.', rating: 4, status: 'resolved', createdAt: Date.now() - 1000 * 60 * 45 },
  { id: 'f3', user: 'Epsilon', message: 'Giao diện cần được cải thiện.', rating: 3, status: 'pending', createdAt: Date.now() - 1000 * 60 * 8 },
];

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  padding: 16,
  borderRadius: 14,
  boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  minWidth: 260,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
};

const thtd: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  borderBottom: '1px solid rgba(255,255,255,0.08)'
};

const badge = (text: string, color: string) => (
  <span style={{
    background: color,
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5
  }}>{text}</span>
);

const btn: React.CSSProperties = {
  background: 'linear-gradient(90deg,#3b82f6,#2563eb)',
  border: 'none',
  color: '#fff',
  padding: '8px 12px',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
};

const miniBtn: React.CSSProperties = {
  ...btn,
  padding: '4px 8px',
  fontSize: 12
};

const miniBtnDanger: React.CSSProperties = {
  ...miniBtn,
  background: 'linear-gradient(90deg,#f87171,#dc2626)'
};

const FeedbackManagement: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(mockFeedbacks);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRating, setFilterRating] = useState<string>('all');

  const resolveFeedback = (id: string) => {
    setFeedbacks(prev =>
      prev.map(feedback =>
        feedback.id === id ? { ...feedback, status: 'resolved' as const } : feedback
      )
    );
  };

  const deleteFeedback = (id: string) => {
    setFeedbacks(prev => prev.filter(feedback => feedback.id !== id));
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    if (filterStatus !== 'all' && f.status !== filterStatus) return false;
    if (filterRating !== 'all' && f.rating.toString() !== filterRating) return false;
    return true;
  });

  const pendingCount = feedbacks.filter(f => f.status === 'pending').length;
  const resolvedCount = feedbacks.filter(f => f.status === 'resolved').length;
  const avgRating = feedbacks.length > 0 
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : '0.0';

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'linear-gradient(90deg,#34d399,#059669)';
    if (rating >= 3) return 'linear-gradient(90deg,#fbbf24,#d97706)';
    return 'linear-gradient(90deg,#f87171,#dc2626)';
  };

  return (
    <div style={{ padding: 24, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Quản Lý Phản Hồi</h1>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Thống Kê Phản Hồi</h3>
          <div style={{ display: 'grid', gap: 4 }}>
            <div>Tổng Phản Hồi: {feedbacks.length}</div>
            <div>Đang Chờ: {pendingCount}</div>
            <div>Đã Xử Lý: {resolvedCount}</div>
            <div>Điểm Trung Bình: {avgRating}⭐</div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Bộ Lọc</h3>
          <label style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            Trạng Thái:
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '6px 8px',
                borderRadius: 6,
                fontSize: 13
              }}
            >
              <option value="all">Tất Cả Trạng Thái</option>
              <option value="pending">Đang Chờ</option>
              <option value="resolved">Đã Xử Lý</option>
            </select>
          </label>
          <label style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            Đánh Giá:
            <select 
              value={filterRating} 
              onChange={e => setFilterRating(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '6px 8px',
                borderRadius: 6,
                fontSize: 13
              }}
            >
              <option value="all">Tất Cả Đánh Giá</option>
              <option value="5">5 Sao</option>
              <option value="4">4 Sao</option>
              <option value="3">3 Sao</option>
              <option value="2">2 Sao</option>
              <option value="1">1 Sao</option>
            </select>
          </label>
        </div>
      </div>

      <div style={{ ...cardStyle, minWidth: 'auto' }}>
        <h3 style={{ margin: 0 }}>Phản Hồi</h3>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thtd}>Người Dùng</th>
              <th style={thtd}>Tin Nhắn</th>
              <th style={thtd}>Đánh Giá</th>
              <th style={thtd}>Trạng Thái</th>
              <th style={thtd}>Thời Gian</th>
              <th style={thtd}>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeedbacks.length === 0 && (
              <tr><td style={thtd} colSpan={6}>(không có phản hồi)</td></tr>
            )}
            {filteredFeedbacks.map(feedback => (
              <tr key={feedback.id}>
                <td style={thtd}>{feedback.user}</td>
                <td style={thtd}>{feedback.message}</td>
                <td style={thtd}>{badge(`${feedback.rating}⭐`, getRatingColor(feedback.rating))}</td>
                <td style={thtd}>
                  {feedback.status === 'pending'
                    ? badge('Đang Chờ', 'linear-gradient(90deg,#fbbf24,#d97706)')
                    : badge('Đã Xử Lý', 'linear-gradient(90deg,#34d399,#059669)')}
                </td>
                <td style={thtd}>{Math.floor((Date.now()-feedback.createdAt)/60000)} phút</td>
                <td style={thtd}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {feedback.status === 'pending' && (
                      <button style={miniBtn} onClick={() => resolveFeedback(feedback.id)}>
                        Xử Lý
                      </button>
                    )}
                    <button style={miniBtnDanger} onClick={() => deleteFeedback(feedback.id)}>
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 40, fontSize: 12, opacity: 0.6 }}>
        * Phiên bản mock. Khi tích hợp server: thay state bằng dữ liệu real-time, các nút sẽ gọi API.
      </div>
    </div>
  );
};

export default FeedbackManagement;