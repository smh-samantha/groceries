const { z } = require('zod');
const { Op } = require('sequelize');
const { RotationConfig, RotationEntry, Meal } = require('../models');

const timeframeSchema = z.object({
  timeframeWeeks: z
    .union([z.number().int(), z.enum(['1', '2', '4'])])
    .transform((value) => Number(value)),
});

const entrySchema = z.object({
  mealId: z.union([z.number().int(), z.string()]).transform((value) => Number(value)),
  weekNumber: z
    .union([z.number().int(), z.string()])
    .transform((value) => Number(value))
    .refine((value) => value >= 1 && value <= 4, {
      message: 'Week must be between 1-4',
    }),
  servings: z
    .union([z.number().int(), z.string(), z.null(), z.undefined()])
    .transform((value, ctx) => {
      if (value === null || value === undefined || value === '') return null;
      const numeric = Number(value);
      if (!Number.isInteger(numeric) || numeric < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Servings must be a positive integer',
        });
        return z.NEVER;
      }
      return numeric;
    }),
});

const entryServingsSchema = z.object({
  servings: z.union([z.number().int(), z.string()]).transform((value, ctx) => {
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Servings must be a positive integer',
      });
      return z.NEVER;
    }
    return numeric;
  }),
});

const ensureConfig = async (userId) => {
  const [config] = await RotationConfig.findOrCreate({
    where: { userId },
    defaults: { timeframeWeeks: 1 },
  });
  return config;
};

const getRotation = async (req, res) => {
  try {
    const config = await ensureConfig(req.user.id);
    const entries = await RotationEntry.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Meal,
          as: 'meal',
          where: { userId: req.user.id },
          required: false,
        },
      ],
      order: [['weekNumber', 'ASC'], ['createdAt', 'ASC']],
    });

    return res.json({ config, entries });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load rotation', detail: error.message });
  }
};

const updateConfig = async (req, res) => {
  try {
    const { timeframeWeeks } = timeframeSchema.parse(req.body);
    const config = await ensureConfig(req.user.id);
    config.timeframeWeeks = timeframeWeeks;
    await config.save();

    await RotationEntry.destroy({
      where: {
        userId: req.user.id,
        weekNumber: { [Op.gt]: timeframeWeeks },
      },
    });

    return res.json({ config });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const addEntry = async (req, res) => {
  try {
    const payload = entrySchema.parse(req.body);
    const config = await ensureConfig(req.user.id);

    if (payload.weekNumber > config.timeframeWeeks) {
      return res.status(400).json({ message: 'Week is out of range for current rotation' });
    }

    const meal = await Meal.findOne({
      where: { id: payload.mealId, userId: req.user.id },
    });
    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    const desiredServings = payload.servings || meal.servings || 1;

    const entry = await RotationEntry.create({
      userId: req.user.id,
      weekNumber: payload.weekNumber,
      mealId: payload.mealId,
      servings: desiredServings,
    });

    const withMeal = await RotationEntry.findByPk(entry.id, {
      include: [{ model: Meal, as: 'meal' }],
    });

    return res.status(201).json({ entry: withMeal });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;
    await RotationEntry.destroy({
      where: { id, userId: req.user.id },
    });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateEntryServings = async (req, res) => {
  try {
    const { servings } = entryServingsSchema.parse(req.body);
    const { id } = req.params;

    const entry = await RotationEntry.findOne({
      where: { id, userId: req.user.id },
    });

    if (!entry) {
      return res.status(404).json({ message: 'Rotation entry not found' });
    }

    entry.servings = servings;
    await entry.save();

    const withMeal = await RotationEntry.findByPk(entry.id, {
      include: [{ model: Meal, as: 'meal' }],
    });

    return res.json({ entry: withMeal });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getRotation,
  updateConfig,
  addEntry,
  deleteEntry,
  updateEntryServings,
};
