const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { INGREDIENT_UNITS } = require('../config/constants');

const HouseholdGroupItem = sequelize.define(
  'HouseholdGroupItem',
  {
    quantityValue: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    quantityUnit: {
      type: DataTypes.ENUM(...INGREDIENT_UNITS),
      allowNull: false,
      defaultValue: 'unit',
    },
  },
  {
    tableName: 'household_group_items',
    underscored: true,
  },
);

module.exports = HouseholdGroupItem;
