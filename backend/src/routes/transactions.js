const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  getTransactions, createTransaction, updateTransaction,
  deleteTransaction, getStats, searchTransactions
} = require('../controllers/transactionController');

router.use(auth);
router.get('/stats', getStats);
router.get('/search', searchTransactions);
router.get('/', getTransactions);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
