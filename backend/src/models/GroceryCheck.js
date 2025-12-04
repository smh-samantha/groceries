const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GroceryCheck = sequelize.define(
  'GroceryCheck',
  {
    itemKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'user_item_check',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'user_item_check',
    },
    checked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'grocery_checks',
    underscored: true,
  },
);

module.exports = GroceryCheck;
