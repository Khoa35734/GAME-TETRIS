import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../postgres';

export enum FriendshipStatus {
  REQUESTED = 'requested',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
  REMOVED = 'removed',
}

export interface FriendshipAttributes {
  user_id: number;
  friend_id: number;
  status: FriendshipStatus;
  requested_at: Date;
  accepted_at?: Date;
}

class Friendship extends Model<FriendshipAttributes> implements FriendshipAttributes {
  public user_id!: number;
  public friend_id!: number;
  public status!: FriendshipStatus;
  public requested_at!: Date;
  public accepted_at?: Date;
}

Friendship.init(
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
    friend_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    status: {
      type: DataTypes.ENUM('requested', 'accepted', 'blocked', 'removed'),
      allowNull: false,
      defaultValue: 'requested',
    },
    requested_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    accepted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'friendships',
    timestamps: false,
  }
);

// Setup associations (will be called after all models are loaded)
export function setupFriendshipAssociations() {
  const User = require('./User').User;
  
  Friendship.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'requester',
  });
  
  Friendship.belongsTo(User, {
    foreignKey: 'friend_id',
    as: 'friend',
  });
}

export default Friendship;
