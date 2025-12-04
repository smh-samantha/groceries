const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { HOUSEHOLD_CATEGORIES } = require('../config/constants');

const HouseholdGroup = sequelize.define(
  'HouseholdGroup',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'household_group_user',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'household_group_user',
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
    includeInGroceryList: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'household_groups',
    underscored: true,
  },
);

module.exports = HouseholdGroup;
