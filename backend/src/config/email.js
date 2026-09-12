const nodemailer = require('nodemailer');

let transporter = null;
let lastConfig = '';

function configKey() {
  return [
    process.env.EMAIL_HOST || process.env.SMTP_HOST || '',
    process.env.EMAIL_PORT || process.env.SMTP_PORT || 587,
    process.env.EMAIL_USERNAME || process.env.SMTP_USER || '',
    Boolean(process.env.EMAIL_PASSWORD || process.env.SMTP_PASS),
    process.env.SENDER_EMAIL,
    process.env.SENDER_NAME,
  ].join('|');
}

function createTransporter() {
  const key = configKey();
  if (!process.env.EMAIL_HOST && !process.env.SMTP_HOST) {
    transporter = null;
    return null;
  }
  if (transporter && lastConfig === key) return transporter;
  lastConfig = key;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST,
    port: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_USERNAME || process.env.SMTP_USER,
      pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  try {
    const t = createTransporter();
    if (!t) {
      console.log(`[mail] SKIPPED (no SMTP configured) -> ${to}: "${subject}"`);
      return null;
    }
    const senderEmail = process.env.SENDER_EMAIL || 'no-reply@campuslost.local';
    const senderName = process.env.SENDER_NAME || 'CampusLost';
    const from = `"${senderName}" <${senderEmail}>`;
    const info = await t.sendMail({ from, to, subject, html, text });
    console.log(`[mail] sent -> ${to}: "${subject}" (${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[mail] failed -> ${to}: ${err.message}`);
    return null;
  }
}

module.exports = { sendMail, createTransporter };