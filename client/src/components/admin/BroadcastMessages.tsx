import React, { useState } from 'react';

interface BroadcastHistory {
  id: string;
  message: string;
  sentAt: number;
  recipientCount: number;
}

const mockHistory: BroadcastHistory[] = [
  { id: 'b1', message: 'Bảo trì máy chủ lúc 3h sáng', sentAt: Date.now() - 1000 * 60 * 60 * 2, recipientCount: 45 },
  { id: 'b2', message: 'Đã có bản cập nhật mới!', sentAt: Date.now() - 1000 * 60 * 60 * 5, recipientCount: 38 },
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

const btnSuccess: React.CSSProperties = {
  ...btn,
  background: 'linear-gradient(90deg,#34d399,#059669)'
};

const BroadcastMessages: React.FC = () => {
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<BroadcastHistory[]>(mockHistory);
  const [targetAudience, setTargetAudience] = useState<string>('all');

  const sendMessage = () => {
    if (!message.trim()) {
      alert('Tin nhắn không được để trống!');
      return;
    }

    const newBroadcast: BroadcastHistory = {
      id: `b${Date.now()}`,
      message: message.trim(),
      sentAt: Date.now(),
      recipientCount: targetAudience === 'all' ? 50 : targetAudience === 'online' ? 30 : 20
    };

    setHistory([newBroadcast, ...history]);
    alert(`✓ Đã gửi thông báo đến ${targetAudience === 'all' ? 'tất cả' : targetAudience === 'online' ? 'người online' : 'người đang chơi'}: ${message}`);
    setMessage('');
  };

  const deleteHistory = (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const totalMessages = history.length;
  const totalRecipients = history.reduce((sum, h) => sum + h.recipientCount, 0);

  return (
    <div style={{ padding: 24, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Quản Lý Thông Báo</h1>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Thống Kê Thông Báo</h3>
          <div style={{ display: 'grid', gap: 4 }}>
            <div>Tổng Tin Nhắn: {totalMessages}</div>
            <div>Tổng Người Nhận: {totalRecipients}</div>
            <div>Lần Cuối: {history.length > 0 ? `${Math.floor((Date.now()-history[0].sentAt)/60000)} phút trước` : 'Chưa có'}</div>
          </div>
        </div>

        <div style={{ ...cardStyle, flex: 1, minWidth: 400 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Gửi Thông Báo Mới</h3>
          <label style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            Đối Tượng:
            <select 
              value={targetAudience} 
              onChange={e => setTargetAudience(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '6px 8px',
                borderRadius: 6,
                fontSize: 13
              }}
            >
              <option value="all">Tất Cả Người Dùng</option>
              <option value="online">Chỉ Người Online</option>
              <option value="playing">Chỉ Người Đang Chơi</option>
            </select>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Nhập tin nhắn của bạn tại đây..."
            style={{
              width: '100%',
              height: 80,
              padding: 12,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: 14,
              fontFamily: 'Inter, sans-serif',
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnSuccess} onClick={sendMessage}>
              Gửi Thông Báo
            </button>
            <button 
              style={btn} 
              onClick={() => setMessage('')}
              disabled={!message.trim()}
            >
              Xóa
            </button>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, minWidth: 'auto' }}>
        <h3 style={{ margin: 0 }}>Lịch Sử Thông Báo</h3>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thtd}>Tin Nhắn</th>
              <th style={thtd}>Người Nhận</th>
              <th style={thtd}>Thời Gian</th>
              <th style={thtd}>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr><td style={thtd} colSpan={4}>(không có lịch sử thông báo)</td></tr>
            )}
            {history.map(h => (
              <tr key={h.id}>
                <td style={thtd}>{h.message}</td>
                <td style={thtd}>{h.recipientCount} người</td>
                <td style={thtd}>{Math.floor((Date.now()-h.sentAt)/60000)} phút trước</td>
                <td style={thtd}>
                  <button 
                    style={{
                      ...btn,
                      padding: '4px 8px',
                      fontSize: 12,
                      background: 'linear-gradient(90deg,#f87171,#dc2626)'
                    }}
                    onClick={() => deleteHistory(h.id)}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 40, fontSize: 12, opacity: 0.6 }}>
        * Phiên bản mock. Khi tích hợp server: gửi qua WebSocket/API, lưu vào database để lịch sử tồn tại.
      </div>
    </div>
  );
};

export default BroadcastMessages;