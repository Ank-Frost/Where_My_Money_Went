const router = require('express').Router();
const { setup, login, me, changePassword, checkSetup } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.get('/check-setup', checkSetup);
router.post('/setup', setup);
router.post('/login', login);
router.get('/me', auth, me);
router.put('/change-password', auth, changePassword);

module.exports = router;
