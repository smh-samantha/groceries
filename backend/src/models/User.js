const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define(
  'User',
  {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: 'users',
    underscored: true,
  },
);

module.exports = User;
