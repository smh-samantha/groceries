const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { INGREDIENT_UNITS } = require('../config/constants');

const MealIngredient = sequelize.define(
  'MealIngredient',
  {
    quantityValue: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    quantityUnit: {
      type: DataTypes.ENUM(...INGREDIENT_UNITS),
      allowNull: true,
    },
  },
  {
    tableName: 'meal_ingredients',
    underscored: true,
  },
);

module.exports = MealIngredient;
