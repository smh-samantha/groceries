const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Friend = sequelize.define(
  'Friend',
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'user_friend_unique',
    },
    friendUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'user_friend_unique',
    },
    status: {
      type: DataTypes.ENUM('accepted'),
      allowNull: false,
      defaultValue: 'accepted',
    },
  },
  {
    tableName: 'friends',
    underscored: true,
  },
);

module.exports = Friend;
