const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    claimant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contactNumber: { type: String, required: true, trim: true, maxlength: 30 },
    proofAnswer: { type: String, required: true, trim: true, maxlength: 500 },
    note: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'resolved'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

claimSchema.index({ item: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Claim', claimSchema);