const Claim = require('../models/Claim.model');
const Item = require('../models/Item.model');
const User = require('../models/User.model');
const { notifyClaimUpdate, notifyItemInVault } = require('../services/notification.service');

const ROLES = ['student', 'guard', 'admin', 'user'];

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

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.status(200).json({ users });
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

exports.getClaims = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const claims = await Claim.find(filter)
      .populate('item', 'title category location image type status createdBy date +secretFeature')
      .populate('claimant', 'name email avatar')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ claims });
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
    const items = await Item.find({ status: { $in: ['active', 'claimed'] } })
      .select('+secretFeature')
      .populate('createdBy', 'name email avatar')
      .populate('claimedBy', 'name email avatar')
      .sort({ createdAt: -1 });
    res.status(200).json({ items });
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