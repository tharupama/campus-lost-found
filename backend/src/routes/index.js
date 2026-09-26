const router = require('express').Router();
const authRoutes = require('./auth.routes');
const itemRoutes = require('./item.routes');
const claimRoutes = require('./claim.routes');
const adminRoutes = require('./admin.routes');
const notificationRoutes = require('./notification.routes');
const contactRoutes = require('./contact.routes');
const feedbackRoutes = require('./feedback.routes');
const chatRoutes = require('./chat.routes');

router.use('/auth', authRoutes);
router.use('/items', itemRoutes);
router.use('/claims', claimRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/contact', contactRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/chat', chatRoutes);

module.exports = router;