const Claim = require('../models/Claim.model');
const Item = require('../models/Item.model');
const User = require('../models/User.model');

// Public roster for the landing page. Only fields a security officer already
// exposes through the contact page are returned, plus two aggregate counts so
// the cards can show real custody activity instead of placeholder copy.
exports.getSecurityTeam = async (req, res, next) => {
  try {
    const guards = await User.find({ role: 'guard' })
      .sort({ createdAt: 1 })
      .select('name email mobileNumber avatar createdAt')
      .lean();

    const ids = guards.map((g) => g._id);

    const [vaultCounts, handoverCounts] = await Promise.all([
      Item.aggregate([
        {
          $match: {
            createdBy: { $in: ids },
            type: 'found',
            handoverStatus: 'in_vault',
            status: 'active',
          },
        },
        { $group: { _id: '$createdBy', count: { $sum: 1 } } },
      ]),
      Claim.aggregate([
        { $match: { reviewedBy: { $in: ids }, status: { $in: ['approved', 'resolved'] } } },
        { $group: { _id: '$reviewedBy', count: { $sum: 1 } } },
      ]),
    ]);

    const vault = new Map(vaultCounts.map((c) => [String(c._id), c.count]));
    const handovers = new Map(handoverCounts.map((c) => [String(c._id), c.count]));

    res.status(200).json({
      guards: guards.map((g) => ({
        id: g._id,
        name: g.name,
        email: g.email,
        mobileNumber: g.mobileNumber || '',
        avatar: g.avatar || '',
        since: g.createdAt ? new Date(g.createdAt).getFullYear() : null,
        itemsInCustody: vault.get(String(g._id)) || 0,
        handoversCompleted: handovers.get(String(g._id)) || 0,
      })),
      total: guards.length,
    });
  } catch (err) {
    next(err);
  }
};
