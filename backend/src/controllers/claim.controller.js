const Claim = require('../models/Claim.model');
const Item = require('../models/Item.model');
const { parsePagination, pageMeta } = require('../utils/pagination');

exports.createClaim = async (req, res, next) => {
  try {
    const { itemId, proofAnswer, note, contactNumber } = req.body;
    if (!itemId || !proofAnswer) {
      return res.status(400).json({ message: 'Item and proof answer are required' });
    }
    const phone = String(contactNumber || '').trim();
    if (!phone) {
      return res.status(400).json({ message: 'A contact number is required so security can reach you about pickup' });
    }

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.createdBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot claim an item you reported' });
    }
    if (item.status !== 'active') {
      return res.status(400).json({ message: 'This item is no longer available' });
    }

    const existing = await Claim.findOne({ item: itemId, claimant: req.user._id, status: 'pending' });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending claim for this item' });
    }

    const claim = await Claim.create({
      item: itemId,
      claimant: req.user._id,
      contactNumber: phone,
      proofAnswer,
      note,
    });

    res.status(201).json({ claim });
  } catch (err) {
    next(err);
  }
};

exports.getMyClaims = async (req, res, next) => {
  try {
    const { page, pageSize, skip, limit } = parsePagination(req.query, 10, 100);
    const filter = { claimant: req.user._id };
    const claims = await Claim.find(filter)
      .populate('item', 'title category location image type status createdBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Claim.countDocuments(filter);
    res.status(200).json({ claims, total, ...pageMeta(total, page, pageSize) });
  } catch (err) {
    next(err);
  }
};