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

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
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
          background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f35 100%)',
          border: '2px solid rgba(100, 200, 255, 0.5)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 15px 50px rgba(0, 0, 0, 0.7), 0 0 40px rgba(100, 200, 255, 0.2)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '2px solid rgba(100, 200, 255, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ color: '#64c8ff', margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.5px' }}>
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
            <label style={{ color: '#a8c5ff', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px', letterSpacing: '0.3px' }}>
              📋 Danh mục *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1.5px solid rgba(100, 200, 255, 0.6)',
                background: 'rgba(20, 30, 60, 0.8)',
                color: '#e8f0ff',
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
            <label style={{ color: '#a8c5ff', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px', letterSpacing: '0.3px' }}>
              ✏️ Tiêu đề *
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
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1.5px solid rgba(100, 200, 255, 0.6)',
                background: 'rgba(20, 30, 60, 0.8)',
                color: '#e8f0ff',
                fontSize: '0.95rem',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#a8c5ff', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px', letterSpacing: '0.3px' }}>
              📝 Mô tả chi tiết *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Vui lòng mô tả chi tiết vấn đề hoặc đề xuất của bạn..."
              required
              rows={6}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1.5px solid rgba(100, 200, 255, 0.6)',
                background: 'rgba(20, 30, 60, 0.8)',
                color: '#e8f0ff',
                fontSize: '0.95rem',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Priority */}
          {/* Removed priority selection */}

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(76, 175, 80, 0.15)',
                border: '1.5px solid rgba(76, 175, 80, 0.5)',
                color: '#7cff7c',
                marginBottom: '20px',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              ✅ Gửi thành công! Cảm ơn bạn đã đóng góp.
            </div>
          )}

          {submitStatus === 'error' && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 107, 107, 0.15)',
                border: '1.5px solid rgba(255, 107, 107, 0.5)',
                color: '#ff6b6b',
                marginBottom: '20px',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: 500,
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
                ? 'rgba(100, 200, 255, 0.2)'
                : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
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
