import React, { useState } from 'react';

interface Report {
  id: string;
  user: string;
  type: 'cheating' | 'abuse' | 'bug';
  message: string;
  status: 'pending' | 'resolved';
  createdAt: number;
}

const mockReports: Report[] = [
  { id: 'r1', user: 'Alpha', type: 'cheating', message: 'Người chơi sử dụng auto-clicker', status: 'pending', createdAt: Date.now() - 1000 * 60 * 10 },
  { id: 'r2', user: 'Beta', type: 'abuse', message: 'Hành vi toxic trong chat', status: 'resolved', createdAt: Date.now() - 1000 * 60 * 30 },
  { id: 'r3', user: 'Gamma', type: 'bug', message: 'Game bị crash ở round 5', status: 'pending', createdAt: Date.now() - 1000 * 60 * 5 },
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

const ReportsManagement: React.FC = () => {
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const resolveReport = (id: string) => {
    setReports(prev =>
      prev.map(report =>
        report.id === id ? { ...report, status: 'resolved' as const } : report
      )
    );
  };

  const deleteReport = (id: string) => {
    setReports(prev => prev.filter(report => report.id !== id));
  };

  const filteredReports = reports.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'cheating': return 'linear-gradient(90deg,#ef4444,#b91c1c)';
      case 'abuse': return 'linear-gradient(90deg,#f59e0b,#d97706)';
      case 'bug': return 'linear-gradient(90deg,#8b5cf6,#6d28d9)';
      default: return '#4b5563';
    }
  };

  const getTypeText = (type: string) => {
    switch(type) {
      case 'cheating': return 'Gian Lận';
      case 'abuse': return 'Lạm Dụng';
      case 'bug': return 'Lỗi';
      default: return type;
    }
  };

  return (
    <div style={{ padding: 24, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Quản Lý Báo Cáo</h1>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Thống Kê Báo Cáo</h3>
          <div style={{ display: 'grid', gap: 4 }}>
            <div>Tổng Báo Cáo: {reports.length}</div>
            <div>Đang Chờ: {pendingCount}</div>
            <div>Đã Xử Lý: {resolvedCount}</div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Bộ Lọc</h3>
          <label style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            Loại:
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '6px 8px',
                borderRadius: 6,
                fontSize: 13
              }}
            >
              <option value="all">Tất Cả Loại</option>
              <option value="cheating">Gian Lận</option>
              <option value="abuse">Lạm Dụng</option>
              <option value="bug">Lỗi</option>
            </select>
          </label>
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
        </div>
      </div>

      <div style={{ ...cardStyle, minWidth: 'auto' }}>
        <h3 style={{ margin: 0 }}>Báo Cáo</h3>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thtd}>Người Dùng</th>
              <th style={thtd}>Loại</th>
              <th style={thtd}>Tin Nhắn</th>
              <th style={thtd}>Trạng Thái</th>
              <th style={thtd}>Thời Gian</th>
              <th style={thtd}>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length === 0 && (
              <tr><td style={thtd} colSpan={6}>(không có báo cáo)</td></tr>
            )}
            {filteredReports.map(report => (
              <tr key={report.id}>
                <td style={thtd}>{report.user}</td>
                <td style={thtd}>{badge(getTypeText(report.type), getTypeColor(report.type))}</td>
                <td style={thtd}>{report.message}</td>
                <td style={thtd}>
                  {report.status === 'pending'
                    ? badge('Đang Chờ', 'linear-gradient(90deg,#fbbf24,#d97706)')
                    : badge('Đã Xử Lý', 'linear-gradient(90deg,#34d399,#059669)')}
                </td>
                <td style={thtd}>{Math.floor((Date.now()-report.createdAt)/60000)} phút</td>
                <td style={thtd}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {report.status === 'pending' && (
                      <button style={miniBtn} onClick={() => resolveReport(report.id)}>
                        Xử Lý
                      </button>
                    )}
                    <button style={miniBtnDanger} onClick={() => deleteReport(report.id)}>
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

export default ReportsManagement;