const Claim = require('../models/Claim.model');
const Feedback = require('../models/Feedback.model');
const Item = require('../models/Item.model');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const { notifyClaimUpdate, notifyItemInVault } = require('../services/notification.service');
const { processImage, destroyCloudinaryImage } = require('../services/upload.service');
const { parsePagination, pageMeta } = require('../utils/pagination');

const ROLES = ['student', 'guard', 'admin', 'user'];
const ITEM_STATUSES = ['active', 'claimed', 'resolved'];
const HANDOVER_STATUSES = ['pending', 'in_vault'];
const FEEDBACK_STATUSES = ['new', 'reviewed'];
const FEEDBACK_CATEGORIES = ['bug', 'feature', 'usability', 'content', 'other'];

// User-supplied search text is matched literally, so a stray "(" or "[" cannot
// produce an invalid $regex and turn a search into a 500.
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.getUsers = async (req, res, next) => {
  try {
    const q = String(req.query.search || '').trim();
    const filter = q
      ? {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
            { mobileNumber: { $regex: q, $options: 'i' } },
          ],
        }
      : {};

    const { page, pageSize, skip, limit } = parsePagination(req.query, 10, 100);
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await User.countDocuments(filter);
    res.status(200).json({ users, total, ...pageMeta(total, page, pageSize) });
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, role, mobileNumber, address, password } = req.body;

    const cleanName = String(name || '').trim();
    const mail = String(email || '').toLowerCase().trim();

    if (!cleanName) return res.status(400).json({ message: 'Name is required' });
    if (!mail) return res.status(400).json({ message: 'Email is required' });
    if (!password) return res.status(400).json({ message: 'Password is required' });
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const roleValue = role || 'student';
    if (!ROLES.includes(roleValue)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const exists = await User.findOne({ email: mail });
    if (exists) return res.status(409).json({ message: 'Another account already uses this email' });

    const user = await User.create({
      name: cleanName,
      email: mail,
      role: roleValue,
      mobileNumber: mobileNumber !== undefined ? String(mobileNumber).trim() : undefined,
      address: address !== undefined ? String(address).trim() : undefined,
      password: String(password),
    });

    user.password = undefined;
    res.status(201).json({ user, message: 'User created' });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email, role, mobileNumber, address, password } = req.body;

    if (name !== undefined) user.name = String(name).trim();
    if (mobileNumber !== undefined) user.mobileNumber = String(mobileNumber).trim();
    if (address !== undefined) user.address = String(address).trim();

    if (email !== undefined) {
      const mail = String(email).toLowerCase().trim();
      if (!mail) return res.status(400).json({ message: 'Email is required' });
      const clash = await User.findOne({ email: mail, _id: { $ne: user._id } });
      if (clash) return res.status(409).json({ message: 'Another account already uses this email' });
      user.email = mail;
    }

    if (role !== undefined) {
      if (!ROLES.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      if (String(user._id) === String(req.user._id) && role !== 'admin') {
        return res.status(400).json({ message: 'You cannot change your own admin role' });
      }
      if (user.role === 'admin' && role !== 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) {
          return res.status(400).json({ message: 'Cannot demote the last admin' });
        }
      }
      user.role = role;
    }

    if (password !== undefined && password !== '') {
      if (String(password).length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      user.password = String(password);
    }

    await user.save();
    user.password = undefined;
    res.status(200).json({ user, message: 'User updated' });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin' });
      }
    }

    await user.deleteOne();
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

exports.getAllItems = async (req, res, next) => {
  try {
    const { search, type, status } = req.query;
    const filter = {};

    if (search) {
      const re = { $regex: String(search), $options: 'i' };
      filter.$or = [{ title: re }, { category: re }, { location: re }, { description: re }];
    }
    if (type) filter.type = type;
    if (status) filter.status = status;
    const { page, pageSize, skip, limit } = parsePagination(req.query, 12, 200);

    const items = await Item.find(filter)
      .select('+secretFeature')
      .populate('createdBy', 'name email')
      .populate('claimedBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Item.countDocuments(filter);
    res.status(200).json({ items, total, ...pageMeta(total, page, pageSize) });
  } catch (err) {
    next(err);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const { title, description, category, location, date, type, status, handoverStatus, secretFeature } = req.body;

    if (title !== undefined) item.title = String(title).trim();
    if (description !== undefined) item.description = String(description).trim();
    if (category !== undefined) item.category = String(category).trim();
    if (location !== undefined) item.location = String(location).trim();
    if (date !== undefined) item.date = new Date(date);
    if (type !== undefined && ['lost', 'found'].includes(type)) item.type = type;
    if (status !== undefined && ITEM_STATUSES.includes(status)) item.status = status;
    if (handoverStatus !== undefined && HANDOVER_STATUSES.includes(handoverStatus)) {
      item.handoverStatus = handoverStatus;
      if (handoverStatus === 'in_vault') {
        item.handedOverAt = item.handedOverAt || new Date();
      }
    }
    if (type === 'found' || secretFeature !== undefined) item.secretFeature = String(secretFeature || '').trim();

    if (req.file) {
      const newImage = await processImage(req.file);
      if (newImage && newImage !== item.image) {
        const oldImage = item.image;
        item.image = newImage;
        await destroyCloudinaryImage(oldImage);
      }
    }

    await item.save();
    res.status(200).json({ item, message: 'Item updated' });
  } catch (err) {
    next(err);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    await Claim.deleteMany({ item: item._id });
    await Notification.deleteMany({ items: item._id });
    await item.deleteOne();

    if (item.image) {
      await destroyCloudinaryImage(item.image);
    }

    res.status(200).json({ message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
};

exports.getClaims = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const q = String(req.query.search || '').trim();
    if (q) {
      const re = { $regex: q, $options: 'i' };
      const [itemIds, userIds] = await Promise.all([
        Item.find({ $or: [{ title: re }, { category: re }, { location: re }, { description: re }] }).distinct('_id'),
        User.find({ $or: [{ name: re }, { email: re }] }).distinct('_id'),
      ]);
      filter.$or = [
        { item: { $in: itemIds } },
        { claimant: { $in: userIds } },
        { contactNumber: re },
        { proofAnswer: re },
      ];
    }

    const { page, pageSize, skip, limit } = parsePagination(req.query, 10, 100);
    const claims = await Claim.find(filter)
      .populate('item', 'title category location image type status date description handoverStatus createdBy +secretFeature')
      .populate('item.createdBy', 'name email mobileNumber')
      .populate('claimant', 'name email avatar')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Claim.countDocuments(filter);
    res.status(200).json({ claims, total, ...pageMeta(total, page, pageSize) });
  } catch (err) {
    next(err);
  }
};

exports.reviewClaim = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const claim = await Claim.findById(req.params.id).populate('item');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.status !== 'pending') {
      return res.status(400).json({ message: `Claim already ${claim.status}` });
    }

    claim.status = status;
    claim.reviewedBy = req.user._id;
    await claim.save();

    if (status === 'approved') {
      await Item.findByIdAndUpdate(claim.item._id, { status: 'claimed', claimedBy: claim.claimant });
      await Claim.updateMany(
        { item: claim.item._id, _id: { $ne: claim._id }, status: 'pending' },
        { status: 'rejected' }
      );
    }

    await notifyClaimUpdate(await claim.populate(['claimant', 'item']));
    res.status(200).json({ claim });
  } catch (err) {
    next(err);
  }
};

exports.getVault = async (req, res, next) => {
  try {
    const filter = { status: { $in: ['active', 'claimed'] } };
    const view = String(req.query.view || 'all');
    if (view === 'pending') {
      filter.type = 'found';
      filter.handoverStatus = 'pending';
    } else if (view === 'in_vault') {
      filter.handoverStatus = 'in_vault';
    } else if (view === 'claimed') {
      filter.status = 'claimed';
    }

    const q = String(req.query.search || '').trim();
    if (q) {
      const re = { $regex: q, $options: 'i' };
      filter.$or = [{ title: re }, { category: re }, { location: re }, { description: re }];
    }
    const { page, pageSize, skip, limit } = parsePagination(req.query, 12, 100);
    const items = await Item.find(filter)
      .select('+secretFeature')
      .populate('createdBy', 'name email avatar')
      .populate('claimedBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Item.countDocuments(filter);
    res.status(200).json({ items, total, ...pageMeta(total, page, pageSize) });
  } catch (err) {
    next(err);
  }
};

exports.markAvailable = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.type !== 'found') {
      return res.status(400).json({ message: 'Only found items can be marked as in the guard room' });
    }
    if (item.status !== 'active') {
      return res.status(400).json({ message: `Item must be active to be marked available (current: ${item.status})` });
    }

    item.handoverStatus = 'in_vault';
    item.handedOverAt = new Date();
    item.lastReminderAt = new Date();
    await item.save();

    await notifyItemInVault(await item.populate('createdBy'));
    res.status(200).json({ item, message: 'Item marked as available in the guard room. It is now visible in the public feed.' });
  } catch (err) {
    next(err);
  }
};

exports.handover = async (req, res, next) => {
  try {
    const { code, claimId, claimantId } = req.body;

    let cid = claimId;
    let uid = claimantId;
    if (code && code.includes('::')) {
      const [c, u] = code.split('::');
      cid = c;
      uid = u;
    }

    if (!cid || !uid) {
      return res.status(400).json({ message: 'Scan the claimant QR code (claim id + student id required)' });
    }

    const claim = await Claim.findById(cid).populate('item').populate('claimant');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.status !== 'approved') {
      return res.status(400).json({ message: 'This claim is not approved yet' });
    }
    if (String(claim.claimant._id) !== String(uid)) {
      return res.status(400).json({ message: 'Claimant identity does not match' });
    }
    if (claim.item.status === 'resolved') {
      return res.status(400).json({ message: 'Item already resolved' });
    }

    claim.item.status = 'resolved';
    await claim.item.save();

    claim.status = 'resolved';
    await claim.save();

    await notifyClaimUpdate(claim);
    res.status(200).json({
      item: claim.item,
      claim,
      message: 'Handover verified. Item marked as resolved.',
    });
  } catch (err) {
    next(err);
  }
};

exports.getFeedback = async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim();
    const category = String(req.query.category || '').trim();
    const q = String(req.query.search || '').trim();

    const filter = {};
    if (FEEDBACK_STATUSES.includes(status)) filter.status = status;
    if (FEEDBACK_CATEGORIES.includes(category)) filter.category = category;
    if (q) {
      // `user` is an ObjectId ref, so Mongo cannot match "user.name" / "user.email"
      // inside find() the way it can on already-populated documents. Resolve the
      // matching students to ids first, then constrain the ref itself.
      const rx = new RegExp(escapeRegExp(q), 'i');
      const matchedUsers = await User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id');
      const userIds = matchedUsers.map((u) => u._id);
      filter.$or = [
        { message: rx },
        ...(userIds.length ? [{ user: { $in: userIds } }] : []),
      ];
    }

    const { page, pageSize, skip, limit } = parsePagination(req.query, 10, 100);
    const feedback = await Feedback.find(filter)
      .populate('user', 'name email role avatar')
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Feedback.countDocuments(filter);
    const [aggregate] = await Feedback.aggregate([
      { $group: { _id: null, count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      feedback,
      total,
      summary: {
        count: aggregate?.count || 0,
      },
      ...pageMeta(total, page, pageSize),
    });
  } catch (err) {
    next(err);
  }
};

exports.updateFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

    const status = String(req.body.status || '').trim();
    if (!FEEDBACK_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    feedback.status = status;
    feedback.reviewedBy = status === 'reviewed' ? req.user._id : null;
    feedback.reviewedAt = status === 'reviewed' ? new Date() : null;
    await feedback.save();

    const populated = await feedback.populate('user', 'name email role avatar');
    res.status(200).json({ feedback: populated, message: `Feedback marked as ${status}` });
  } catch (err) {
    next(err);
  }
};

exports.deleteFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

    await Notification.deleteMany({ feedback: feedback._id });
    await feedback.deleteOne();
    res.status(200).json({ message: 'Feedback deleted' });
  } catch (err) {
    next(err);
  }
};