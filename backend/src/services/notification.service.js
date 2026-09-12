const nodemailer = require('nodemailer');
const Notification = require('../models/Notification.model');

async function notifyUser({ user, type, title, message, link, items }) {
  const notification = await Notification.create({ user, type, title, message, link, items });
  console.log(`[worker] ${type} -> ${user}: "${title}"`);
  return notification;
}

async function notifyClaimUpdate(claim) {
  if (claim.status === 'resolved') {
    return notifyUser({
      user: claim.claimant,
      type: 'claim',
      title: 'Item handed over',
      message: `“${claim.item?.title || 'Your item'}” has been handed over at the security desk. Case closed!`,
      link: '/my-claims',
    });
  }
  const verb = claim.status === 'approved' ? 'was APPROVED' : `was ${claim.status.toUpperCase()}`;
  return notifyUser({
    user: claim.claimant,
    type: 'claim',
    title: `Claim ${claim.status}`,
    message: `Your claim on the item ${verb}. Visit security desk to complete the handover.`,
    link: '/my-claims',
  });
}

function sendEmail(to, subject, html) {
  if (!process.env.SMTP_HOST) return null;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
}

async function notifyItemFound(item) {
  if (item.type !== 'found') return null;
  return notifyUser({
    user: item.createdBy,
    type: 'system',
    title: 'Found item registered',
    message: `“${item.title}” is currently hidden from the public feed. Hand it over to the guard room to make it visible and claimable.`,
    link: `/items/${item._id}`,
    items: [item._id],
  });
}

async function notifyDropOffReminder(item) {
  return notifyUser({
    user: item.createdBy,
    type: 'system',
    title: 'Found item awaiting drop-off',
    message: `“${item.title}” still hasn\u2019t been handed over to the guard room. Please drop it off so the owner can claim it — it won\u2019t show publicly until then.`,
    link: `/items/${item._id}`,
    items: [item._id],
  });
}

async function notifyItemInVault(item) {
  return notifyUser({
    user: item.createdBy,
    type: 'system',
    title: 'Item now in guard room',
    message: `“${item.title}” was handed over to the guard room and is now visible in the public feed.`,
    link: `/items/${item._id}`,
    items: [item._id],
  });
}

module.exports = { notifyUser, notifyClaimUpdate, sendEmail, notifyItemFound, notifyDropOffReminder, notifyItemInVault };