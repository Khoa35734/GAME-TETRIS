import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import type {
  KeyBindings,
  UserSettings,
} from '../services/settingsService';
import {
  getUserSettings,
  updateKeyBindings,
  updateUserSettings,
  resetSettings,
  DEFAULT_KEY_BINDINGS,
} from '../services/settingsService';

const SettingsContainer = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  color: white;
  font-family: 'Pixcel', monospace;
`;

const Title = styled.h1`
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 30px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
`;

const Section = styled.div`
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid #444;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 15px;
  color: #4af;
  border-bottom: 2px solid #4af;
  padding-bottom: 5px;
`;

const KeyBindingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #333;

  &:last-child {
    border-bottom: none;
  }
`;

const KeyLabel = styled.label`
  font-size: 1rem;
  flex: 1;
`;

const KeyInput = styled.input`
  background: #222;
  border: 2px solid #555;
  border-radius: 5px;
  color: white;
  padding: 8px 15px;
  font-size: 1rem;
  font-family: 'Courier New', monospace;
  min-width: 150px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #4af;
    background: #333;
  }

  &.listening {
    border-color: #f4a;
    background: #442;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
`;

const SettingLabel = styled.label`
  font-size: 1rem;
  flex: 1;
`;

const NumberInput = styled.input`
  background: #222;
  border: 2px solid #555;
  border-radius: 5px;
  color: white;
  padding: 5px 10px;
  font-size: 1rem;
  width: 80px;
  text-align: center;

  &:focus {
    outline: none;
    border-color: #4af;
  }
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 12px 30px;
  font-size: 1.1rem;
  font-family: 'Pixcel', monospace;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: #4af;
          color: #000;
          &:hover { background: #5bf; }
        `;
      case 'danger':
        return `
          background: #f44;
          color: white;
          &:hover { background: #f55; }
        `;
      default:
        return `
          background: #666;
          color: white;
          &:hover { background: #777; }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Message = styled.div<{ type: 'success' | 'error' }>`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 15px 30px;
  border-radius: 8px;
  text-align: center;
  font-size: 1.1rem;
  font-weight: bold;
  z-index: 9999;
  min-width: 300px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  animation: slideDown 0.3s ease-out;
  ${props => props.type === 'success' 
    ? 'background: rgba(0, 200, 0, 0.95); color: #fff; border: 2px solid #0f0;'
    : 'background: rgba(220, 50, 50, 0.95); color: #fff; border: 2px solid #f44;'
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translate(-50%, -20px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
`;

const BackButton = styled.button`
  position: absolute;
  top: 20px;
  left: 20px;
  padding: 10px 20px;
  font-family: 'Pixcel', monospace;
  font-size: 1rem;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid #666;
  border-radius: 5px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: #4af;
  }
`;

interface SettingsPageProps {
  onBack: () => void;
}

const KEY_NAMES: Record<keyof KeyBindings, string> = {
  moveLeft: 'Di chuyển trái',
  moveRight: 'Di chuyển phải',
  softDrop: 'Rơi chậm',
  hardDrop: 'Rơi nhanh',
  rotateClockwise: 'Xoay phải',
  rotateCounterClockwise: 'Xoay trái',
  rotate180: 'Xoay 180°',
  hold: 'Giữ',
  restart: 'Chơi lại',
};

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(DEFAULT_KEY_BINDINGS);
  const [settings, setSettings] = useState<UserSettings>({});
  const [listeningFor, setListeningFor] = useState<keyof KeyBindings | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const result = await getUserSettings();
    if (result.success && result.settings) {
      setSettings(result.settings);
      setKeyBindings(result.settings.key_bindings || DEFAULT_KEY_BINDINGS);
    }
    setLoading(false);
  };

  const handleKeyPress = (e: KeyboardEvent, action: keyof KeyBindings) => {
    e.preventDefault();
    
    const key = e.key === ' ' ? 'Space' : e.key;
    
    // Check if key is already assigned
    const duplicate = Object.entries(keyBindings).find(
      ([k, v]) => v === key && k !== action
    );

    if (duplicate) {
      setMessage({ text: `Phím "${key}" đã được gán cho "${KEY_NAMES[duplicate[0] as keyof KeyBindings]}"`, type: 'error' });
      setListeningFor(null);
      return;
    }

    setKeyBindings((prev: KeyBindings) => ({ ...prev, [action]: key }));
    setListeningFor(null);
    setMessage({ text: `Đã gán "${key}" cho "${KEY_NAMES[action]}"`, type: 'success' });
    
    setTimeout(() => setMessage(null), 2000);
  };

  const startListening = (action: keyof KeyBindings) => {
    setListeningFor(action);
    
    const handleKey = (e: KeyboardEvent) => {
      handleKeyPress(e, action);
      document.removeEventListener('keydown', handleKey);
    };

    document.addEventListener('keydown', handleKey);
  };

  const handleSave = async () => {
    setLoading(true);
    
    // Save key bindings
    const keyResult = await updateKeyBindings(keyBindings);
    
    // Save other settings
    const settingsResult = await updateUserSettings({
      das_delay_ms: settings.das_delay_ms,
      arr_ms: settings.arr_ms,
      soft_drop_rate: settings.soft_drop_rate,
      show_next_pieces: settings.show_next_pieces,
      sound_enabled: settings.sound_enabled,
      music_enabled: settings.music_enabled,
      sound_volume: settings.sound_volume,
      music_volume: settings.music_volume,
      theme_preference: settings.theme_preference,
      language_pref: settings.language_pref,
    });

    setLoading(false);

    if (keyResult.success && settingsResult.success) {
      setMessage({ text: 'Đã lưu cài đặt thành công!', type: 'success' });
    } else {
      setMessage({ text: keyResult.message || settingsResult.message || 'Lỗi khi lưu cài đặt', type: 'error' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const handleReset = async () => {
    if (!window.confirm('Bạn có chắc muốn reset về cài đặt mặc định?')) {
      return;
    }

    setLoading(true);
    const result = await resetSettings();
    setLoading(false);

    if (result.success) {
      setMessage({ text: 'Đã reset về cài đặt mặc định!', type: 'success' });
      await loadSettings();
    } else {
      setMessage({ text: result.message || 'Lỗi khi reset', type: 'error' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <SettingsContainer>
      <BackButton onClick={onBack}>← Quay lại</BackButton>
      <Title>⚙️ Cài đặt</Title>

      {message && <Message type={message.type}>{message.text}</Message>}

      {/* Key Bindings Section */}
      <Section>
        <SectionTitle>🎮 Phím điều khiển</SectionTitle>
        {Object.entries(keyBindings).map(([action, key]) => (
          <KeyBindingRow key={action}>
            <KeyLabel>{KEY_NAMES[action as keyof KeyBindings]}</KeyLabel>
            <KeyInput
              type="text"
              value={key as string}
              readOnly
              className={listeningFor === action ? 'listening' : ''}
              onClick={() => startListening(action as keyof KeyBindings)}
              placeholder={listeningFor === action ? 'Nhấn phím...' : (key as string)}
            />
          </KeyBindingRow>
        ))}
      </Section>

      {/* Game Settings Section */}
      <Section>
        <SectionTitle>🎯 Cài đặt game</SectionTitle>
        
        <SettingRow>
          <SettingLabel>DAS Delay (ms):</SettingLabel>
          <NumberInput
            type="number"
            value={settings.das_delay_ms || 133}
            onChange={e => setSettings({ ...settings, das_delay_ms: parseInt(e.target.value) })}
            min={0}
            max={500}
          />
        </SettingRow>

        <SettingRow>
          <SettingLabel>ARR (ms):</SettingLabel>
          <NumberInput
            type="number"
            value={settings.arr_ms || 10}
            onChange={e => setSettings({ ...settings, arr_ms: parseInt(e.target.value) })}
            min={0}
            max={100}
          />
        </SettingRow>

        <SettingRow>
          <SettingLabel>Soft Drop Rate (ms):</SettingLabel>
          <NumberInput
            type="number"
            value={settings.soft_drop_rate || 50}
            onChange={e => setSettings({ ...settings, soft_drop_rate: parseInt(e.target.value) })}
            min={10}
            max={200}
          />
        </SettingRow>

        <SettingRow>
          <SettingLabel>Hiển thị mảnh tiếp theo:</SettingLabel>
          <NumberInput
            type="number"
            value={settings.show_next_pieces || 5}
            onChange={e => setSettings({ ...settings, show_next_pieces: parseInt(e.target.value) })}
            min={1}
            max={7}
          />
        </SettingRow>
      </Section>

      {/* Audio Settings Section */}
      <Section>
        <SectionTitle>🔊 Âm thanh</SectionTitle>
        
        <SettingRow>
          <SettingLabel>Bật âm thanh:</SettingLabel>
          <Checkbox
            type="checkbox"
            checked={settings.sound_enabled ?? true}
            onChange={e => setSettings({ ...settings, sound_enabled: e.target.checked })}
          />
        </SettingRow>

        <SettingRow>
          <SettingLabel>Bật nhạc nền:</SettingLabel>
          <Checkbox
            type="checkbox"
            checked={settings.music_enabled ?? true}
            onChange={e => setSettings({ ...settings, music_enabled: e.target.checked })}
          />
        </SettingRow>

        <SettingRow>
          <SettingLabel>Âm lượng hiệu ứng (0-1):</SettingLabel>
          <NumberInput
            type="number"
            step="0.1"
            value={settings.sound_volume || 0.7}
            onChange={e => setSettings({ ...settings, sound_volume: parseFloat(e.target.value) })}
            min={0}
            max={1}
          />
        </SettingRow>

        <SettingRow>
          <SettingLabel>Âm lượng nhạc (0-1):</SettingLabel>
          <NumberInput
            type="number"
            step="0.1"
            value={settings.music_volume || 0.5}
            onChange={e => setSettings({ ...settings, music_volume: parseFloat(e.target.value) })}
            min={0}
            max={1}
          />
        </SettingRow>
      </Section>

      {/* Action Buttons */}
      <ButtonGroup>
        <Button variant="primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Đang lưu...' : '💾 Lưu'}
        </Button>
        <Button variant="secondary" onClick={loadSettings} disabled={loading}>
          🔄 Tải lại
        </Button>
        <Button variant="danger" onClick={handleReset} disabled={loading}>
          ⚠️ Reset mặc định
        </Button>
      </ButtonGroup>
    </SettingsContainer>
  );
};

export default SettingsPage;
