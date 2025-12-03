const { Op } = require('sequelize');
const { z } = require('zod');
const { HOUSEHOLD_CATEGORIES, INGREDIENT_UNITS } = require('../config/constants');
const { sequelize } = require('../config/database');
const { HouseholdGroup, HouseholdItem, HouseholdGroupItem } = require('../models');

const amountSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Quantity must be a number',
      });
      return z.NEVER;
    }
    return numeric;
  });

const itemSchema = z.object({
  name: z.string().min(1),
  amount: amountSchema,
  unit: z.enum(INGREDIENT_UNITS).optional().default('unit'),
  category: z.enum(HOUSEHOLD_CATEGORIES).optional().default('other'),
});

const groupSchema = z.object({
  name: z.string().min(1),
  category: z.enum(HOUSEHOLD_CATEGORIES).optional().default('other'),
  notes: z.string().optional().nullable(),
  includeInGroceryList: z.boolean().optional().default(true),
  items: z.array(itemSchema).min(1),
});

const listGroups = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const where = { userId: req.user.id };

    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const groups = await HouseholdGroup.findAll({
      where,
      order: [['name', 'ASC']],
      include: [
        {
          model: HouseholdItem,
          as: 'items',
          through: { attributes: ['quantityValue', 'quantityUnit'] },
        },
      ],
    });

    return res.json({ items: groups });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Unable to load household items', detail: error.message });
  }
};

const createGroup = async (req, res) => {
  try {
    const payload = groupSchema.parse(req.body);

    const result = await sequelize.transaction(async (transaction) => {
      const group = await HouseholdGroup.create(
        {
          name: payload.name.trim(),
          category: payload.category,
          notes: payload.notes,
          includeInGroceryList: payload.includeInGroceryList,
          userId: req.user.id,
        },
        { transaction },
      );

      for (const item of payload.items) {
        const trimmedName = item.name.trim();
        const desiredCategory = item.category || 'other';

        const [baseItem] = await HouseholdItem.findOrCreate({
          where: { name: trimmedName, userId: req.user.id },
          defaults: { category: desiredCategory, userId: req.user.id },
          transaction,
        });

        if (baseItem.category !== desiredCategory) {
          baseItem.category = desiredCategory;
          await baseItem.save({ transaction });
        }

        await HouseholdGroupItem.create(
          {
            HouseholdGroupId: group.id,
            HouseholdItemId: baseItem.id,
            quantityValue: item.amount,
            quantityUnit: item.unit || 'unit',
          },
          { transaction },
        );
      }

      return group;
    });

    const withItems = await HouseholdGroup.findOne({
      where: { id: result.id, userId: req.user.id },
      include: [
        {
          model: HouseholdItem,
          as: 'items',
          through: { attributes: ['quantityValue', 'quantityUnit'] },
        },
      ],
    });

    return res.status(201).json({ item: withItems });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const parsed = groupSchema.parse(req.body);
    const id = Number(req.params.id);
    const group = await HouseholdGroup.findOne({ where: { id, userId: req.user.id } });
    if (!group) {
      return res.status(404).json({ message: 'Household item not found' });
    }

    await sequelize.transaction(async (transaction) => {
      Object.assign(group, {
        name: parsed.name.trim(),
        category: parsed.category,
        notes: parsed.notes,
        includeInGroceryList: parsed.includeInGroceryList,
      });
      await group.save({ transaction });

      await HouseholdGroupItem.destroy({ where: { HouseholdGroupId: group.id }, transaction });

      for (const item of parsed.items) {
        const trimmedName = item.name.trim();
        const desiredCategory = item.category || 'other';

        const [baseItem] = await HouseholdItem.findOrCreate({
          where: { name: trimmedName, userId: req.user.id },
          defaults: { category: desiredCategory, userId: req.user.id },
          transaction,
        });

        if (baseItem.category !== desiredCategory) {
          baseItem.category = desiredCategory;
          await baseItem.save({ transaction });
        }

        await HouseholdGroupItem.create(
          {
            HouseholdGroupId: group.id,
            HouseholdItemId: baseItem.id,
            quantityValue: item.amount,
            quantityUnit: item.unit || 'unit',
          },
          { transaction },
        );
      }
    });

    const updated = await HouseholdGroup.findOne({
      where: { id: group.id, userId: req.user.id },
      include: [
        {
          model: HouseholdItem,
          as: 'items',
          through: { attributes: ['quantityValue', 'quantityUnit'] },
        },
      ],
    });

    return res.json({ item: updated });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const group = await HouseholdGroup.findOne({ where: { id, userId: req.user.id } });
    if (!group) {
      return res.status(404).json({ message: 'Household item not found' });
    }

    await sequelize.transaction(async (transaction) => {
      await HouseholdGroupItem.destroy({ where: { HouseholdGroupId: group.id }, transaction });
      await group.destroy({ transaction });
    });

    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
};
