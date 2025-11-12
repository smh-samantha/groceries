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
const { getGroceryList } = require('../controllers/groceryController');
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

module.exports = router;
