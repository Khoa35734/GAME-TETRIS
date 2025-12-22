import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { getUserData } from '../services/authService';
import { getApiBaseUrl } from '../services/apiConfig';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1200;
`;

const Box = styled.div`
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f35 100%);
  padding: 28px;
  border-radius: 14px;
  width: 480px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(100, 200, 255, 0.2);
  border: 2px solid rgba(100, 200, 255, 0.5);
`;

const Title = styled.h3`
  margin: 0 0 20px 0;
  color: #64c8ff;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 0 12px rgba(100, 200, 255, 0.6);
  letter-spacing: 0.5px;
`;

const Field = styled.div`
  margin-bottom: 18px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1.5px solid rgba(100, 200, 255, 0.6);
  background: rgba(20, 30, 60, 0.8);
  color: #e8f0ff;
  font-size: 14px;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #64c8ff;
    background: rgba(50, 80, 140, 0.5);
    box-shadow: 0 0 16px rgba(100, 200, 255, 0.4);
  }
  
  &::placeholder {
    color: #7a8fa6;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 140px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1.5px solid rgba(100, 200, 255, 0.6);
  background: rgba(20, 30, 60, 0.8);
  color: #e8f0ff;
  font-size: 14px;
  resize: vertical;
  transition: all 0.3s ease;
  font-family: inherit;
  line-height: 1.5;
  
  &:focus {
    outline: none;
    border-color: #64c8ff;
    background: rgba(50, 80, 140, 0.5);
    box-shadow: 0 0 16px rgba(100, 200, 255, 0.4);
  }
  
  &::placeholder {
    color: #7a8fa6;
  }
`;

const Buttons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
`;

const Button = styled.button`
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // If parent knows the reported user id, pass it; otherwise user can enter it manually
  reportedUserId?: number | null;
  // Optional match id or context
  matchId?: string;
  onSubmitted?: () => void;
}

const ReportModal: React.FC<Props> = ({ isOpen, onClose, reportedUserId = null, matchId, onSubmitted }) => {
  const [reportedUsername, setReportedUsername] = useState<string>('');
  const [resolvedReportedId, setResolvedReportedId] = useState<number | null>(reportedUserId || null);
  // Keep type fixed to simplify UI (user only inputs reason)
  const [type] = useState<string>('in-game');
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // If parent supplied reportedUserId, fetch the username to show and set resolved id
  useEffect(() => {
    setResolvedReportedId(reportedUserId || null);
    if (reportedUserId) {
      (async () => {
        try {
          const API_BASE = getApiBaseUrl();
          const res = await axios.get(`${API_BASE}/users/${reportedUserId}`);
          const data = res.data as any;
          if (data?.username) setReportedUsername(data.username);
        } catch (err) {
          // ignore - fallback to empty username
        }
      })();
    } else {
      setReportedUsername('');
    }
  }, [reportedUserId, isOpen]);

  if (!isOpen) return null;

  const submitReport = async () => {
    setError(null);
    const user = getUserData();
    if (!user || !user.accountId) {
      setError('Bạn phải đăng nhập để gửi báo cáo.');
      return;
    }

    // Resolve reported user id: prefer prop, otherwise lookup by username
    let rid: number | null = resolvedReportedId;

    if (!rid) {
      const username = reportedUsername.trim();
      if (!username) {
        setError('Vui lòng cung cấp username của người bị báo cáo hoặc định danh người chơi.');
        return;
      }

      try {
        const API_BASE = getApiBaseUrl();
        const resp = await axios.get(`${API_BASE}/users/lookup?username=${encodeURIComponent(username)}`);
        const data = resp.data as any;
        rid = data?.userId || null;
      } catch (err: any) {
        setError('Không tìm thấy người dùng với username đó.');
        return;
      }
    }

    if (!message || message.trim().length < 5) {
      setError('Vui lòng nhập mô tả (ít nhất 5 ký tự).');
      return;
    }

    setSubmitting(true);
    try {
      const API_BASE = getApiBaseUrl();
      const payload = {
        reporter_id: user.accountId,
        reported_user_id: rid,
        type,
        reason: '',
        message: matchId ? `${message}\n(match:${matchId})` : message,
      };

      const token = localStorage.getItem('tetris:accessToken');

      const res = await axios.post(`${API_BASE}/reports`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (res.status === 201 || res.status === 200) {
        if (onSubmitted) onSubmitted();
        // Show a friendly success message and keep modal open so user sees confirmation
        setSubmittedSuccess(true);
      } else {
        setError('Lỗi khi gửi báo cáo. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error('Report error', err);
      setError(err?.response?.data?.message || 'Lỗi khi gửi báo cáo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Backdrop>
      <Box>
        <Title>🚨 Báo cáo người chơi</Title>
        {resolvedReportedId ? (
          <Field>
            <div style={{ color: '#a8c5ff', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>👤 Người bị báo cáo</div>
            <div style={{ padding: '12px 14px', background: 'rgba(30, 50, 100, 0.7)', border: '1px solid rgba(100, 200, 255, 0.4)', borderRadius: '8px', color: '#d0e8ff', fontSize: '14px' }}>
              {reportedUsername ? `${reportedUsername} (ID: ${resolvedReportedId})` : `ID: ${resolvedReportedId}`}
            </div>
          </Field>
        ) : (
          <Field>
            <div style={{ color: '#a8c5ff', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>👤 Username của người bị báo cáo</div>
            <Input value={reportedUsername} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportedUsername(e.target.value)} placeholder="Ví dụ: Player123" />
          </Field>
        )}
        <Field>
          <div style={{ color: '#a8c5ff', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>📝 Chi tiết hành vi vi phạm *</div>
          <Textarea value={message} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)} placeholder="Mô tả chi tiết: hành vi vi phạm, thời điểm, bằng chứng..." />
        </Field>

        {error && <div style={{ color: '#ff6b6b', marginBottom: '12px', padding: '10px 12px', background: 'rgba(255, 107, 107, 0.15)', borderRadius: '6px', fontSize: '13px', fontWeight: 500 }}>❌ {error}</div>}

        {submittedSuccess ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ padding: '14px', background: 'rgba(76, 175, 80, 0.15)', border: '1.5px solid rgba(76, 175, 80, 0.5)', borderRadius: '8px', color: '#7cff7c', fontSize: '14px', fontWeight: 500, lineHeight: 1.5 }}>
              ✅ Báo cáo đã được gửi. Cảm ơn bạn — chúng tôi sẽ xem xét và xử lý nếu cần.
            </div>
            <Buttons>
              <Button onClick={() => { setSubmittedSuccess(false); onClose(); }} style={{ background: 'rgba(100, 200, 255, 0.2)', color: '#64c8ff', border: '1px solid rgba(100, 200, 255, 0.5)' }}>Đóng</Button>
            </Buttons>
          </div>
        ) : (
          <Buttons>
            <Button onClick={onClose} disabled={submitting} style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#c8d8e8', border: '1px solid rgba(200, 216, 232, 0.3)' }}>Hủy</Button>
            <Button onClick={submitReport} disabled={submitting} style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', fontWeight: 700 }}>{submitting ? '⏳ Đang gửi...' : '✉️ Gửi báo cáo'}</Button>
          </Buttons>
        )}
      </Box>
    </Backdrop>
  );
};

export default ReportModal;
