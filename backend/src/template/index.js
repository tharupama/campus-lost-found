const fs = require('fs');
const path = require('path');

const FORGOT_HTML = fs.readFileSync(path.join(__dirname, 'forgot-password.html'), 'utf8');
const NOTIFICATION_HTML = fs.readFileSync(path.join(__dirname, 'notification.html'), 'utf8');

function fill(tpl, vars) {
  let out = tpl.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) =>
    vars[key] ? fill(inner, vars) : ''
  );
  out = out.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : ''
  );
  return out;
}

function brand() {
  return process.env.SENDER_NAME || 'CampusLost';
}

function baseVars(extra = {}) {
  return { brand: brand(), year: new Date().getFullYear(), ...extra };
}

function renderForgotPassword({ name, resetUrl, expiryHours = 1 }) {
  return fill(FORGOT_HTML, {
    ...baseVars(),
    name: name || 'there',
    resetUrl: resetUrl || '',
    expiryHours,
    supportEmail: process.env.SENDER_EMAIL || 'help@campuslost.local',
  });
}

function renderNotification({ type = 'Notification', title, message, actionUrl, actionLabel }) {
  return fill(NOTIFICATION_HTML, {
    ...baseVars(),
    type: type || 'Notification',
    title: title || '',
    message: message || '',
    actionLink: Boolean(actionUrl),
    actionUrl: actionUrl || '',
    actionLabel: actionLabel || 'View details',
  });
}

module.exports = { renderForgotPassword, renderNotification };