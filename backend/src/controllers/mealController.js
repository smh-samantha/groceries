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
      .refine((value) => value.length < 5_000_000, 'Embedded images must be under 5MB'),
    z.literal(''),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => {
    if (!value || value === '') return null;
    return value;
  });

const preferenceSchema = z
  .any()
  .transform((value) => {
    const collected = [];
    const flatten = (v) => {
      if (Array.isArray(v)) {
        v.forEach(flatten);
      } else if (v !== null && v !== undefined && v !== '') {
        collected.push(String(v));
      }
    };
    flatten(value || []);
    return Array.from(new Set(collected.map((v) => v.trim().toLowerCase()).filter(Boolean)));
  })
  .refine(
    (prefs) => prefs.every((p) => MEAL_PREFERENCES.includes(p)),
    `Invalid option: expected one of ${MEAL_PREFERENCES.join('|')}`,
  )
  .optional()
  .default([]);

const urlOrEmptySchema = z
  .union([z.string().url(), z.literal(''), z.null(), z.undefined()])
  .transform((value) => {
    if (!value) return null;
    return value;
  });

const attachmentItemSchema = z.union([
  z
    .object({
      name: z.string().optional(),
      data: z
        .string()
        .regex(/^data:/)
        .refine((val) => val.length < 5_000_000, 'Attachments must be under 5MB'),
    })
    .transform((item) => ({ name: item.name?.trim() || '', data: item.data })),
  z
    .string()
    .regex(/^data:/)
    .refine((value) => value.length < 5_000_000, 'Attachments must be under 5MB')
    .transform((value) => ({ name: '', data: value })),
]);

const attachmentSchema = z
  .union([z.array(attachmentItemSchema), attachmentItemSchema, z.literal(''), z.null(), z.undefined()])
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

    const serialized = meals.map((meal) => serializeMeal(meal));
    return res.json({ meals: serialized });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load meals', detail: error.message });
  }
};

const parseAttachmentsForResponse = (attachments) =>
  (attachments || []).map((raw, index) => {
    if (!raw) return null;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed?.data) {
        return { name: parsed.name || `Attachment ${index + 1}`, data: parsed.data };
      }
    } catch (e) {
      /* ignore */
    }
    if (typeof raw === 'string') {
      return { name: `Attachment ${index + 1}`, data: raw };
    }
    return null;
  }).filter(Boolean);

const serializeMeal = (meal) => {
  const json = meal.toJSON ? meal.toJSON() : meal;
  return {
    ...json,
    recipeAttachment: parseAttachmentsForResponse(json.recipeAttachment),
  };
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
          recipeAttachment: payload.recipeAttachment.map((item) =>
            JSON.stringify({ name: item.name, data: item.data }),
          ),
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

    const serialized = serializeMeal(withIngredients);
    return res.status(201).json({ meal: serialized });
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
        recipeAttachment: parsed.recipeAttachment.map((item) =>
          JSON.stringify({ name: item.name, data: item.data }),
        ),
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

    const serialized = serializeMeal(updated);
    return res.json({ meal: serialized });
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
