const router = require('express').Router();
const { getMyNotifications, markAllRead } = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getMyNotifications);
router.patch('/read', protect, markAllRead);

module.exports = router;