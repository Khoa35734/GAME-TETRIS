import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Broadcast {
  id: number;
  admin_id: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  admin_name?: string;
}

const BroadcastMessages: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  
  const [formData, setFormData] = useState({
    admin_id: 1,
    title: '',
    message: '',
    type: 'info',
    priority: 'medium',
    is_active: true,
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchBroadcasts();
    const interval = setInterval(fetchBroadcasts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBroadcasts = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/broadcast`);
      if (response.ok) {
        const data = await response.json();
        setBroadcasts(data);
      } else {
        throw new Error('Không thể tải dữ liệu từ máy chủ.');
      }
    } catch (err) {
      setError('Không thể kết nối đến máy chủ.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        alert('✅ Tạo thông báo thành công!');
        closeModal();
        fetchBroadcasts();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Không thể tạo thông báo');
      }
    } catch (err) {
      alert('❌ Lỗi: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleUpdate = async () => {
    if (!selectedBroadcast) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/broadcast/${selectedBroadcast.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        alert('✅ Cập nhật thông báo thành công!');
        closeModal();
        fetchBroadcasts();
      } else {
        throw new Error('Không thể cập nhật thông báo');
      }
    } catch (err) {
      alert('❌ Lỗi khi cập nhật thông báo');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('⚠️ Bạn có chắc muốn xóa thông báo này?')) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/broadcast/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        alert('✅ Xóa thông báo thành công!');
        fetchBroadcasts();
      } else {
        throw new Error('Không thể xóa thông báo');
      }
    } catch (err) {
      alert('❌ Lỗi khi xóa thông báo');
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/broadcast/${id}/toggle`, {
        method: 'PATCH'
      });
      if (response.ok) {
        fetchBroadcasts();
      } else {
        throw new Error('Không thể thay đổi trạng thái');
      }
    } catch (err) {
      alert('❌ Lỗi khi thay đổi trạng thái');
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      admin_id: 1,
      title: '',
      message: '',
      type: 'info',
      priority: 'medium',
      is_active: true,
      start_date: '',
      end_date: ''
    });
    setSelectedBroadcast(null);
    setShowModal(true);
  };

  const openEditModal = (broadcast: Broadcast) => {
    setModalMode('edit');
    setSelectedBroadcast(broadcast);
    setFormData({
      admin_id: broadcast.admin_id,
      title: broadcast.title,
      message: broadcast.message,
      type: broadcast.type,
      priority: broadcast.priority,
      is_active: broadcast.is_active,
      start_date: broadcast.start_date || '',
      end_date: broadcast.end_date || ''
    });
    setShowModal(true);
  };

  const openViewModal = (broadcast: Broadcast) => {
    setModalMode('view');
    setSelectedBroadcast(broadcast);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBroadcast(null);
  };

  const filteredBroadcasts = broadcasts.filter(b => {
    if (filterType !== 'all' && b.type !== filterType) return false;
    if (filterPriority !== 'all' && b.priority !== filterPriority) return false;
    if (filterStatus === 'active' && !b.is_active) return false;
    if (filterStatus === 'inactive' && b.is_active) return false;
    return true;
  });

  const stats = {
    total: broadcasts.length,
    active: broadcasts.filter(b => b.is_active).length,
    info: broadcasts.filter(b => b.type === 'info').length,
    warning: broadcasts.filter(b => b.type === 'warning').length,
    maintenance: broadcasts.filter(b => b.type === 'maintenance').length,
    event: broadcasts.filter(b => b.type === 'event').length,
    high: broadcasts.filter(b => b.priority === 'high').length
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      info: '#3b82f6',
      warning: '#f59e0b',
      maintenance: '#8b5cf6',
      event: '#ec4899'
    };
    return colors[type] || colors.info;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: '#6b7280',
      medium: '#3b82f6',
      high: '#f97316'
    };
    return colors[priority] || colors.medium;
  };

  if (loading && broadcasts.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #581c87 0%, #1f2937 50%, #581c87 100%)', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '4px solid transparent', borderTopColor: '#a855f7', borderRadius: '50%', width: '64px', height: '64px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ fontSize: '1.25rem' }}>🔄 Đang tải thông báo...</p>
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
              📢 Quản Lý Thông Báo
            </h1>
            <p style={{ color: '#9ca3af', marginTop: '8px' }}>Tạo, chỉnh sửa và quản lý thông báo hệ thống</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={fetchBroadcasts} disabled={loading} style={{ background: '#9333ea', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.3s' }} onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#7e22ce')} onMouseLeave={(e) => (e.currentTarget.style.background = '#9333ea')}>
              <span>{loading ? '🔄' : '🔄'}</span> Làm mới
            </button>
            <button onClick={openCreateModal} style={{ background: '#059669', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.3s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#047857')} onMouseLeave={(e) => (e.currentTarget.style.background = '#059669')}>
              ➕ Tạo Thông Báo
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: 'linear-gradient(135deg, #9333ea, #7e22ce)', padding: '16px', borderRadius: '12px' }}>
            <p style={{ color: '#e9d5ff', fontSize: '0.875rem' }}>Tổng số</p>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold', marginTop: '4px' }}>{stats.total}</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', padding: '16px', borderRadius: '12px' }}>
            <p style={{ color: '#d1fae5', fontSize: '0.875rem' }}>Hoạt động</p>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold', marginTop: '4px' }}>{stats.active}</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', padding: '16px', borderRadius: '12px' }}>
            <p style={{ color: '#dbeafe', fontSize: '0.875rem' }}>Thông tin</p>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold', marginTop: '4px' }}>{stats.info}</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', padding: '16px', borderRadius: '12px' }}>
            <p style={{ color: '#fef3c7', fontSize: '0.875rem' }}>Cảnh báo</p>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold', marginTop: '4px' }}>{stats.warning}</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '16px', borderRadius: '12px' }}>
            <p style={{ color: '#ede9fe', fontSize: '0.875rem' }}>Bảo trì</p>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold', marginTop: '4px' }}>{stats.maintenance}</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #db2777, #be185d)', padding: '16px', borderRadius: '12px' }}>
            <p style={{ color: '#fce7f3', fontSize: '0.875rem' }}>Sự kiện</p>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold', marginTop: '4px' }}>{stats.event}</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)', padding: '16px', borderRadius: '12px' }}>
            <p style={{ color: '#fed7aa', fontSize: '0.875rem' }}>Ưu tiên cao</p>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold', marginTop: '4px' }}>{stats.high}</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ background: 'rgba(31, 41, 55, 0.5)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid #374151' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>Loại thông báo</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ width: '100%', background: '#374151', color: 'white', padding: '8px 16px', borderRadius: '8px', border: '1px solid #4b5563', outline: 'none' }}>
                <option value="all">Tất cả</option>
                <option value="info">Thông tin</option>
                <option value="warning">Cảnh báo</option>
                <option value="maintenance">Bảo trì</option>
                <option value="event">Sự kiện</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>Mức độ ưu tiên</label>
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ width: '100%', background: '#374151', color: 'white', padding: '8px 16px', borderRadius: '8px', border: '1px solid #4b5563', outline: 'none' }}>
                <option value="all">Tất cả</option>
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>Trạng thái</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: '100%', background: '#374151', color: 'white', padding: '8px 16px', borderRadius: '8px', border: '1px solid #4b5563', outline: 'none' }}>
                <option value="all">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Không hoạt động</option>
              </select>
            </div>
          </div>
        </div>

        {/* Broadcasts Table */}
        <div style={{ background: 'rgba(31, 41, 55, 0.5)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid #374151', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(17, 24, 39, 0.5)' }}>
                <tr>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>ID</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Tiêu đề</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Loại</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Ưu tiên</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Trạng thái</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Người tạo</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Ngày tạo</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredBroadcasts.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px 24px', textAlign: 'center', color: '#9ca3af' }}>
                      📭 Không có thông báo nào
                    </td>
                  </tr>
                ) : (
                  filteredBroadcasts.map((broadcast, index) => (
                    <tr key={broadcast.id} style={{ borderTop: '1px solid #374151', transition: 'background 0.3s' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(55, 65, 81, 0.3)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>#{broadcast.id}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '500' }}>{broadcast.title}</div>
                        <div style={{ fontSize: '0.875rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                          {broadcast.message.substring(0, 50)}...
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ background: getTypeColor(broadcast.type), color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {broadcast.type}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ background: getPriorityColor(broadcast.priority), color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {broadcast.priority}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <button onClick={() => handleToggleActive(broadcast.id)} style={{ background: broadcast.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)', color: broadcast.is_active ? '#4ade80' : '#9ca3af', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }}>
                          {broadcast.is_active ? '✅ Hoạt động' : '⭕ Tắt'}
                        </button>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>{broadcast.admin_name || 'N/A'}</td>
                      <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#9ca3af' }}>
                        {new Date(broadcast.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button onClick={() => openViewModal(broadcast)} style={{ background: '#2563eb', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }} title="Xem chi tiết">👁️</button>
                          <button onClick={() => openEditModal(broadcast)} style={{ background: '#d97706', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }} title="Chỉnh sửa">✏️</button>
                          <button onClick={() => handleDelete(broadcast.id)} style={{ background: '#dc2626', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }} title="Xóa">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal - simplified for space */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }} onClick={closeModal}>
            <div style={{ background: '#1f2937', borderRadius: '12px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #374151' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ background: 'linear-gradient(90deg, #9333ea, #ec4899)', padding: '24px', borderRadius: '12px 12px 0 0' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                  {modalMode === 'create' && '➕ Tạo Thông Báo Mới'}
                  {modalMode === 'edit' && '✏️ Chỉnh Sửa Thông Báo'}
                  {modalMode === 'view' && '👁️ Chi Tiết Thông Báo'}
                </h2>
              </div>
              <div style={{ padding: '24px' }}>
                {modalMode === 'view' && selectedBroadcast ? (
                  <div style={{ color: 'white' }}>
                    <p><strong>ID:</strong> #{selectedBroadcast.id}</p>
                    <p><strong>Tiêu đề:</strong> {selectedBroadcast.title}</p>
                    <p><strong>Nội dung:</strong> {selectedBroadcast.message}</p>
                    <p><strong>Loại:</strong> {selectedBroadcast.type}</p>
                    <p><strong>Trạng thái:</strong> {selectedBroadcast.is_active ? 'Hoạt động' : 'Tắt'}</p>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px', color: 'white' }}>Tiêu đề</label>
                      <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Nhập tiêu đề thông báo..." style={{ width: '100%', background: '#374151', color: 'white', padding: '10px 16px', borderRadius: '8px', border: '1px solid #4b5563', outline: 'none' }} />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px', color: 'white' }}>Nội dung</label>
                      <textarea value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} placeholder="Nhập nội dung thông báo..." rows={5} style={{ width: '100%', background: '#374151', color: 'white', padding: '10px 16px', borderRadius: '8px', border: '1px solid #4b5563', resize: 'vertical', outline: 'none' }}></textarea>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px', color: 'white' }}>
                          📋 Loại thông báo
                        </label>
                        <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} style={{ width: '100%', background: '#374151', color: 'white', padding: '10px 16px', borderRadius: '8px', border: '1px solid #4b5563', outline: 'none', cursor: 'pointer' }}>
                          <option value="info">ℹ️ Thông tin</option>
                          <option value="warning">⚠️ Cảnh báo</option>
                          <option value="maintenance">🔧 Bảo trì</option>
                          <option value="event">🎉 Sự kiện</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px', color: 'white' }}>
                          🎯 Mức độ ưu tiên
                        </label>
                        <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} style={{ width: '100%', background: '#374151', color: 'white', padding: '10px 16px', borderRadius: '8px', border: '1px solid #4b5563', outline: 'none', cursor: 'pointer' }}>
                          <option value="low">🟢 Thấp</option>
                          <option value="medium">🔵 Trung bình</option>
                          <option value="high">🔴 Cao</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px', color: 'white' }}>
                          📅 Ngày bắt đầu (tùy chọn)
                        </label>
                        <input type="datetime-local" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} style={{ width: '100%', background: '#374151', color: 'white', padding: '10px 16px', borderRadius: '8px', border: '1px solid #4b5563', outline: 'none' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px', color: 'white' }}>
                          📅 Ngày kết thúc (tùy chọn)
                        </label>
                        <input type="datetime-local" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} style={{ width: '100%', background: '#374151', color: 'white', padding: '10px 16px', borderRadius: '8px', border: '1px solid #4b5563', outline: 'none' }} />
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>✅ Kích hoạt ngay lập tức</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
              <div style={{ background: 'rgba(17, 24, 39, 0.5)', padding: '16px 24px', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={closeModal} style={{ background: '#374151', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                  {modalMode === 'view' ? 'Đóng' : 'Hủy'}
                </button>
                {modalMode !== 'view' && (
                  <button onClick={modalMode === 'create' ? handleCreate : handleUpdate} style={{ background: '#9333ea', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                    {modalMode === 'create' ? '➕ Tạo' : '💾 Lưu'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BroadcastMessages;
