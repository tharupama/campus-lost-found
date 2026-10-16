const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User.model');
const RegistrationOtp = require('../models/RegistrationOtp.model');
const TrustedDevice = require('../models/TrustedDevice.model');
const { processImage } = require('../services/upload.service');
const { sendMail } = require('../config/email');
const { renderForgotPassword, renderOtp, renderNotification } = require('../templates');
const { generateSecret, verifyTotp, keyUri } = require('../services/totp.service');
const { encrypt, decrypt, randomToken } = require('../services/crypto.service');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds between sends
const OTP_MAX_ATTEMPTS = 5;
const REG_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes after OTP verification
const REG_TOKEN_TTL = '30m';
const MFA_TOKEN_TTL = '5m';
const TRUSTED_DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RECOVERY_CODE_COUNT = 10;
const TWO_FACTOR_ISSUER = process.env.TWO_FACTOR_ISSUER || 'Ruhuna Lost & Found';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[0-9+\-\s()]+$/;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function frontendUrl(link = '') {
  const base = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  return link ? `${base}${link}` : base;
}

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'campus-dev-secret', {
    expiresIn: '7d',
  });
}

function issueRegistrationToken(email) {
  return jwt.sign({ email, purpose: 'registration' }, process.env.JWT_SECRET || 'campus-dev-secret', {
    expiresIn: REG_TOKEN_TTL,
  });
}

function registrationEmailFrom(req) {
  const token = req.body?.regToken;
  if (!token) return null;
  try {
    const payload = jwt.verify(String(token), process.env.JWT_SECRET || 'campus-dev-secret');
    if (payload.purpose !== 'registration' || !payload.email) return null;
    return payload.email;
  } catch {
    return null;
  }
}

function readEmail(body) {
  return String(body?.email || '').toLowerCase().trim();
}

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score;
}

function signMfaToken(user) {
  return jwt.sign({ id: user._id, purpose: 'mfa' }, process.env.JWT_SECRET || 'campus-dev-secret', {
    expiresIn: MFA_TOKEN_TTL,
  });
}

function normalizeRecoveryCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function generateRecoveryCodes(count = RECOVERY_CODE_COUNT) {
  const codes = [];
  for (let i = 0; i < count; i += 1) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

async function issueTrustedDevice(user, req) {
  const raw = randomToken(32);
  await TrustedDevice.create({
    user: user._id,
    tokenHash: hashToken(raw),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
    expiresAt: new Date(Date.now() + TRUSTED_DEVICE_TTL_MS),
  });
  return raw;
}

async function trustedDeviceMatches(user, raw) {
  if (!raw) return null;
  return TrustedDevice.findOne({
    user: user._id,
    tokenHash: hashToken(String(raw)),
    expiresAt: { $gt: new Date() },
  });
}

exports.startRegistration = async (req, res, next) => {
  try {
    const mail = readEmail(req.body);
    if (!mail || !EMAIL_RE.test(mail)) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }

    const exists = await User.findOne({ email: mail });
    if (exists) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const pending = await RegistrationOtp.findOne({ email: mail });
    if (pending?.lastSentAt) {
      const waitMs = OTP_RESEND_COOLDOWN_MS - (Date.now() - pending.lastSentAt.getTime());
      if (waitMs > 0) {
        const retryAfter = Math.ceil(waitMs / 1000);
        return res.status(429).json({
          message: `Please wait ${retryAfter} second${retryAfter === 1 ? '' : 's'} before requesting another code`,
          retryAfter,
        });
      }
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const doc = pending || new RegistrationOtp({ email: mail });
    doc.otpHash = hashToken(otp);
    doc.otpExpires = new Date(Date.now() + OTP_TTL_MS);
    doc.attempts = 0;
    doc.otpVerified = false;
    doc.lastSentAt = new Date();
    await doc.save();

    const { html, text } = renderOtp({ name: mail.split('@')[0], otp, expiryMinutes: OTP_TTL_MS / 60000 });
    await sendMail({ to: mail, subject: `Your confirmation code is ${otp}`, html, text });

    res.status(200).json({
      message: 'A confirmation code has been sent to your email.',
      cooldownSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyRegistrationOtp = async (req, res, next) => {
  try {
    const mail = readEmail(req.body);
    const otp = String(req.body?.otp || '').trim();
    if (!mail || !otp) {
      return res.status(400).json({ message: 'Email and confirmation code are required' });
    }

    const doc = await RegistrationOtp.findOne({ email: mail });
    if (!doc || !doc.otpHash || !doc.otpExpires) {
      return res.status(400).json({ message: 'Request a new confirmation code' });
    }
    if (doc.otpExpires.getTime() < Date.now()) {
      return res.status(400).json({ message: 'That code has expired. Request a new one.' });
    }
    if (doc.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(400).json({ message: 'Too many incorrect attempts. Request a new code.' });
    }
    if (hashToken(otp) !== doc.otpHash) {
      doc.attempts += 1;
      await doc.save();
      const attemptsLeft = Math.max(OTP_MAX_ATTEMPTS - doc.attempts, 0);
      return res.status(400).json({
        message: `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`,
        attemptsLeft,
      });
    }

    doc.otpHash = null;
    doc.attempts = 0;
    doc.otpVerified = true;
    doc.otpExpires = new Date(Date.now() + REG_SESSION_TTL_MS);
    await doc.save();

    res.status(200).json({ message: 'Email confirmed!', regToken: issueRegistrationToken(mail) });
  } catch (err) {
    next(err);
  }
};

exports.completeRegistration = async (req, res, next) => {
  try {
    const mail = registrationEmailFrom(req);
    if (!mail) {
      return res.status(401).json({ message: 'Your registration session has expired. Please start again.' });
    }

    const uname = String(req.body?.username || '').trim();
    const mobile = String(req.body?.mobileNumber || '').trim();
    const address = String(req.body?.address || '').trim();
    const password = String(req.body?.password || '');

    if (uname.length < 2) {
      return res.status(400).json({ message: 'Username must be at least 2 characters' });
    }
    const digits = mobile.replace(/\D/g, '');
    if (!mobile || !MOBILE_RE.test(mobile) || digits.length < 7 || digits.length > 15) {
      return res.status(400).json({ message: 'Enter a valid mobile number' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (passwordStrength(password) < 3) {
      return res
        .status(400)
        .json({ message: 'Password is too weak — use at least 6 characters with mixed case plus a number or symbol' });
    }

    const doc = await RegistrationOtp.findOne({ email: mail });
    if (!doc || !doc.otpVerified) {
      return res.status(401).json({ message: 'Your registration session has expired. Please start again.' });
    }

    const exists = await User.findOne({ email: mail });
    if (exists) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name: uname,
      email: mail,
      password,
      mobileNumber: mobile,
      address: address || undefined,
      role: 'student',
      isVerified: true,
    });
    await RegistrationOtp.deleteOne({ email: mail });

    user.password = undefined;
    res.status(201).json({ token: signToken(user), user, message: 'Account created' });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid campus credentials' });
    }
    if (!user.isVerified) {
      return res.status(403).json({
        code: 'emailNotVerified',
        message: 'Your account has not been verified yet. Visit the IT help desk to activate it.',
      });
    }

    if (user.twoFactorEnabled) {
      const device = await trustedDeviceMatches(user, req.body?.trustedDevice);
      if (!device) {
        user.password = undefined;
        return res.status(200).json({
          mfaRequired: true,
          mfaToken: signMfaToken(user),
          message: 'Enter the code from your authenticator app.',
        });
      }
    }

    user.password = undefined;
    res.status(200).json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    res.status(200).json({ user: req.user });
  } catch (err) {
    next(err);
  }
};

exports.googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: 'Google sign-in is not configured' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: String(credential),
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const gid = payload?.sub;
    const email = String(payload?.email || '').toLowerCase().trim();

    if (!gid || !email) {
      return res.status(403).json({ message: 'Google account has no email' });
    }
    if (!payload.email_verified) {
      return res.status(403).json({ message: 'Google email is not verified' });
    }

    let user = await User.findOne({ $or: [{ email }, { googleId: gid }] });
    if (!user) {
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        googleId: gid,
        password: crypto.randomBytes(24).toString('hex'),
        role: 'student',
        avatar: payload.picture || undefined,
        isVerified: true,
      });
    } else if (!user.googleId) {
      user.googleId = gid;
      user.isVerified = true;
      if (!user.avatar && payload.picture) user.avatar = payload.picture;
      await user.save();
    }

    user.password = undefined;
    res.status(200).json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const mail = String(email || '').toLowerCase().trim();
    if (!mail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: mail });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = hashToken(rawToken);
      user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();

      const resetUrl = `${frontendUrl()}/reset-password?token=${rawToken}`;
      const { html, text } = renderForgotPassword({ name: user.name, resetUrl, expiryHours: 1 });
      await sendMail({ to: user.email, subject: 'Reset your password', html, text });
    }

    res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(String(token)),
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' });
    }

    user.password = String(password);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    const { html, text } = renderNotification({
      title: 'Your password was changed',
      message: 'Your password was changed successfully. If this was not you, contact the campus security desk immediately.',
    });
    await sendMail({ to: user.email, subject: 'Your password was changed', html, text });

    res.status(200).json({ message: 'Password updated. You can now sign in.' });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, mobileNumber, address, currentPassword, newPassword } = req.body;

    if (name !== undefined) {
      const uname = String(name).trim();
      if (uname.length < 2) {
        return res.status(400).json({ message: 'Username must be at least 2 characters' });
      }
      user.name = uname;
    }
    if (mobileNumber !== undefined) user.mobileNumber = String(mobileNumber).trim() || undefined;
    if (address !== undefined) user.address = String(address).trim() || undefined;

    if (req.file && req.file.buffer) {
      const avatar = await processImage(req.file);
      if (avatar) user.avatar = avatar;
    }

    if (newPassword) {
      const next = String(newPassword);
      if (!currentPassword) {
        return res.status(400).json({ message: 'Enter your current password to change it' });
      }
      if (!(await user.comparePassword(currentPassword))) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      if (next.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
      }
      user.password = next;
    }

    await user.save();
    user.password = undefined;
    res.status(200).json({ user, message: 'Profile updated' });
  } catch (err) {
    next(err);
  }
};

exports.getTwoFactorStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+twoFactorRecoveryCodes');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({
      enabled: Boolean(user.twoFactorEnabled),
      recoveryCodesRemaining: user.twoFactorRecoveryCodes?.length || 0,
    });
  } catch (err) {
    next(err);
  }
};

exports.setupTwoFactor = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.twoFactorEnabled) {
      return res.status(409).json({ message: 'Two-factor authentication is already enabled' });
    }

    const secret = generateSecret();
    user.twoFactorPendingSecret = encrypt(secret);
    await user.save();

    res.status(200).json({
      secret,
      otpauthUrl: keyUri({ secret, label: user.email, issuer: TWO_FACTOR_ISSUER }),
    });
  } catch (err) {
    next(err);
  }
};

exports.enableTwoFactor = async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim();
    const user = await User.findById(req.user._id).select('+twoFactorPendingSecret +twoFactorRecoveryCodes');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.twoFactorEnabled) {
      return res.status(409).json({ message: 'Two-factor authentication is already enabled' });
    }
    if (!user.twoFactorPendingSecret) {
      return res.status(400).json({ message: 'Start the setup again to get a new QR code' });
    }

    const secret = decrypt(user.twoFactorPendingSecret);
    const step = secret ? verifyTotp(secret, code) : null;
    if (step === null) {
      return res.status(400).json({ message: 'That code is not valid — check your authenticator app and try again' });
    }

    const codes = generateRecoveryCodes();
    user.twoFactorSecret = user.twoFactorPendingSecret;
    user.twoFactorPendingSecret = null;
    user.twoFactorEnabled = true;
    user.twoFactorLastStep = 0;
    user.twoFactorRecoveryCodes = codes.map((c) => hashToken(normalizeRecoveryCode(c)));
    await user.save();

    res.status(200).json({
      enabled: true,
      recoveryCodes: codes,
      message: 'Two-factor authentication is now on. Save your recovery codes.',
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyTwoFactorLogin = async (req, res, next) => {
  try {
    const { mfaToken, code, rememberDevice } = req.body || {};
    if (!mfaToken || !code) {
      return res.status(400).json({ message: 'Verification code is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(String(mfaToken), process.env.JWT_SECRET || 'campus-dev-secret');
    } catch {
      return res.status(401).json({ message: 'Your verification session expired. Please sign in again.' });
    }
    if (decoded.purpose !== 'mfa') {
      return res.status(401).json({ message: 'Invalid verification session. Please sign in again.' });
    }

    const user = await User.findById(decoded.id).select(
      '+twoFactorSecret +twoFactorRecoveryCodes +twoFactorLastStep'
    );
    if (!user || !user.twoFactorEnabled) {
      return res.status(401).json({ message: 'Two-factor authentication is not active for this account' });
    }

    const normalized = String(code).trim();
    let matchedStep = null;
    let usedRecovery = false;

    if (/^\d{6}$/.test(normalized)) {
      const secret = decrypt(user.twoFactorSecret);
      matchedStep = secret ? verifyTotp(secret, normalized) : null;
      if (matchedStep !== null && matchedStep <= (user.twoFactorLastStep || 0)) {
        return res.status(400).json({ message: 'That code was already used — wait for the next one' });
      }
    } else {
      const recoveryHash = hashToken(normalizeRecoveryCode(normalized));
      const index = (user.twoFactorRecoveryCodes || []).indexOf(recoveryHash);
      if (index >= 0) {
        usedRecovery = true;
        user.twoFactorRecoveryCodes.splice(index, 1);
      }
    }

    if (matchedStep === null && !usedRecovery) {
      return res.status(400).json({ message: 'Invalid code. Try again or use a recovery code.' });
    }

    if (matchedStep !== null) user.twoFactorLastStep = matchedStep;

    let trustedDevice = null;
    if (rememberDevice) {
      trustedDevice = await issueTrustedDevice(user, req);
    }

    await user.save();

    user.password = undefined;
    user.twoFactorSecret = undefined;
    user.twoFactorRecoveryCodes = undefined;
    user.twoFactorLastStep = undefined;

    res.status(200).json({
      token: signToken(user),
      user,
      ...(trustedDevice ? { trustedDevice } : {}),
      message: usedRecovery ? 'Recovery code accepted. That code can no longer be used.' : 'Verified',
    });
  } catch (err) {
    next(err);
  }
};

exports.disableTwoFactor = async (req, res, next) => {
  try {
    const password = String(req.body?.password || '');
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!password) return res.status(400).json({ message: 'Enter your password to disable two-factor authentication' });
    if (!(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Password is incorrect' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorPendingSecret = null;
    user.twoFactorRecoveryCodes = [];
    user.twoFactorLastStep = 0;
    await user.save();
    await TrustedDevice.deleteMany({ user: user._id });

    res.status(200).json({ enabled: false, message: 'Two-factor authentication is now off' });
  } catch (err) {
    next(err);
  }
};

exports.regenerateRecoveryCodes = async (req, res, next) => {
  try {
    const password = String(req.body?.password || '');
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Two-factor authentication is not enabled' });
    }
    if (!password || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Password is incorrect' });
    }

    const codes = generateRecoveryCodes();
    user.twoFactorRecoveryCodes = codes.map((c) => hashToken(normalizeRecoveryCode(c)));
    await user.save();

    res.status(200).json({
      recoveryCodes: codes,
      message: 'New recovery codes generated. Your old codes no longer work.',
    });
  } catch (err) {
    next(err);
  }
};