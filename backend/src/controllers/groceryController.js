const { Op } = require('sequelize');
const { z } = require('zod');
const {
  RotationEntry,
  Meal,
  Ingredient,
  HouseholdGroup,
  HouseholdItem,
  GroceryCheck,
} = require('../models');

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

const checkSchema = z.object({
  itemKey: z.string().trim().min(1),
  checked: z.boolean(),
});

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
        const normalizedName = ingredient.name?.trim() || '';
        const key = normalizedName.toLowerCase();
        if (!aggregated[key]) {
          aggregated[key] = {
            itemKey: key,
            name: normalizedName,
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
        const normalizedName = item.name?.trim() || '';
        const key = `household:${normalizedName.toLowerCase()}`;
        if (!aggregated[key]) {
          aggregated[key] = {
            itemKey: key,
            name: normalizedName,
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

    const checkedRows =
      Object.keys(aggregated).length > 0
        ? await GroceryCheck.findAll({
            where: { userId: req.user.id, itemKey: { [Op.in]: Object.keys(aggregated) } },
          })
        : [];
    const checkedSet = new Set(
      checkedRows.filter((row) => row.checked).map((row) => row.itemKey),
    );

    const formatUnitLabel = (unit) => (unit === 'with_love' ? 'with love' : unit);

    Object.values(aggregated).forEach((item) => {
      if (!groupedByCategory[item.category]) {
        groupedByCategory[item.category] = [];
      }

      const combinedQuantityEntries = Object.entries(item.units);
      const combinedQuantity =
        combinedQuantityEntries.length > 0
          ? combinedQuantityEntries
              .map(([unit, value]) => {
                const label = formatUnitLabel(unit);
                if (value === null || value === undefined) {
                  return unit === 'unit' ? 'as needed' : `as needed ${label}`;
                }
                const formatted =
                  Number.isInteger(value) ? value : Number(value.toFixed(2));
                return unit === 'unit' ? `${formatted}` : `${formatted} ${label}`;
              })
              .join(' + ')
          : 'as needed';

      groupedByCategory[item.category].push({
        itemKey: item.itemKey,
        checked: checkedSet.has(item.itemKey),
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

const saveGroceryCheck = async (req, res) => {
  try {
    const { itemKey, checked } = checkSchema.parse(req.body);
    const normalizedKey = itemKey.toLowerCase();

    if (checked) {
      await GroceryCheck.upsert({
        userId: req.user.id,
        itemKey: normalizedKey,
        checked: true,
      });
    } else {
      await GroceryCheck.destroy({ where: { userId: req.user.id, itemKey: normalizedKey } });
    }

    return res.json({ itemKey: normalizedKey, checked });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const clearGroceryChecks = async (req, res) => {
  try {
    await GroceryCheck.destroy({ where: { userId: req.user.id } });
    return res.json({ cleared: true });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = { getGroceryList, saveGroceryCheck, clearGroceryChecks };
