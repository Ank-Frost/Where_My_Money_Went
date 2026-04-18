const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  getGoals, createGoal, updateGoal, deleteGoal, allocateToGoals, getGoalAllocations
} = require('../controllers/goalController');

router.use(auth);
router.get('/', getGoals);
router.post('/', createGoal);
router.post('/allocate', allocateToGoals);
router.get('/:id/allocations', getGoalAllocations);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

module.exports = router;
