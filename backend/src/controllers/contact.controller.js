const User = require('../models/User.model');
const { notifyUser } = require('../services/notification.service');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['admin', 'guard'];

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

exports.getContactStaff = async (req, res, next) => {
  try {
    const staff = await User.find({ role: { $in: ['admin', 'guard'] } })
      .sort({ role: 1, createdAt: 1 })
      .select('role name email mobileNumber avatar');
    res.status(200).json({
      admins: staff.filter((u) => u.role === 'admin'),
      guards: staff.filter((u) => u.role === 'guard'),
    });
  } catch (err) {
    next(err);
  }
};

exports.sendContactMessage = async (req, res, next) => {
  try {
    const recipientRole = clean(req.body.recipientRole).toLowerCase();
    const name = clean(req.body.name);
    const email = clean(req.body.email);
    const mobileNumber = clean(req.body.mobileNumber);
    const message = clean(req.body.message);

    if (!ROLES.includes(recipientRole)) {
      return res.status(400).json({ message: 'Choose either an admin or a security guard to contact' });
    }
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (message.length < 5) return res.status(400).json({ message: 'Message should be at least 5 characters' });

    const recipients = await User.find({ role: recipientRole });
    const title = `New contact message from ${name}`;
    const detail = [
      `Name: ${name}`,
      `Email: ${email}`,
      mobileNumber ? `Mobile: ${mobileNumber}` : null,
      `Message: "${message}"`,
    ]
      .filter(Boolean)
      .join(' · ');

    await Promise.all(
      recipients.map((recipient) =>
        notifyUser({
          user: recipient._id,
          type: 'contact',
          title,
          message: detail,
        })
      )
    );

    res.status(200).json({
      message: `Message sent — we've notified the ${recipientRole}${recipients.length === 1 ? '' : 's'}`,
      recipientsNotified: recipients.length,
    });
  } catch (err) {
    next(err);
  }
};