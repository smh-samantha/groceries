const User = require('./User');
const Meal = require('./Meal');
const Ingredient = require('./Ingredient');
const MealIngredient = require('./MealIngredient');
const RotationConfig = require('./RotationConfig');
const RotationEntry = require('./RotationEntry');

// User relationships
User.hasOne(RotationConfig, { foreignKey: 'userId', as: 'rotationConfig' });
RotationConfig.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(RotationEntry, { foreignKey: 'userId', as: 'rotationEntries' });
RotationEntry.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Meal, { foreignKey: 'userId', as: 'meals' });
Meal.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

User.hasMany(Ingredient, { foreignKey: 'userId', as: 'ingredients' });
Ingredient.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

// Meal <-> Ingredient (many to many)
Meal.belongsToMany(Ingredient, {
  through: MealIngredient,
  as: 'ingredients',
});
Ingredient.belongsToMany(Meal, {
  through: MealIngredient,
  as: 'meals',
});
MealIngredient.belongsTo(Meal);
MealIngredient.belongsTo(Ingredient);

RotationEntry.belongsTo(Meal, { foreignKey: 'mealId', as: 'meal' });
Meal.hasMany(RotationEntry, { foreignKey: 'mealId', as: 'rotationEntries' });

module.exports = {
  User,
  Meal,
  Ingredient,
  MealIngredient,
  RotationConfig,
  RotationEntry,
};
