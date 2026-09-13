const Item = require('../models/Item.model');
const { runMatchEngine } = require('../services/matchEngine.service');
const { processImage } = require('../services/upload.service');
const { notifyItemFound } = require('../services/notification.service');
const { parsePagination, pageMeta } = require('../utils/pagination');

const FOUND_ITEM_EXPIRY_DAYS = 90;

exports.getItems = async (req, res, next) => {
  try {
    const { type, category, location, status, search } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (location) filter.location = location;
    if (status) filter.status = status;
    if (!status && !type) filter.status = { $in: ['active', 'claimed'] };

    filter.$and = [
      { $or: [{ type: { $ne: 'found' } }, { handoverStatus: 'in_vault' }] },
    ];

    if (search) {
      filter.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
        ],
      });
    }

    const { page, pageSize, skip, limit } = parsePagination(req.query, 12, 60);

    const items = await Item.find(filter)
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Item.countDocuments(filter);
    res.status(200).json({ items, total, ...pageMeta(total, page, pageSize) });
  } catch (err) {
    next(err);
  }
};

exports.getItem = async (req, res, next) => {
  try {
    const query = Item.findById(req.params.id).populate('createdBy', 'name email avatar');
    if (req.user && ['admin', 'guard'].includes(req.user.role)) {
      query.select('+secretFeature');
    } else {
      query.select('-secretFeature');
    }
    const item = await query;
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.status(200).json({ item });
  } catch (err) {
    next(err);
  }
};

exports.getMyItems = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = { createdBy: req.user._id };
    if (type) filter.type = type;
    const { page, pageSize, skip, limit } = parsePagination(req.query, 12, 100);
    const items = await Item.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await Item.countDocuments(filter);
    res.status(200).json({ items, total, ...pageMeta(total, page, pageSize) });
  } catch (err) {
    next(err);
  }
};

exports.createItem = async (req, res, next) => {
  try {
    const { type, title, description, category, location, date, secretFeature } = req.body;

    if (type !== 'lost' && type !== 'found') {
      return res.status(400).json({ message: 'Type must be lost or found' });
    }
    if (!title || !category || !location) {
      return res.status(400).json({ message: 'Title, category and location are required' });
    }

    const image = await processImage(req.file);
    const item = await Item.create({
      title,
      description,
      type,
      category,
      location,
      date: date ? new Date(date) : new Date(),
      image,
      secretFeature: type === 'found' ? secretFeature || '' : undefined,
      expiresAt: type === 'found' ? new Date(Date.now() + FOUND_ITEM_EXPIRY_DAYS * 24 * 60 * 60 * 1000) : null,
      createdBy: req.user._id,
    });

    let matches = [];
    if (type === 'found') {
      await notifyItemFound(await item.populate('createdBy', 'name email'));
      matches = await runMatchEngine(item);
    }

    res.status(201).json({ item, matches, matchCount: matches.length });
  } catch (err) {
    next(err);
  }
};