const mongoose = require('mongoose');

const registrationOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    otpHash: { type: String, default: null },
    otpExpires: { type: Date, default: null, expires: 0 },
    attempts: { type: Number, default: 0 },
    otpVerified: { type: Boolean, default: false },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RegistrationOtp', registrationOtpSchema);
