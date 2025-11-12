const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RotationEntry = sequelize.define(
  'RotationEntry',
  {
    weekNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    servings: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: 'rotation_entries',
    underscored: true,
  },
);

module.exports = RotationEntry;
