const Claim = require('../models/Claim.model');
const Item = require('../models/Item.model');
const { notifyClaimUpdate } = require('../services/notification.service');

exports.getClaims = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const claims = await Claim.find(filter)
      .populate('item', 'title category location image type status createdBy date')
      .populate('claimant', 'name email avatar studentId')
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
      .populate('claimedBy', 'name email studentId')
      .sort({ createdAt: -1 });
    res.status(200).json({ items });
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