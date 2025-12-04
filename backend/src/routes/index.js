const express = require('express');
const { login } = require('../controllers/authController');
const { listMeals, createMeal, updateMeal, deleteMeal } = require('../controllers/mealController');
const {
  getRotation,
  updateConfig,
  addEntry,
  deleteEntry,
  updateEntryServings,
} = require('../controllers/rotationController');
const {
  getGroceryList,
  saveGroceryCheck,
  clearGroceryChecks,
} = require('../controllers/groceryController');
const {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
} = require('../controllers/householdController');
const {
  listFriends,
  addFriend,
  listShares,
  sendShare,
  acceptShare,
} = require('../controllers/friendController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/auth/login', login);

router.use(authMiddleware);

router.get('/meals', listMeals);
router.post('/meals', createMeal);
router.put('/meals/:id', updateMeal);
router.delete('/meals/:id', deleteMeal);

router.get('/rotation', getRotation);
router.put('/rotation/config', updateConfig);
router.post('/rotation/entries', addEntry);
router.delete('/rotation/entries/:id', deleteEntry);
router.patch('/rotation/entries/:id/servings', updateEntryServings);

router.get('/grocery-list', getGroceryList);
router.post('/grocery-list/checks', saveGroceryCheck);
router.delete('/grocery-list/checks', clearGroceryChecks);

router.get('/household-groups', listGroups);
router.post('/household-groups', createGroup);
router.put('/household-groups/:id', updateGroup);
router.delete('/household-groups/:id', deleteGroup);

router.get('/friends', listFriends);
router.post('/friends', addFriend);
router.get('/shares', listShares);
router.post('/shares', sendShare);
router.post('/shares/:id/accept', acceptShare);

module.exports = router;
