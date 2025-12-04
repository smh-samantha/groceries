const User = require('./User');
const Meal = require('./Meal');
const Ingredient = require('./Ingredient');
const MealIngredient = require('./MealIngredient');
const RotationConfig = require('./RotationConfig');
const RotationEntry = require('./RotationEntry');
const HouseholdItem = require('./HouseholdItem');
const HouseholdGroup = require('./HouseholdGroup');
const HouseholdGroupItem = require('./HouseholdGroupItem');
const GroceryCheck = require('./GroceryCheck');
const Friend = require('./Friend');
const Share = require('./Share');

// User relationships
User.hasOne(RotationConfig, { foreignKey: 'userId', as: 'rotationConfig' });
RotationConfig.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(RotationEntry, { foreignKey: 'userId', as: 'rotationEntries' });
RotationEntry.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Meal, { foreignKey: 'userId', as: 'meals' });
Meal.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

User.hasMany(Ingredient, { foreignKey: 'userId', as: 'ingredients' });
Ingredient.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

User.hasMany(HouseholdItem, { foreignKey: 'userId', as: 'householdItems' });
HouseholdItem.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

User.hasMany(HouseholdGroup, { foreignKey: 'userId', as: 'householdGroups' });
HouseholdGroup.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

User.hasMany(GroceryCheck, { foreignKey: 'userId', as: 'groceryChecks' });
GroceryCheck.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

User.belongsToMany(User, {
  through: Friend,
  as: 'friends',
  foreignKey: 'userId',
  otherKey: 'friendUserId',
});
Friend.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Friend.belongsTo(User, { foreignKey: 'friendUserId', as: 'friend' });

User.hasMany(Share, { foreignKey: 'fromUserId', as: 'sentShares' });
User.hasMany(Share, { foreignKey: 'toUserId', as: 'receivedShares' });
Share.belongsTo(User, { foreignKey: 'fromUserId', as: 'fromUser' });
Share.belongsTo(User, { foreignKey: 'toUserId', as: 'toUser' });
Share.belongsTo(Meal, { foreignKey: 'mealId', as: 'meal' });
Share.belongsTo(HouseholdGroup, { foreignKey: 'householdGroupId', as: 'householdGroup' });

HouseholdGroup.belongsToMany(HouseholdItem, {
  through: HouseholdGroupItem,
  as: 'items',
});
HouseholdItem.belongsToMany(HouseholdGroup, {
  through: HouseholdGroupItem,
  as: 'groups',
});
HouseholdGroupItem.belongsTo(HouseholdGroup);
HouseholdGroupItem.belongsTo(HouseholdItem);

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
  HouseholdItem,
  HouseholdGroup,
  HouseholdGroupItem,
  GroceryCheck,
  Friend,
  Share,
};
