import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { getUserData } from '../services/authService';
import { getApiBaseUrl } from '../services/apiConfig';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1200;
`;

const Box = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  width: 420px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.35);
`;

const Title = styled.h3`
  margin: 0 0 12px 0;
`;

const Field = styled.div`
  margin-bottom: 12px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ddd;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ddd;
`;

const Buttons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
`;

const Button = styled.button`
  padding: 8px 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
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
        <Title>Báo cáo người chơi</Title>
        {resolvedReportedId ? (
          <Field>
            <label>Người bị báo cáo</label>
            <div style={{ padding: 8, background: '#f7f7f7', borderRadius: 6 }}>
              {reportedUsername ? `${reportedUsername} (id: ${resolvedReportedId})` : `id: ${resolvedReportedId}`}
            </div>
          </Field>
        ) : (
          <Field>
            <label>Reported username</label>
            <Input value={reportedUsername} onChange={(e) => setReportedUsername(e.target.value)} placeholder="Nhập username của người bị báo cáo (ví dụ: Player123)" />
          </Field>
        )}
        <Field>
          <label>Mô tả (chi tiết)</label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mô tả hành vi vi phạm, thời điểm, bằng chứng..." />
        </Field>

        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

        {submittedSuccess ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#064e3b' }}>
              Báo cáo đã được gửi. Cảm ơn bạn — chúng tôi sẽ xem xét và xử lý nếu cần.
            </div>
            <Buttons>
              <Button onClick={() => { setSubmittedSuccess(false); onClose(); }}>Đóng</Button>
            </Buttons>
          </div>
        ) : (
          <Buttons>
            <Button onClick={onClose} disabled={submitting}>Hủy</Button>
            <Button onClick={submitReport} disabled={submitting} style={{ background: '#2563eb', color: 'white' }}>{submitting ? 'Đang gửi...' : 'Gửi báo cáo'}</Button>
          </Buttons>
        )}
      </Box>
    </Backdrop>
  );
};

export default ReportModal;
