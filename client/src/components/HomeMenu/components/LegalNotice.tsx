import React from 'react';
import { showPrivacy, showRules, showTerms } from '../utils';

const LegalNotice: React.FC = () => (
  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888888' }}>
    Bằng việc tham gia, bạn đồng ý với{' '}
    <button
      onClick={showTerms}
      style={{ background: 'none', border: 'none', color: '#4ecdc4', textDecoration: 'none', cursor: 'pointer', margin: '0 5px' }}
      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
    >
      Điều khoản sử dụng
    </button>
    ,{' '}
    <button
      onClick={showPrivacy}
      style={{ background: 'none', border: 'none', color: '#4ecdc4', textDecoration: 'none', cursor: 'pointer', margin: '0 5px' }}
      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
    >
      Chính sách bảo mật
    </button>{' '}
    và{' '}
    <button
      onClick={showRules}
      style={{ background: 'none', border: 'none', color: '#4ecdc4', textDecoration: 'none', cursor: 'pointer', margin: '0 5px' }}
      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
    >
      Quy tắc
    </button>
  </div>
);

export default React.memo(LegalNotice);

