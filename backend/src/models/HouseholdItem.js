const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { HOUSEHOLD_CATEGORIES } = require('../config/constants');

const HouseholdItem = sequelize.define(
  'HouseholdItem',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'household_name_user',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'household_name_user',
    },
    category: {
      type: DataTypes.ENUM(...HOUSEHOLD_CATEGORIES),
      allowNull: false,
      defaultValue: 'other',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'household_items',
    underscored: true,
  },
);

module.exports = HouseholdItem;
