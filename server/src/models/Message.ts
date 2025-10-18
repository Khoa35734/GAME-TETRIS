// Message Model - Hộp thư của người chơi
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../postgres';

interface MessageAttributes {
  message_id: number;
  recipient_id: number;
  sender_id: number | null;
  message_type: 'system' | 'admin_reply' | 'friend_request' | 'game_invite' | 'broadcast' | 'player_message';
  subject: string;
  content: string;
  is_read: boolean;
  is_starred: boolean;
  is_deleted: boolean;
  metadata?: Record<string, any>;
  created_at: Date;
  read_at?: Date;
  deleted_at?: Date;
}

interface MessageCreationAttributes extends Optional<MessageAttributes, 'message_id' | 'sender_id' | 'is_read' | 'is_starred' | 'is_deleted' | 'metadata' | 'created_at' | 'read_at' | 'deleted_at'> {}

class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public message_id!: number;
  public recipient_id!: number;
  public sender_id!: number | null;
  public message_type!: 'system' | 'admin_reply' | 'friend_request' | 'game_invite' | 'broadcast' | 'player_message';
  public subject!: string;
  public content!: string;
  public is_read!: boolean;
  public is_starred!: boolean;
  public is_deleted!: boolean;
  public metadata?: Record<string, any>;
  public created_at!: Date;
  public read_at?: Date;
  public deleted_at?: Date;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Message.init(
  {
    message_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    recipient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'CASCADE',
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'SET NULL',
    },
    message_type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'system',
      validate: {
        isIn: [['system', 'admin_reply', 'friend_request', 'game_invite', 'broadcast', 'player_message']],
      },
    },
    subject: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_starred: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'messages',
    timestamps: false, // We're using custom timestamp fields
  }
);

export default Message;
