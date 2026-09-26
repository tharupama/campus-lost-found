const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const { sendMail } = require('../config/email');
const { renderNotification, renderContactMessage, renderFeedbackReceived } = require('../templates');

function frontendUrl(link = '') {
  const base = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  return link ? `${base}${link}` : base;
}

function emailTypeLabel(type) {
  if (type === 'match') return 'Auto-match alert';
  if (type === 'claim') return 'Claim update';
  if (type === 'contact') return 'Contact message';
  if (type === 'feedback') return 'New feedback';
  if (type === 'system') return 'System update';
  return 'Notification';
}

// Callers pass a User document, a populated ref, or a bare ObjectId. Emails need
// the address, so resolve to a real user record unless one is already in hand.
async function resolveRecipient(user) {
  if (!user) return null;
  if (user.email) return user;
  const id = user._id || user;
  if (!id) return null;
  return User.findById(id).select('name email role').lean();
}

async function sendNotificationEmail(recipient, { type, title, message, link }) {
  const user = await resolveRecipient(recipient);
  if (!user || !user.email) {
    console.warn(`[mail] skipped notification "${title}" - recipient has no email address`);
    return null;
  }
  const { html, text } = renderNotification({
    type: emailTypeLabel(type),
    title,
    message,
    actionUrl: link ? frontendUrl(link) : '',
    actionLabel: link ? 'Open in CampusLost' : '',
  });
  return sendMail({ to: user.email, subject: title, html, text });
}

async function notifyUser({ user, type, title, message, link, items, feedback, email = true }) {
  const notification = await Notification.create({ user, type, title, message, link, items, feedback });
  console.log(`[worker] ${type} -> ${user}: "${title}"`);
  if (email) await sendNotificationEmail(user, { type, title, message, link });
  return notification;
}

// Contact form fan-out: an in-app notification plus a dedicated email per staff member.
async function notifyContactMessage({ recipientRole, recipients = [], sender }) {
  const roleLabel = recipientRole === 'guard' ? 'Security Guard' : 'Administrator';
  const title = `New contact message from ${sender.name}`;
  const detail = [
    `Name: ${sender.name}`,
    `Email: ${sender.email}`,
    sender.mobileNumber ? `Mobile: ${sender.mobileNumber}` : null,
    `Message: "${sender.message}"`,
  ]
    .filter(Boolean)
    .join(' · ');

  const results = await Promise.all(
    recipients.map(async (recipient) => {
      await notifyUser({
        user: recipient._id || recipient,
        type: 'contact',
        title,
        message: detail,
        email: false,
      });

      const user = await resolveRecipient(recipient);
      if (!user || !user.email) return false;

      const { html, text } = renderContactMessage({
        recipientRole,
        recipientName: user.name,
        senderName: sender.name,
        senderEmail: sender.email,
        senderMobile: sender.mobileNumber,
        message: sender.message,
      });
      const info = await sendMail({
        to: user.email,
        subject: `[${roleLabel}] New contact message from ${sender.name}`,
        html,
        text,
        replyTo: sender.email,
      });
      return Boolean(info);
    })
  );

  return { notified: results.length, emailsSent: results.filter(Boolean).length };
}

// Feedback fan-out to admins: in-app notification plus a dedicated email.
const FEEDBACK_ADMIN_LINK = '/admin?section=feedback';

async function notifyNewFeedback({ feedback, recipients = [] }) {
  const title = `New feedback from ${feedback.author?.name || 'a student'}`;
  const detail = [
    `Category: ${feedback.categoryLabel}`,
    `Message: "${feedback.message}"`,
  ].join(' · ');

  const results = await Promise.all(
    recipients.map(async (recipient) => {
      await notifyUser({
        user: recipient._id || recipient,
        type: 'feedback',
        title,
        message: detail,
        link: FEEDBACK_ADMIN_LINK,
        feedback: feedback._id,
        email: false,
      });

      const user = await resolveRecipient(recipient);
      if (!user || !user.email) return false;

      const { html, text } = renderFeedbackReceived({
        recipientName: user.name,
        senderName: feedback.author?.name,
        senderEmail: feedback.author?.email,
        categoryLabel: feedback.categoryLabel,
        message: feedback.message,
        actionUrl: frontendUrl(FEEDBACK_ADMIN_LINK),
      });
      const info = await sendMail({
        to: user.email,
        subject: `New feedback from ${feedback.author?.name || 'a student'}`,
        html,
        text,
        replyTo: feedback.author?.email || undefined,
      });
      return Boolean(info);
    })
  );

  return { notified: results.length, emailsSent: results.filter(Boolean).length };
}

async function notifyClaimUpdate(claim) {
  if (claim.status === 'resolved') {
    return notifyUser({
      user: claim.claimant,
      type: 'claim',
      title: 'Item handed over',
      message: `"${claim.item?.title || 'Your item'}" has been handed over at the security desk. Case closed!`,
      link: '/my-claims',
      items: claim.item?._id ? [claim.item._id] : [],
    });
  }
  const verb = claim.status === 'approved' ? 'was APPROVED' : `was ${claim.status.toUpperCase()}`;
  return notifyUser({
    user: claim.claimant,
    type: 'claim',
    title: `Claim ${claim.status}`,
    message: `Your claim on the item ${verb}. Visit security desk to complete the handover.`,
    link: '/my-claims',
    items: claim.item?._id ? [claim.item._id] : [],
  });
}

async function notifyItemFound(item) {
  if (item.type !== 'found') return null;
  return notifyUser({
    user: item.createdBy,
    type: 'system',
    title: 'Found item registered',
    message: `"${item.title}" is currently hidden from the public feed. Hand it over to the guard room to make it visible and claimable.`,
    link: `/items/${item._id}`,
    items: [item._id],
  });
}

async function notifyDropOffReminder(item) {
  return notifyUser({
    user: item.createdBy,
    type: 'system',
    title: 'Found item awaiting drop-off',
    message: `"${item.title}" still has not been handed over to the guard room. Please drop it off so the owner can claim it — it will not show publicly until then.`,
    link: `/items/${item._id}`,
    items: [item._id],
  });
}

async function notifyItemInVault(item) {
  return notifyUser({
    user: item.createdBy,
    type: 'system',
    title: 'Item now in guard room',
    message: `"${item.title}" was handed over to the guard room and is now visible in the public feed.`,
    link: `/items/${item._id}`,
    items: [item._id],
  });
}

module.exports = {
  notifyUser,
  notifyContactMessage,
  notifyNewFeedback,
  notifyClaimUpdate,
  notifyItemFound,
  notifyDropOffReminder,
  notifyItemInVault,
  sendMail,
};