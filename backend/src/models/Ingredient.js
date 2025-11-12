const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { INGREDIENT_CATEGORIES } = require('../config/constants');

const Ingredient = sequelize.define(
  'Ingredient',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'ingredient_name_user',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'ingredient_name_user',
    },
    category: {
      type: DataTypes.ENUM(...INGREDIENT_CATEGORIES),
      allowNull: false,
      defaultValue: 'other',
    },
  },
  {
    tableName: 'ingredients',
    underscored: true,
  },
);

module.exports = Ingredient;
