const { Op } = require('sequelize');
const { z } = require('zod');
const { ALLOWED_USERNAMES } = require('../config/constants');
const {
  User,
  Friend,
  Share,
  Meal,
  Ingredient,
  MealIngredient,
  HouseholdGroup,
  HouseholdItem,
  HouseholdGroupItem,
} = require('../models');
const { sequelize } = require('../config/database');

const usernameSchema = z.object({
  username: z.string().trim().min(1),
});

const shareSchema = z.object({
  username: z.string().trim().min(1),
  type: z.enum(['meal', 'household']),
  id: z.number().int(),
});

const ensureFriendUser = async (username) => {
  const normalized = username.toLowerCase();
  if (!ALLOWED_USERNAMES.includes(normalized)) {
    throw new Error('User not permitted');
  }
  const [user] = await User.findOrCreate({
    where: { username: normalized },
    defaults: {},
  });
  return user;
};

const listFriends = async (req, res) => {
  try {
    const friends = await Friend.findAll({
      where: { userId: req.user.id, status: 'accepted' },
      include: [{ model: User, as: 'friend', attributes: ['id', 'username'] }],
    });
    return res.json({
      friends: friends.map((row) => ({
        id: row.friend.id,
        username: row.friend.username,
      })),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const addFriend = async (req, res) => {
  try {
    const { username } = usernameSchema.parse(req.body);
    const friendUser = await ensureFriendUser(username);
    if (friendUser.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot add yourself' });
    }

    await Friend.findOrCreate({
      where: { userId: req.user.id, friendUserId: friendUser.id },
      defaults: { status: 'accepted' },
    });
    await Friend.findOrCreate({
      where: { userId: friendUser.id, friendUserId: req.user.id },
      defaults: { status: 'accepted' },
    });

    return res.json({ friend: { id: friendUser.id, username: friendUser.username } });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const cloneMealForUser = async (meal, targetUserId, transaction) => {
  const newMeal = await Meal.create(
    {
      name: meal.name,
      servings: meal.servings,
      preference: meal.preference,
      notes: meal.notes,
      imageUrl: meal.imageUrl,
      recipeLink: meal.recipeLink,
      recipeAttachment: meal.recipeAttachment,
      userId: targetUserId,
    },
    { transaction },
  );

  const ingredients = await meal.getIngredients({ joinTableAttributes: ['quantityValue', 'quantityUnit'] });

  for (const ingredient of ingredients) {
    const [userIngredient] = await Ingredient.findOrCreate({
      where: { name: ingredient.name, userId: targetUserId },
      defaults: { category: ingredient.category || 'other', userId: targetUserId },
      transaction,
    });
    if (ingredient.category && userIngredient.category !== ingredient.category) {
      userIngredient.category = ingredient.category;
      await userIngredient.save({ transaction });
    }

    await MealIngredient.create(
      {
        MealId: newMeal.id,
        IngredientId: userIngredient.id,
        quantityValue: ingredient.MealIngredient?.quantityValue ?? null,
        quantityUnit: ingredient.MealIngredient?.quantityUnit || 'unit',
      },
      { transaction },
    );
  }

  return newMeal;
};

const cloneHouseholdGroupForUser = async (group, targetUserId, transaction) => {
  const newGroup = await HouseholdGroup.create(
    {
      name: group.name,
      category: group.category,
      notes: group.notes,
      includeInGroceryList: group.includeInGroceryList ?? true,
      userId: targetUserId,
    },
    { transaction },
  );

  const items = await group.getItems({ joinTableAttributes: ['quantityValue', 'quantityUnit'] });

  for (const item of items) {
    const [userItem] = await HouseholdItem.findOrCreate({
      where: { name: item.name, userId: targetUserId },
      defaults: { category: item.category || 'other', userId: targetUserId },
      transaction,
    });
    if (item.category && userItem.category !== item.category) {
      userItem.category = item.category;
      await userItem.save({ transaction });
    }

    await HouseholdGroupItem.create(
      {
        HouseholdGroupId: newGroup.id,
        HouseholdItemId: userItem.id,
        quantityValue: item.HouseholdGroupItem?.quantityValue ?? null,
        quantityUnit: item.HouseholdGroupItem?.quantityUnit || 'unit',
      },
      { transaction },
    );
  }

  return newGroup;
};

const listShares = async (req, res) => {
  try {
    const incoming = await Share.findAll({
      where: { toUserId: req.user.id },
      include: [
        { model: User, as: 'fromUser', attributes: ['username'] },
        { model: Meal, as: 'meal' },
        { model: HouseholdGroup, as: 'householdGroup' },
      ],
      order: [['created_at', 'DESC']],
    });
    const outgoing = await Share.findAll({
      where: { fromUserId: req.user.id },
      include: [
        { model: User, as: 'toUser', attributes: ['username'] },
        { model: Meal, as: 'meal' },
        { model: HouseholdGroup, as: 'householdGroup' },
      ],
      order: [['created_at', 'DESC']],
    });

    const serializeShare = (share, direction = 'in') => ({
      id: share.id,
      type: share.type,
      status: share.status,
      from: direction === 'in' ? share.fromUser?.username : req.user.username,
      to: direction === 'out' ? share.toUser?.username : req.user.username,
      meal: share.meal
        ? { id: share.meal.id, name: share.meal.name, servings: share.meal.servings }
        : null,
      householdGroup: share.householdGroup
        ? { id: share.householdGroup.id, name: share.householdGroup.name }
        : null,
      createdAt: share.createdAt,
    });

    return res.json({
      incoming: incoming.map((s) => serializeShare(s, 'in')),
      outgoing: outgoing.map((s) => serializeShare(s, 'out')),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const sendShare = async (req, res) => {
  try {
    const { username, type, id } = shareSchema.parse(req.body);
    const targetUser = await ensureFriendUser(username);

    const friendship = await Friend.findOne({
      where: { userId: req.user.id, friendUserId: targetUser.id, status: 'accepted' },
    });
    if (!friendship) {
      return res.status(400).json({ message: 'You must be friends to share' });
    }

    if (type === 'meal') {
      const meal = await Meal.findOne({ where: { id, userId: req.user.id } });
      if (!meal) return res.status(404).json({ message: 'Meal not found' });
    } else {
      const group = await HouseholdGroup.findOne({ where: { id, userId: req.user.id } });
      if (!group) return res.status(404).json({ message: 'Group not found' });
    }

    const share = await Share.create({
      fromUserId: req.user.id,
      toUserId: targetUser.id,
      type,
      mealId: type === 'meal' ? id : null,
      householdGroupId: type === 'household' ? id : null,
    });

    return res.json({ shareId: share.id });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const acceptShare = async (req, res) => {
  try {
    const shareId = Number(req.params.id);
    const share = await Share.findOne({
      where: { id: shareId, toUserId: req.user.id, status: 'pending' },
      include: [
        { model: Meal, as: 'meal', include: [{ model: Ingredient, as: 'ingredients' }] },
        { model: HouseholdGroup, as: 'householdGroup', include: [{ model: HouseholdItem, as: 'items' }] },
      ],
    });
    if (!share) {
      return res.status(404).json({ message: 'Share not found or already accepted' });
    }

    let created;
    await sequelize.transaction(async (transaction) => {
      if (share.type === 'meal' && share.meal) {
        const mealWithIngredients = await Meal.findOne({
          where: { id: share.meal.id },
          include: [
            {
              model: Ingredient,
              as: 'ingredients',
              through: { attributes: ['quantityValue', 'quantityUnit'] },
            },
          ],
          transaction,
        });
        created = await cloneMealForUser(mealWithIngredients, req.user.id, transaction);
      } else if (share.type === 'household' && share.householdGroup) {
        const groupWithItems = await HouseholdGroup.findOne({
          where: { id: share.householdGroup.id },
          include: [
            {
              model: HouseholdItem,
              as: 'items',
              through: { attributes: ['quantityValue', 'quantityUnit'] },
            },
          ],
          transaction,
        });
        created = await cloneHouseholdGroupForUser(groupWithItems, req.user.id, transaction);
      }

      share.status = 'accepted';
      share.acceptedAt = new Date();
      await share.save({ transaction });
    });

    return res.json({ added: created ? created.id : null });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = { listFriends, addFriend, listShares, sendShare, acceptShare };
