const Feedback = require('../models/Feedback.model');
const User = require('../models/User.model');
const { notifyNewFeedback } = require('../services/notification.service');
const { parsePagination, pageMeta } = require('../utils/pagination');

const CATEGORIES = ['bug', 'feature', 'usability', 'content', 'other'];

const CATEGORY_LABELS = {
  bug: 'Bug report',
  feature: 'Feature request',
  usability: 'Usability',
  content: 'Content / data',
  other: 'Other',
};

function categoryLabel(key) {
  return CATEGORY_LABELS[key] || CATEGORY_LABELS.other;
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

exports.submitFeedback = async (req, res, next) => {
  try {
    const category = clean(req.body.category).toLowerCase() || 'other';
    const message = clean(req.body.message);

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Pick a valid category' });
    }
    if (message.length < 10) {
      return res.status(400).json({ message: 'Tell us a bit more — at least 10 characters' });
    }

    const author = await User.findById(req.user._id).select('name email role');
    if (!author) return res.status(404).json({ message: 'Account not found' });

    const feedback = await Feedback.create({
      user: author._id,
      category,
      message,
    });

    const admins = await User.find({ role: 'admin' }).select('name email role');
    const { emailsSent } = await notifyNewFeedback({
      feedback: {
        _id: feedback._id,
        category: feedback.category,
        categoryLabel: categoryLabel(feedback.category),
        message: feedback.message,
        author: { name: author.name, email: author.email },
      },
      recipients: admins,
    });

    res.status(201).json({
      message: 'Thanks — your feedback was sent to the admin team.',
      feedback,
      emailsSent,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyFeedback = async (req, res, next) => {
  try {
    const { page, pageSize, skip, limit } = parsePagination(req.query, 10, 50);
    const filter = { user: req.user._id };
    const feedback = await Feedback.find(filter)
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Feedback.countDocuments(filter);
    res.status(200).json({ feedback, total, ...pageMeta(total, page, pageSize) });
  } catch (err) {
    next(err);
  }
};

exports.getFeedbackSummary = async (req, res, next) => {
  try {
    const [aggregate] = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    const byCategory = await Feedback.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.status(200).json({
      count: aggregate?.count || 0,
      byCategory: byCategory.map((c) => ({
        category: c._id,
        label: categoryLabel(c._id),
        count: c.count,
      })),
    });
  } catch (err) {
    next(err);
  }
};
