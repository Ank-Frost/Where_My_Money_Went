const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

router.get('/', auth, userController.getAllUsers);
router.get('/search', auth, userController.searchUsers);

module.exports = router;
