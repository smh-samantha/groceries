const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RotationConfig = sequelize.define(
  'RotationConfig',
  {
    timeframeWeeks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        isIn: [[1, 2, 4]],
      },
    },
  },
  {
    tableName: 'rotation_configs',
    underscored: true,
  },
);

module.exports = RotationConfig;
