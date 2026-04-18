const router = require('express').Router();
const auth = require('../middleware/auth');
const { getTags, deleteTag } = require('../controllers/tagController');

router.use(auth);
router.get('/', getTags);
router.delete('/:id', deleteTag);

module.exports = router;
