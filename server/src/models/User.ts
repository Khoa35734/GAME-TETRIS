import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../stores/postgres';

export interface UserAttributes {
  user_id: number;
  user_name: string;
  email: string;
  password: string;
  country_code?: string;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  is_active: boolean;
  is_banned: boolean;
  is_verified: boolean;
  role: string;
}

export class User extends Model<UserAttributes> implements UserAttributes {
  public user_id!: number;
  public user_name!: string;
  public email!: string;
  public password!: string;
  public country_code?: string;
  public created_at!: Date;
  public updated_at!: Date;
  public last_login?: Date;
  public is_active!: boolean;
  public is_banned!: boolean;
  public is_verified!: boolean;
  public role!: string;
}

User.init(
  {
    user_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    user_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    country_code: {
      type: DataTypes.CHAR(2),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_banned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'player',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default User;