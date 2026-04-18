const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  getSubscriptions, createSubscription, updateSubscription, deleteSubscription
} = require('../controllers/subscriptionController');

router.use(auth);
router.get('/', getSubscriptions);
router.post('/', createSubscription);
router.put('/:id', updateSubscription);
router.delete('/:id', deleteSubscription);

module.exports = router;
