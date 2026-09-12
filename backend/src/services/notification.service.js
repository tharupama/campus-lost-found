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

module.exports = { notifyUser, notifyClaimUpdate, sendEmail };