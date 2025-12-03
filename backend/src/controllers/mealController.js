const { Op } = require('sequelize');
const { z } = require('zod');
const { sequelize } = require('../config/database');
const {
  MEAL_PREFERENCES,
  INGREDIENT_CATEGORIES,
  INGREDIENT_UNITS,
} = require('../config/constants');
const { Meal, Ingredient, MealIngredient, RotationEntry } = require('../models');

const servingsSchema = z.union([z.number(), z.string()]).transform((value, ctx) => {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Servings must be a positive integer',
    });
    return z.NEVER;
  }
  return numeric;
});

const amountSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ingredient amount must be a number',
      });
      return z.NEVER;
    }
    return numeric;
  });

const ingredientSchema = z.object({
  name: z.string().min(1),
  amount: amountSchema,
  unit: z.enum(INGREDIENT_UNITS).optional().default('unit'),
  category: z.enum(INGREDIENT_CATEGORIES).optional().default('other'),
});

const imageSchema = z
  .union([
    z.string().url(),
    z
      .string()
      .regex(/^data:/)
      .refine((value) => value.length < 1_000_000, 'Embedded images must be under 1MB'),
    z.literal(''),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => {
    if (!value || value === '') return null;
    return value;
  });

const preferenceSchema = z
  .array(z.enum(MEAL_PREFERENCES))
  .min(1)
  .transform((prefs) => Array.from(new Set(prefs)));

const urlOrEmptySchema = z
  .union([z.string().url(), z.literal(''), z.null(), z.undefined()])
  .transform((value) => {
    if (!value) return null;
    return value;
  });

const attachmentItemSchema = z
  .string()
  .regex(/^data:/)
  .refine((value) => value.length < 2_000_000, 'Attachments must be under 2MB');

const attachmentSchema = z
  .union([
    z.array(attachmentItemSchema),
    attachmentItemSchema,
    z.literal(''),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => {
    if (!value || value === '') return [];
    if (Array.isArray(value)) return value;
    return [value];
  });

const createMealSchema = z.object({
  name: z.string().min(1),
  servings: servingsSchema,
  imageUrl: imageSchema,
  recipeLink: urlOrEmptySchema.optional(),
  recipeAttachment: attachmentSchema.optional(),
  preference: preferenceSchema,
  notes: z.string().optional().nullable(),
  ingredients: z.array(ingredientSchema).min(1),
});

const updateMealSchema = createMealSchema.extend({
  id: z.number().int(),
});

const listMeals = async (req, res) => {
  try {
    const { search = '', preference } = req.query;
    const where = { userId: req.user.id };

    if (preference && MEAL_PREFERENCES.includes(preference)) {
      where.preference = { [Op.contains]: [preference] };
    }

    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const meals = await Meal.findAll({
      where,
      order: [['name', 'ASC']],
      include: [
        {
          model: Ingredient,
          as: 'ingredients',
          through: { attributes: ['quantityValue', 'quantityUnit'] },
        },
      ],
    });

    return res.json({ meals });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load meals', detail: error.message });
  }
};

const createMeal = async (req, res) => {
  try {
    const payload = createMealSchema.parse(req.body);

    const result = await sequelize.transaction(async (transaction) => {
      const meal = await Meal.create(
        {
          name: payload.name.trim(),
          servings: payload.servings,
          preference: payload.preference,
          recipeLink: payload.recipeLink,
          recipeAttachment: payload.recipeAttachment,
          notes: payload.notes,
          imageUrl: payload.imageUrl,
          userId: req.user.id,
        },
        { transaction },
      );

      for (const item of payload.ingredients) {
        const trimmedName = item.name.trim();
        const desiredCategory = item.category || 'other';

        const [ingredient, created] = await Ingredient.findOrCreate({
          where: { name: trimmedName, userId: req.user.id },
          defaults: { category: desiredCategory, userId: req.user.id },
          transaction,
        });

        if (!created && ingredient.category !== desiredCategory) {
          ingredient.category = desiredCategory;
          await ingredient.save({ transaction });
        }

        await MealIngredient.create(
          {
            MealId: meal.id,
            IngredientId: ingredient.id,
            quantityValue: item.amount,
            quantityUnit: item.unit || 'unit',
          },
          { transaction },
        );
      }

      return meal;
    });

    const withIngredients = await Meal.findOne({
      where: { id: result.id, userId: req.user.id },
      include: [
        {
          model: Ingredient,
          as: 'ingredients',
          through: { attributes: ['quantityValue', 'quantityUnit'] },
        },
      ],
    });

    return res.status(201).json({ meal: withIngredients });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = { listMeals, createMeal };

const updateMeal = async (req, res) => {
  try {
    const parsed = updateMealSchema.parse({ ...req.body, id: Number(req.params.id) });
    const meal = await Meal.findOne({ where: { id: parsed.id, userId: req.user.id } });
    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    await sequelize.transaction(async (transaction) => {
      Object.assign(meal, {
        name: parsed.name.trim(),
        servings: parsed.servings,
        preference: parsed.preference,
        recipeLink: parsed.recipeLink,
        recipeAttachment: parsed.recipeAttachment,
        notes: parsed.notes,
        imageUrl: parsed.imageUrl,
      });
      await meal.save({ transaction });

      await MealIngredient.destroy({ where: { MealId: meal.id }, transaction });

      for (const item of parsed.ingredients) {
        const trimmedName = item.name.trim();
        const desiredCategory = item.category || 'other';

        const [ingredient, created] = await Ingredient.findOrCreate({
          where: { name: trimmedName, userId: req.user.id },
          defaults: { category: desiredCategory, userId: req.user.id },
          transaction,
        });

        if (!created && ingredient.category !== desiredCategory) {
          ingredient.category = desiredCategory;
          await ingredient.save({ transaction });
        }

        await MealIngredient.create(
          {
            MealId: meal.id,
            IngredientId: ingredient.id,
            quantityValue: item.amount,
            quantityUnit: item.unit || 'unit',
          },
          { transaction },
        );
      }
    });

    const updated = await Meal.findOne({
      where: { id: meal.id, userId: req.user.id },
      include: [
        {
          model: Ingredient,
          as: 'ingredients',
          through: { attributes: ['quantityValue', 'quantityUnit'] },
        },
      ],
    });

    return res.json({ meal: updated });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const deleteMeal = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const meal = await Meal.findOne({ where: { id, userId: req.user.id } });
    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    await sequelize.transaction(async (transaction) => {
      await MealIngredient.destroy({ where: { MealId: meal.id }, transaction });
      await RotationEntry.destroy({ where: { mealId: meal.id, userId: req.user.id }, transaction });
      await meal.destroy({ transaction });
    });

    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = { listMeals, createMeal, updateMeal, deleteMeal };
