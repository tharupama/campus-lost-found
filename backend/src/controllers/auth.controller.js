const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User.model');
const { processImage } = require('../services/upload.service');
const { sendMail } = require('../config/email');
const { renderForgotPassword, renderNotification } = require('../templates');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

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

exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const uname = String(username || '').trim();
    const mail = String(email || '').toLowerCase().trim();

    if (!uname || !mail || !password) {
      return res.status(400).json({ message: 'Username, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ email: mail });
    if (exists) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({ name: uname, email: mail, password, role: 'student' });
    user.password = undefined;
    res.status(201).json({ token: signToken(user), user });
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
      });
    } else if (!user.googleId) {
      user.googleId = gid;
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