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

// Placeholder mock data until real server integration
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
    // Placeholder: mark finished
    setRooms(r => r.map(room => room.id === id ? { ...room, status: 'finished' } : room));
    // In real case: emit admin command to server
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
        <h1 style={{ margin: 0, fontSize: 28 }}>Admin Dashboard</h1>
        <Link to='/' style={{ color: '#61dafb', textDecoration: 'none', fontWeight: 600 }}>← Back Home</Link>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Realtime Stats</h3>
          <div style={{ fontSize: 13, opacity: 0.9 }}>Updated locally (mock)</div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div>Total Players: {players.length}</div>
            <div>Online Players: {totalOnline}</div>
            <div>Active Rooms: {playingRooms}</div>
            <div>Waiting Rooms: {rooms.filter(r => r.status === 'waiting').length}</div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Server Controls</h3>
          <button style={btn} onClick={() => alert('Ping server (mock)')}>Ping Server</button>
          <button style={btn} onClick={() => alert('Broadcast maintenance message (mock)')}>Broadcast Notice</button>
          <button style={btnDanger} onClick={() => { setRooms([]); setPlayers([]); }}>Wipe All (Mock)</button>
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Filters</h3>
          <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type='checkbox' checked={filterOnlineOnly} onChange={e => setFilterOnlineOnly(e.target.checked)} />
            Online only
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
        <div style={{ ...cardStyle, minWidth: 'auto' }}>
          <h3 style={{ margin: 0 }}>Rooms</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thtd}>ID</th>
                <th style={thtd}>Players</th>
                <th style={thtd}>Status</th>
                <th style={thtd}>Age</th>
                <th style={thtd}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 && (
                <tr><td style={thtd} colSpan={5}>(no rooms)</td></tr>
              )}
              {rooms.map(r => (
                <tr key={r.id}>
                  <td style={thtd}>{r.id}</td>
                  <td style={thtd}>{r.players}</td>
                  <td style={thtd}>{badge(r.status, r.status === 'playing' ? 'linear-gradient(90deg,#34d399,#059669)' : r.status === 'waiting' ? 'linear-gradient(90deg,#fbbf24,#d97706)' : '#4b5563')}</td>
                  <td style={thtd}>{Math.floor((Date.now()-r.createdAt)/60000)}m</td>
                  <td style={thtd}>
                    {r.status !== 'finished' && <button style={miniBtnDanger} onClick={() => terminateRoom(r.id)}>Terminate</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ ...cardStyle, minWidth: 'auto' }}>
          <h3 style={{ margin: 0 }}>Players</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thtd}>Name</th>
                <th style={thtd}>Rating</th>
                <th style={thtd}>Status</th>
                <th style={thtd}>Room</th>
                <th style={thtd}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length === 0 && (
                <tr><td style={thtd} colSpan={5}>(no players)</td></tr>
              )}
              {filteredPlayers.map(p => (
                <tr key={p.id}>
                  <td style={thtd}>{p.name}</td>
                  <td style={thtd}>{p.rating}</td>
                  <td style={thtd}>{p.online ? badge('Online','#2563eb') : badge('Offline','#374151')}</td>
                  <td style={thtd}>{p.inRoom ?? '-'}</td>
                  <td style={thtd}>{p.inRoom && <button style={miniBtn} onClick={() => kickPlayer(p.id)}>Kick</button>}</td>
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
