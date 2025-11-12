require('dotenv').config();
const { sequelize } = require('./config/database');
const { User, Meal, Ingredient, MealIngredient } = require('./models');
const { ALLOWED_USERNAMES } = require('./config/constants');

const SAMPLE_MEALS = [
  {
    name: 'Avocado Toast',
    preference: 'breakfast',
    servings: 2,
    notes: 'Whole grain toast with smashed avo and eggs.',
    ingredients: [
      { name: 'Avocado', amount: 2, unit: 'unit', category: 'produce' },
      { name: 'Eggs', amount: 4, unit: 'unit', category: 'dairy' },
      { name: 'Sourdough Bread', amount: 4, unit: 'unit', category: 'bakery' },
      { name: 'Cherry Tomatoes', amount: 1, unit: 'cup', category: 'produce' },
    ],
  },
  {
    name: 'Lemon Herb Chicken',
    preference: 'dinner',
    servings: 4,
    notes: 'Sheet pan chicken with seasonal veg.',
    ingredients: [
      { name: 'Chicken Thighs', amount: 1, unit: 'kg', category: 'meats' },
      { name: 'Lemon', amount: 2, unit: 'unit', category: 'produce' },
      { name: 'Green Beans', amount: 400, unit: 'g', category: 'produce' },
      { name: 'Olive Oil', amount: 2, unit: 'tbsp', category: 'pantry' },
    ],
  },
  {
    name: 'Mediterranean Grain Bowl',
    preference: 'lunch',
    servings: 3,
    ingredients: [
      { name: 'Quinoa', amount: 2, unit: 'cup', category: 'pantry' },
      { name: 'Cucumber', amount: 1, unit: 'unit', category: 'produce' },
      { name: 'Cherry Tomatoes', amount: 1, unit: 'cup', category: 'produce' },
      { name: 'Feta Cheese', amount: 0.5, unit: 'cup', category: 'dairy' },
      { name: 'Chickpeas', amount: 1, unit: 'unit', category: 'pantry' },
    ],
  },
];

const seed = async () => {
  try {
    await sequelize.sync({ force: true });

    const users = await Promise.all(
      ALLOWED_USERNAMES.map((username) =>
        User.create({ username }),
      ),
    );

    for (const user of users) {
      for (const meal of SAMPLE_MEALS) {
        const createdMeal = await Meal.create({
          name: meal.name,
          preference: meal.preference,
          notes: meal.notes,
          servings: meal.servings || 2,
          userId: user.id,
        });

        for (const item of meal.ingredients) {
          const [ingredient] = await Ingredient.findOrCreate({
            where: { name: item.name, userId: user.id },
            defaults: { category: item.category, userId: user.id },
          });

          await MealIngredient.create({
            MealId: createdMeal.id,
            IngredientId: ingredient.id,
            quantityValue: item.amount,
            quantityUnit: item.unit || 'unit',
          });
        }
      }
    }

    console.log('Database seeded.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seed();
