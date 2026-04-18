const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  getPeople, addPerson, deletePerson,
  getGroups, createGroup,
  getExpenses, createExpense, deleteExpense, settleShare,
  getSummary
} = require('../controllers/splitController');

router.use(auth);
router.get('/summary', getSummary);
router.get('/people', getPeople);
router.post('/people', addPerson);
router.delete('/people/:id', deletePerson);
router.get('/groups', getGroups);
router.post('/groups', createGroup);
router.get('/expenses', getExpenses);
router.post('/expenses', createExpense);
router.delete('/expenses/:id', deleteExpense);
router.put('/shares/:shareId/settle', settleShare);

module.exports = router;
