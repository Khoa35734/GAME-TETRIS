import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0, 0, 0, 0.88)', backdropFilter: 'blur(6px)', zIndex: 1600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'linear-gradient(135deg, #111 0%, #1b1f24 100%)', color: '#fff', borderRadius: 16, width: 'min(720px, 92vw)', maxHeight: '82vh', overflow: 'auto', padding: '24px', border: '1px solid rgba(78, 205, 196, 0.25)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#4ecdc4' }}>📘 Hướng dẫn chơi</h2>
          <button
            onClick={onClose}
            style={{ background: 'rgba(244, 67, 54, 0.2)', border: '1px solid rgba(244, 67, 54, 0.5)', color: '#ff6b6b', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(244, 67, 54, 0.35)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)'; }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0, color: '#ffc107' }}>Phím điều khiển cơ bản</h3>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, color: '#ddd' }}>
              <li>Mũi tên Trái/Phải: Di chuyển trái/phải</li>
              <li>Mũi tên Xuống: Rơi nhanh (Soft Drop)</li>
              <li>Space: Thả ngay (Hard Drop)</li>
              <li>X hoặc Mũi tên Lên: Xoay theo chiều kim đồng hồ</li>
              <li>Z: Xoay ngược chiều kim đồng hồ</li>
              <li>A hoặc Shift: Xoay 180° (nếu bật)</li>
              <li>C hoặc Shift: Giữ/Đổi khối (Hold)</li>
              <li>P: Tạm dừng</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0, color: '#4ecdc4' }}>Mẹo chơi</h3>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, color: '#ddd' }}>
              <li>DAS/ARR giúp giữ phím để di chuyển liên tục (ARR=0 sẽ trượt tức thì).</li>
              <li>Giữ khối (Hold) thông minh để tạo T-Spin hoặc Tetris.</li>
              <li>Combo và B2B sẽ gửi rác mạnh hơn cho đối thủ.</li>
              <li>3 hàng trên cùng là Buffer – đừng để khối merged lọt vào đó!</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0, color: '#ba68c8' }}>Mạng & hiệu năng</h3>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, color: '#ddd' }}>
              <li>Ưu tiên UDP/WebRTC để giảm trễ; hệ thống sẽ fallback TCP khi cần.</li>
              <li>Các sự kiện quan trọng (Topout, Attack) luôn có log & TCP dự phòng.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(HelpModal);

