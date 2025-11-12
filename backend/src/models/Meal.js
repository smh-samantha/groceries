const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { MEAL_PREFERENCES } = require('../config/constants');

const Meal = sequelize.define(
  'Meal',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'meal_name_user',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'meal_name_user',
    },
    servings: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    preference: {
      type: DataTypes.ENUM(...MEAL_PREFERENCES),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'meals',
    underscored: true,
  },
);

module.exports = Meal;
