const Notification = require('../models/Notification.model');
const { sendMail } = require('../config/email');
const { renderNotification } = require('../template');

function frontendUrl(link = '') {
  const base = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  return link ? `${base}${link}` : base;
}

function emailTypeLabel(type) {
  if (type === 'match') return 'Auto-match alert';
  if (type === 'claim') return 'Claim update';
  if (type === 'system') return 'System update';
  return 'Notification';
}

function sendNotificationEmail(user, { title, message, link }) {
  if (!user || !user.email) return null;
  const html = renderNotification({
    type: 'System',
    title,
    message,
    actionUrl: link ? frontendUrl(link) : '',
    actionLabel: link ? 'Open in CampusLost' : '',
  });
  return sendMail({ to: user.email, subject: title, html }).catch(() => null);
}

async function notifyUser({ user, type, title, message, link, items }) {
  const notification = await Notification.create({ user, type, title, message, link, items });
  console.log(`[worker] ${type} -> ${user}: "${title}"`);
  sendNotificationEmail(user, { title, message, link });
  return notification;
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
  notifyClaimUpdate,
  notifyItemFound,
  notifyDropOffReminder,
  notifyItemInVault,
  sendMail,
};