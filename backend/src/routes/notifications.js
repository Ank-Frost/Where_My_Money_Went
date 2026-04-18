const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  subscribePush, unsubscribePush,
  getNotifications, markRead, markAllRead,
  snoozeNotification, getVapidPublicKey
} = require('../controllers/notificationController');

router.use(auth);
router.get('/vapid-key', getVapidPublicKey);
router.post('/subscribe', subscribePush);
router.post('/unsubscribe', unsubscribePush);
router.get('/', getNotifications);
router.put('/:id/read', markRead);
router.put('/read-all', markAllRead);
router.put('/:id/snooze', snoozeNotification);

module.exports = router;
