const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Share = sequelize.define(
  'Share',
  {
    fromUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    toUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('meal', 'household'),
      allowNull: false,
    },
    mealId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    householdGroupId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted'),
      allowNull: false,
      defaultValue: 'pending',
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'shares',
    underscored: true,
  },
);

module.exports = Share;
