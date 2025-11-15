import React, { useState } from 'react';
import { getUserData } from '../services/authService';
import axios from 'axios';
import { getApiBaseUrl } from '../services/apiConfig';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Category {
  value: string;
  label: string;
}

const FEEDBACK_CATEGORIES: Category[] = [
  { value: 'feature_request', label: 'Đề xuất tính năng mới' },
  { value: 'bug', label: 'Lỗi kỹ thuật' },
  { value: 'improvement', label: 'Cải thiện game' },
  { value: 'ui_ux', label: 'Giao diện / Trải nghiệm' },
  { value: 'performance', label: 'Hiệu suất / Lag' },
  { value: 'matchmaking', label: 'Hệ thống ghép trận' },
  { value: 'balance', label: 'Cân bằng game' },
  { value: 'other', label: 'Khác' },
];

type Priority = 'low' | 'medium' | 'high';

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setCategory('');
    setSubject('');
    setDescription('');
    setPriority('medium');
    setSubmitStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const user = getUserData();
    if (!user || user.isGuest) {
      alert('Bạn cần đăng nhập để gửi feedback!');
      return;
    }

    if (!category || !subject || !description) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const payload = {
        userId: user.accountId,
        category,
        subject,
        description,
        priority,
      };

      await axios.post(`${getApiBaseUrl()}/feedback`, payload);

      setSubmitStatus('success');
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '2px solid rgba(78, 205, 196, 0.3)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '2px solid rgba(78, 205, 196, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ color: '#4ecdc4', margin: 0, fontSize: '1.5rem' }}>
            📢 Gửi phản hồi
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '1.5rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Category */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>
              Danh mục *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: '0.95rem',
              }}
            >
              <option value="">-- Chọn danh mục --</option>
              {FEEDBACK_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>
              Tiêu đề *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Mô tả ngắn gọn vấn đề"
              required
              maxLength={255}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: '0.95rem',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>
              Mô tả chi tiết *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Vui lòng mô tả chi tiết vấn đề hoặc đề xuất của bạn..."
              required
              rows={6}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: '0.95rem',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Priority */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: '#ccc', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>
              Mức độ ưu tiên
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: priority === p
                      ? '2px solid #4ecdc4'
                      : '2px solid rgba(255, 255, 255, 0.1)',
                    background: priority === p
                      ? 'rgba(78, 205, 196, 0.15)'
                      : 'rgba(255, 255, 255, 0.05)',
                    color: priority === p ? '#4ecdc4' : '#999',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  {p === 'low' && '🟢 Thấp'}
                  {p === 'medium' && '🟡 Trung bình'}
                  {p === 'high' && '🔴 Cao'}
                </button>
              ))}
            </div>
          </div>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(74, 222, 128, 0.15)',
                border: '2px solid rgba(74, 222, 128, 0.4)',
                color: '#4ade80',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              ✅ Gửi thành công! Cảm ơn bạn đã đóng góp.
            </div>
          )}

          {submitStatus === 'error' && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(248, 113, 113, 0.15)',
                border: '2px solid rgba(248, 113, 113, 0.4)',
                color: '#f87171',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              ❌ Có lỗi xảy ra. Vui lòng thử lại sau.
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              background: isSubmitting
                ? 'rgba(78, 205, 196, 0.3)'
                : 'linear-gradient(135deg, #4ecdc4 0%, #44a7a0 100%)',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? '⏳ Đang gửi...' : '📤 Gửi phản hồi'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
