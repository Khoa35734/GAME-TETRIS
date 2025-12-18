import React, { useEffect, useState } from 'react';

interface BannedUser {
  ban_id: number;
  user_id: number;
  user_name: string;
  admin_id: number;
  admin_name: string;
  reason: string;
  ban_start: string;
  ban_end: string | null;
  is_active: boolean;
  created_at: string;
}

const BannedUsersManagement: React.FC = () => {
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [banHistory, setBanHistory] = useState<BannedUser[]>([]);

  useEffect(() => {
    fetchActiveBans();
  }, []);

  const fetchActiveBans = async () => {
    setLoading(true);
    setError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      // This endpoint would need to be created in the backend
      const response = await fetch(`${API_BASE}/api/admin/banned-users`);
      if (response.ok) {
        const data = await response.json();
        setBannedUsers(data.filter((b: BannedUser) => b.is_active));
      } else {
        throw new Error('Không thể tải dữ liệu.');
      }
    } catch (err) {
      setError('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBanHistory = async (userId: number) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/reports/ban-history/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setBanHistory(data);
        setSelectedUserId(userId);
        setShowHistoryModal(true);
      } else {
        throw new Error('Không thể tải lịch sử.');
      }
    } catch (err) {
      alert('❌ Lỗi khi tải lịch sử ban');
    }
  };

  const handleUnbanUser = async (userId: number) => {
    if (!confirm('⚠️ Bạn có chắc muốn unban user này?')) return;

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/reports/unban/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: 1 }) // TODO: Get admin ID from auth
      });

      if (response.ok) {
        alert('✅ Đã unban user thành công!');
        fetchActiveBans();
      } else {
        throw new Error('Không thể unban user');
      }
    } catch (err) {
      alert('❌ Lỗi khi unban user');
    }
  };

  const getBanDuration = (banEnd: string | null) => {
    if (!banEnd) return 'Vĩnh viễn';
    
    const endDate = new Date(banEnd);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days <= 0) return 'Hết hạn';
    return `${days} ngày`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '2rem'
        }}>🚫 Quản Lý Người Dùng Bị Ban</h1>

        {/* Statistics */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Tổng Số User Bị Ban
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
            {bannedUsers.length}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            color: '#6b7280'
          }}>
            ⏳ Đang tải dữ liệu...
          </div>
        ) : error ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            color: '#ef4444'
          }}>
            ❌ {error}
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>User Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Admin</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Lý Do</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Thời Gian Ban</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Còn Lại</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {bannedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                      Không có user nào bị ban
                    </td>
                  </tr>
                ) : (
                  bannedUsers.map((ban, index) => (
                    <tr key={ban.ban_id} style={{
                      borderBottom: '1px solid #e5e7eb',
                      background: index % 2 === 0 ? 'white' : '#f9fafb'
                    }}>
                      <td style={{ padding: '1rem', color: '#111827', fontWeight: 'bold' }}>
                        {ban.user_name || `User #${ban.user_id}`}
                      </td>
                      <td style={{ padding: '1rem', color: '#6b7280' }}>
                        {ban.admin_name || `Admin #${ban.admin_id}`}
                      </td>
                      <td style={{ padding: '1rem', color: '#6b7280', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ban.reason}
                      </td>
                      <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                        {new Date(ban.ban_start).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          background: ban.ban_end ? '#f59e0b' : '#ef4444',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
                        }}>
                          {getBanDuration(ban.ban_end)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => fetchBanHistory(ban.user_id)}
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
                            📜 Lịch Sử
                          </button>
                          <button
                            onClick={() => handleUnbanUser(ban.user_id)}
                            style={{
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              padding: '0.5rem 1rem',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: 'bold'
                            }}
                          >
                            ✅ Unban
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* History Modal */}
        {showHistoryModal && (
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
          onClick={() => setShowHistoryModal(false)}
          >
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>
                📜 Lịch Sử Ban - User #{selectedUserId}
              </h2>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Admin</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Lý Do</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Thời Gian</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {banHistory.map((ban, index) => (
                    <tr key={ban.ban_id} style={{
                      borderBottom: '1px solid #e5e7eb',
                      background: index % 2 === 0 ? 'white' : '#f9fafb'
                    }}>
                      <td style={{ padding: '0.75rem', color: '#111827' }}>
                        {ban.admin_name || `Admin #${ban.admin_id}`}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#6b7280' }}>
                        {ban.reason}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.9rem' }}>
                        {new Date(ban.ban_start).toLocaleString('vi-VN')}
                        {ban.ban_end && (
                          <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                            Đến: {new Date(ban.ban_end).toLocaleString('vi-VN')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          background: ban.is_active ? '#ef4444' : '#6b7280',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}>
                          {ban.is_active ? '🔴 Active' : '⚪ Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                <button
                  onClick={() => setShowHistoryModal(false)}
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BannedUsersManagement;
