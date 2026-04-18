const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const splitGroupController = require('../controllers/splitGroupController');

// Group management
router.post('/', auth, splitGroupController.createGroup);
router.get('/', auth, splitGroupController.getGroups);
router.get('/:groupId/members', auth, splitGroupController.getGroupMembers);
router.post('/:groupId/members', auth, splitGroupController.addMember);

// Expenses
router.post('/:groupId/expenses', auth, splitGroupController.addExpense);
router.get('/:groupId/expenses', auth, splitGroupController.getGroupExpenses);
router.get('/:groupId/balance', auth, splitGroupController.getGroupBalance);

// Settle
router.put('/splits/:splitId/settle', auth, splitGroupController.settleExpenseSplit);

module.exports = router;
