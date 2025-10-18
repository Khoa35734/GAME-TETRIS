import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../stores/postgres';

export interface UserSettingsAttributes {
  user_id: number;
  das_delay_ms?: number;
  arr_ms?: number;
  soft_drop_rate?: number;
  show_next_pieces?: number;
  sound_enabled?: boolean;
  music_enabled?: boolean;
  sound_volume?: number;
  music_volume?: number;
  key_bindings?: Record<string, string>; // JSON object
  theme_preference?: string;
  language_pref?: string;
}

class UserSettings extends Model<UserSettingsAttributes> implements UserSettingsAttributes {
  public user_id!: number;
  public das_delay_ms?: number;
  public arr_ms?: number;
  public soft_drop_rate?: number;
  public show_next_pieces?: number;
  public sound_enabled?: boolean;
  public music_enabled?: boolean;
  public sound_volume?: number;
  public music_volume?: number;
  public key_bindings?: Record<string, string>;
  public theme_preference?: string;
  public language_pref?: string;
}

UserSettings.init(
  {
    user_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    das_delay_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 133,
      comment: 'Delayed Auto Shift delay in milliseconds',
    },
    arr_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 10,
      comment: 'Auto Repeat Rate in milliseconds',
    },
    soft_drop_rate: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 50,
      comment: 'Soft drop speed in milliseconds',
    },
    show_next_pieces: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 5,
      comment: 'Number of next pieces to show',
    },
    sound_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    music_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    sound_volume: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.70,
      validate: {
        min: 0.0,
        max: 1.0,
      },
    },
    music_volume: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.50,
      validate: {
        min: 0.0,
        max: 1.0,
      },
    },
    key_bindings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        moveLeft: 'ArrowLeft',
        moveRight: 'ArrowRight',
        softDrop: 'ArrowDown',
        hardDrop: 'Space',
        rotateClockwise: 'ArrowUp',
        rotateCounterClockwise: 'z',
        rotate180: 'a',
        hold: 'c',
        restart: 'r',
      },
      comment: 'Custom key bindings for game controls',
    },
    theme_preference: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'default',
    },
    language_pref: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'vi',
    },
  },
  {
    sequelize,
    tableName: 'users_settings',
    timestamps: false,
  }
);

export default UserSettings;
