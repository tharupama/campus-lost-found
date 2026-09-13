const Notification = require('../models/Notification.model');
const { parsePagination, pageMeta } = require('../utils/pagination');

exports.getMyNotifications = async (req, res, next) => {
  try {
    const { page, pageSize, skip, limit } = parsePagination(req.query, 10, 100);
    const filter = { user: req.user._id };
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Notification.countDocuments(filter);
    const unread = await Notification.countDocuments({ ...filter, read: false });
    res.status(200).json({ notifications, unread, total, ...pageMeta(total, page, pageSize) });
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};