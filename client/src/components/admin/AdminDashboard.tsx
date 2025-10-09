import React, { useState } from 'react';
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

// Dữ liệu mẫu tạm thời cho đến khi tích hợp server thật
const mockRooms: RoomInfo[] = [
  { id: 'ABCD', players: 2, status: 'playing', createdAt: Date.now() - 1000 * 60 * 2 },
  { id: 'EFGH', players: 1, status: 'waiting', createdAt: Date.now() - 1000 * 60 * 5 },
];
const mockPlayers: PlayerInfo[] = [
  { id: 'u1', name: 'Alpha', rating: 1234, online: true, inRoom: 'ABCD' },
  { id: 'u2', name: 'Beta', rating: 1180, online: true, inRoom: 'ABCD' },
  { id: 'u3', name: 'Gamma', rating: 900, online: false },
  { id: 'u4', name: 'Delta', rating: 1010, online: true, inRoom: 'EFGH' },
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

const AdminDashboard: React.FC = () => {
  const [rooms, setRooms] = useState<RoomInfo[]>(mockRooms);
  const [players, setPlayers] = useState<PlayerInfo[]>(mockPlayers);
  const [filterOnlineOnly, setFilterOnlineOnly] = useState(false);

  const terminateRoom = (id: string) => {
    // Tạm thời: đánh dấu là đã kết thúc
    setRooms(r => r.map(room => room.id === id ? { ...room, status: 'finished' } : room));
    // Trường hợp thực tế: gửi lệnh admin đến server
  };

  const kickPlayer = (id: string) => {
    setPlayers(p => p.map(pl => pl.id === id ? { ...pl, inRoom: undefined } : pl));
  };

  const filteredPlayers = players.filter(p => !filterOnlineOnly || p.online);

  const totalOnline = players.filter(p => p.online).length;
  const playingRooms = rooms.filter(r => r.status === 'playing').length;

  return (
    <div style={{ padding: 24, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Bảng Điều Khiển Quản Trị</h1>
        <Link to='/' style={{ color: '#61dafb', textDecoration: 'none', fontWeight: 600 }}>← Về Trang Chủ</Link>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Thống Kê Thời Gian Thực</h3>
          <div style={{ fontSize: 13, opacity: 0.9 }}>Cập nhật cục bộ (mẫu)</div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div>Tổng Người Chơi: {players.length}</div>
            <div>Người Chơi Online: {totalOnline}</div>
            <div>Phòng Đang Chơi: {playingRooms}</div>
            <div>Phòng Đang Chờ: {rooms.filter(r => r.status === 'waiting').length}</div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Điều Khiển Máy Chủ</h3>
          <button style={btn} onClick={() => alert('Ping server (mẫu)')}>Ping Máy Chủ</button>
          <button style={btn} onClick={() => alert('Gửi thông báo bảo trì (mẫu)')}>Gửi Thông Báo</button>
          <button style={btnDanger} onClick={() => { setRooms([]); setPlayers([]); }}>Xóa Tất Cả (Mẫu)</button>
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Bộ Lọc</h3>
          <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type='checkbox' checked={filterOnlineOnly} onChange={e => setFilterOnlineOnly(e.target.checked)} />
            Chỉ hiện online
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
        <div style={{ ...cardStyle, minWidth: 'auto' }}>
          <h3 style={{ margin: 0 }}>Phòng</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thtd}>ID</th>
                <th style={thtd}>Người Chơi</th>
                <th style={thtd}>Trạng Thái</th>
                <th style={thtd}>Thời Gian</th>
                <th style={thtd}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 && (
                <tr><td style={thtd} colSpan={5}>(không có phòng)</td></tr>
              )}
              {rooms.map(r => (
                <tr key={r.id}>
                  <td style={thtd}>{r.id}</td>
                  <td style={thtd}>{r.players}</td>
                  <td style={thtd}>{badge(
                    r.status === 'playing' ? 'Đang chơi' : r.status === 'waiting' ? 'Đang chờ' : 'Đã kết thúc', 
                    r.status === 'playing' ? 'linear-gradient(90deg,#34d399,#059669)' : r.status === 'waiting' ? 'linear-gradient(90deg,#fbbf24,#d97706)' : '#4b5563'
                  )}</td>
                  <td style={thtd}>{Math.floor((Date.now()-r.createdAt)/60000)} phút</td>
                  <td style={thtd}>
                    {r.status !== 'finished' && <button style={miniBtnDanger} onClick={() => terminateRoom(r.id)}>Kết Thúc</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ ...cardStyle, minWidth: 'auto' }}>
          <h3 style={{ margin: 0 }}>Người Chơi</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thtd}>Tên</th>
                <th style={thtd}>Điểm</th>
                <th style={thtd}>Trạng Thái</th>
                <th style={thtd}>Phòng</th>
                <th style={thtd}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length === 0 && (
                <tr><td style={thtd} colSpan={5}>(không có người chơi)</td></tr>
              )}
              {filteredPlayers.map(p => (
                <tr key={p.id}>
                  <td style={thtd}>{p.name}</td>
                  <td style={thtd}>{p.rating}</td>
                  <td style={thtd}>{p.online ? badge('Online','#2563eb') : badge('Offline','#374151')}</td>
                  <td style={thtd}>{p.inRoom ?? '-'}</td>
                  <td style={thtd}>{p.inRoom && <button style={miniBtn} onClick={() => kickPlayer(p.id)}>Đá</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 40, fontSize: 12, opacity: 0.6 }}>
        * Đây là phiên bản mock. Khi tích hợp server: thay state rooms/players bằng dữ liệu real-time (WebSocket), các nút gọi API / emit event.
      </div>
    </div>
  );
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

const btnDanger: React.CSSProperties = {
  ...btn,
  background: 'linear-gradient(90deg,#ef4444,#b91c1c)'
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

export default AdminDashboard;