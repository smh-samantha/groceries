const { Op } = require('sequelize');
const { z } = require('zod');
const { RotationEntry, Meal, Ingredient, HouseholdGroup, HouseholdItem } = require('../models');

const weeksSchema = z
  .object({
    weeks: z
      .string()
      .optional()
      .transform((value) => {
        if (!value) return [1, 2, 3, 4];
        return value
          .split(',')
          .map((wk) => Number(wk.trim()))
          .filter((wk) => wk >= 1 && wk <= 4);
      }),
  })
  .transform((data) => ({
    weeks: data.weeks && data.weeks.length > 0 ? data.weeks : [1, 2, 3, 4],
  }));

const getGroceryList = async (req, res) => {
  try {
    const { weeks } = weeksSchema.parse(req.query);
    const entries = await RotationEntry.findAll({
      where: {
        userId: req.user.id,
        weekNumber: { [Op.in]: weeks },
      },
      include: [
        {
          model: Meal,
          as: 'meal',
          where: { userId: req.user.id },
          required: false,
          include: [
            {
              model: Ingredient,
              as: 'ingredients',
              through: { attributes: ['quantityValue', 'quantityUnit'] },
            },
          ],
        },
      ],
    });

    const aggregated = {};

    entries.forEach((entry) => {
      if (!entry.meal) return;
      const baseServings = entry.meal.servings || 1;
      const scale =
        entry.servings && baseServings ? entry.servings / baseServings : 1;

      entry.meal.ingredients.forEach((ingredient) => {
        const key = ingredient.name.toLowerCase();
        if (!aggregated[key]) {
          aggregated[key] = {
            name: ingredient.name,
            category: ingredient.category,
            units: {},
            meals: new Set(),
            source: 'meal',
          };
        }

        aggregated[key].meals.add(entry.meal.name);
        const qtyValue = ingredient.MealIngredient?.quantityValue;
        const qtyUnit = ingredient.MealIngredient?.quantityUnit || 'unit';
        if (qtyValue !== null && qtyValue !== undefined) {
          const scaledValue = qtyValue * scale;
          aggregated[key].units[qtyUnit] =
            (aggregated[key].units[qtyUnit] || 0) + scaledValue;
        } else {
          aggregated[key].units[qtyUnit] =
            aggregated[key].units[qtyUnit] || null;
        }
      });
    });

    const householdGroups = await HouseholdGroup.findAll({
      where: { userId: req.user.id, includeInGroceryList: true },
      include: [
        {
          model: HouseholdItem,
          as: 'items',
          through: { attributes: ['quantityValue', 'quantityUnit'] },
        },
      ],
    });

    householdGroups.forEach((group) => {
      group.items.forEach((item) => {
        const key = `household:${item.name.toLowerCase()}`;
        if (!aggregated[key]) {
          aggregated[key] = {
            name: item.name,
            category: item.category,
            units: {},
            meals: new Set(),
            source: 'household',
          };
        }
        aggregated[key].meals.add(group.name);
        const qtyValue = item.HouseholdGroupItem?.quantityValue;
        const qtyUnit = item.HouseholdGroupItem?.quantityUnit || 'unit';
        if (qtyValue !== null && qtyValue !== undefined) {
          aggregated[key].units[qtyUnit] =
            (aggregated[key].units[qtyUnit] || 0) + qtyValue;
        } else {
          aggregated[key].units[qtyUnit] = aggregated[key].units[qtyUnit] || null;
        }
      });
    });

    const groupedByCategory = {};

    Object.values(aggregated).forEach((item) => {
      if (!groupedByCategory[item.category]) {
        groupedByCategory[item.category] = [];
      }

      const combinedQuantityEntries = Object.entries(item.units);
      const combinedQuantity =
        combinedQuantityEntries.length > 0
          ? combinedQuantityEntries
              .map(([unit, value]) => {
                if (value === null || value === undefined) {
                  return unit === 'unit' ? 'as needed' : `as needed ${unit}`;
                }
                const formatted =
                  Number.isInteger(value) ? value : Number(value.toFixed(2));
                return unit === 'unit' ? `${formatted}` : `${formatted} ${unit}`;
              })
              .join(' + ')
          : 'as needed';

      groupedByCategory[item.category].push({
        name: item.name,
        combinedQuantity,
        meals: Array.from(item.meals),
        totals: item.units,
        source: item.source,
      });
    });

    Object.values(groupedByCategory).forEach((items) =>
      items.sort((a, b) => a.name.localeCompare(b.name)),
    );

    return res.json({ weeks, items: groupedByCategory });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = { getGroceryList };
