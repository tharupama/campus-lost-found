const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000 },
    type: { type: String, enum: ['lost', 'found'], required: true, index: true },
    category: { type: String, required: true, index: true },
    location: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    image: { type: String },
    status: { type: String, enum: ['active', 'claimed', 'resolved'], default: 'active', index: true },
    secretFeature: { type: String, select: false, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

itemSchema.index({ type: 1, category: 1, location: 1, createdAt: -1 });

module.exports = mongoose.model('Item', itemSchema);