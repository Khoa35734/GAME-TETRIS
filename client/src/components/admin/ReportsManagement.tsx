import React, { useEffect, useState } from 'react';

interface Report {
  id: string;
  reporter_id: string;
  reporter_username?: string;
  reported_user_id: string;
  reported_username?: string;
  type: string;
  reason: string;
  message: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  created_at: number;
  resolved_at?: number;
  resolved_by_username?: string;
}

const ReportsManagement: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/reports`);
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        throw new Error('Không thể tải dữ liệu từ máy chủ.');
      }
    } catch (err) {
      setError('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async (reportId: string, action: 'resolved' | 'dismissed') => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, resolved_by: 1 }) // TODO: Get admin ID from auth
      });

      if (response.ok) {
        alert('✅ Cập nhật trạng thái thành công!');
        fetchReports();
        setShowDetailModal(false);
      } else {
        throw new Error('Không thể cập nhật báo cáo');
      }
    } catch (err) {
      alert('❌ Lỗi khi cập nhật báo cáo');
    }
  };

  const handleUpdateStatus = async (reportId: string, status: 'pending' | 'investigating' | 'resolved' | 'dismissed') => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolved_by: 1 })
      });

      if (response.ok) {
        alert('✅ Cập nhật trạng thái thành công!');
        fetchReports();
      } else {
        throw new Error('Không thể cập nhật trạng thái');
      }
    } catch (err) {
      alert('❌ Lỗi khi cập nhật trạng thái');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('⚠️ Bạn có chắc muốn xóa báo cáo này?')) return;

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/reports/${reportId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('✅ Xóa báo cáo thành công!');
        fetchReports();
        setShowDetailModal(false);
      } else {
        throw new Error('Không thể xóa báo cáo');
      }
    } catch (err) {
      alert('❌ Lỗi khi xóa báo cáo');
    }
  };

  const filteredReports = reports.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterType !== 'all' && r.type !== filterType) return false;
    return true;
  });

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    investigating: reports.filter(r => r.status === 'investigating').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'investigating': return '#3b82f6';
      case 'resolved': return '#10b981';
      case 'dismissed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ xử lý';
      case 'investigating': return 'Đang điều tra';
      case 'resolved': return 'Đã giải quyết';
      case 'dismissed': return 'Đã bỏ qua';
      default: return status;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'cheating': return '#ef4444';
      case 'harassment': return '#f59e0b';
      case 'inappropriate_name': return '#8b5cf6';
      case 'other': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'cheating': return 'Gian lận';
      case 'harassment': return 'Quấy rối';
      case 'inappropriate_name': return 'Tên không phù hợp';
      case 'other': return 'Khác';
      default: return type;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '2rem'
        }}>🚨 Quản Lý Báo Cáo Vi Phạm</h1>

        {/* Statistics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '2px solid rgba(255,255,255,0.3)'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>Tổng Báo Cáo</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{stats.total}</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '2px solid rgba(245, 158, 11, 0.3)'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>Chờ Xử Lý</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.pending}</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '2px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>Đang Điều Tra</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{stats.investigating}</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '2px solid rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>Đã Giải Quyết</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{stats.resolved}</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '2px solid rgba(107, 114, 128, 0.3)'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>Đã Bỏ Qua</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6b7280' }}>{stats.dismissed}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>
                Trạng Thái
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem'
                }}
              >
                <option value="all">Tất cả</option>
                <option value="pending">Chờ xử lý</option>
                <option value="investigating">Đang điều tra</option>
                <option value="resolved">Đã giải quyết</option>
                <option value="dismissed">Đã bỏ qua</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>
                Loại Vi Phạm
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem'
                }}
              >
                <option value="all">Tất cả</option>
                <option value="cheating">Gian lận</option>
                <option value="harassment">Quấy rối</option>
                <option value="inappropriate_name">Tên không phù hợp</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: '2px solid #fca5a5'
          }}>
            {error}
          </div>
        )}

        {/* Reports Table */}
        {loading ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '3rem',
            borderRadius: '12px',
            textAlign: 'center',
            fontSize: '1.2rem',
            color: '#667eea'
          }}>
            🔄 Đang tải dữ liệu...
          </div>
        ) : (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Người Báo Cáo</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Người Bị Báo Cáo</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Loại Vi Phạm</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Lý Do</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Trạng Thái</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Thời Gian</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                      Không có báo cáo nào
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report, index) => (
                    <tr key={report.id} style={{
                      borderBottom: '1px solid #e5e7eb',
                      background: index % 2 === 0 ? 'white' : '#f9fafb',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#f9fafb'}
                    >
                      <td style={{ padding: '1rem', color: '#111827', fontWeight: '500' }}>
                        {report.reporter_username || report.reporter_id}
                      </td>
                      <td style={{ padding: '1rem', color: '#111827', fontWeight: '500' }}>
                        {report.reported_username || report.reported_user_id}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          background: getTypeColor(report.type),
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
                        }}>
                          {getTypeText(report.type)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {report.reason}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          background: getStatusColor(report.status),
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
                        }}>
                          {getStatusText(report.status)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                        {new Date(report.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setShowDetailModal(true);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                          }}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedReport && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowDetailModal(false)}
          >
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>
                Chi Tiết Báo Cáo
              </h2>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Người báo cáo: </span>
                  <span style={{ color: '#111827', fontWeight: 'bold' }}>
                    {selectedReport.reporter_username || selectedReport.reporter_id}
                  </span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Người bị báo cáo: </span>
                  <span style={{ color: '#111827', fontWeight: 'bold' }}>
                    {selectedReport.reported_username || selectedReport.reported_user_id}
                  </span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Loại vi phạm: </span>
                  <span style={{
                    background: getTypeColor(selectedReport.type),
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                  }}>
                    {getTypeText(selectedReport.type)}
                  </span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Trạng thái: </span>
                  <span style={{
                    background: getStatusColor(selectedReport.status),
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                  }}>
                    {getStatusText(selectedReport.status)}
                  </span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Lý do: </span>
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    color: '#111827'
                  }}>
                    {selectedReport.reason}
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Nội dung chi tiết: </span>
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    color: '#111827'
                  }}>
                    {selectedReport.message || 'Không có nội dung bổ sung'}
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Thời gian báo cáo: </span>
                  <span style={{ color: '#111827' }}>
                    {new Date(selectedReport.created_at).toLocaleString('vi-VN')}
                  </span>
                </div>

                {selectedReport.resolved_at && (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <span style={{ color: '#6b7280', fontWeight: '500' }}>Người xử lý: </span>
                      <span style={{ color: '#111827', fontWeight: 'bold' }}>
                        {selectedReport.resolved_by_username || 'Admin'}
                      </span>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <span style={{ color: '#6b7280', fontWeight: '500' }}>Thời gian xử lý: </span>
                      <span style={{ color: '#111827' }}>
                        {new Date(selectedReport.resolved_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleDeleteReport(selectedReport.id)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  🗑️ Xóa
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    background: 'white',
                    color: '#374151',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Đóng
                </button>
                {selectedReport.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'investigating')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '1rem'
                      }}
                    >
                      🔍 Điều Tra
                    </button>
                    <button
                      onClick={() => handleResolveReport(selectedReport.id, 'dismissed')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                        color: 'white',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '1rem'
                      }}
                    >
                      ⭕ Bỏ Qua
                    </button>
                    <button
                      onClick={() => handleResolveReport(selectedReport.id, 'resolved')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '1rem'
                      }}
                    >
                      ✅ Giải Quyết
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsManagement;