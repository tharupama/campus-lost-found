const fs = require('fs');
const path = require('path');

const cache = new Map();

function load(name) {
  if (!cache.has(name)) {
    cache.set(name, fs.readFileSync(path.join(__dirname, name), 'utf8'));
  }
  return cache.get(name);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function paragraphs(value) {
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n/g, '<br />'))
    .join('</p><p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#475569;">');
}

// Single pass so values injected here are never rescanned as template syntax.
const TOKEN = /\{\{\{(\w+)\}\}\}|\{\{>(\w+)\}\}|\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\3\}\}|\{\{(\w+)\}\}/g;

function fill(source, vars) {
  return source.replace(TOKEN, (match, raw, partial, blockKey, blockBody, varKey) => {
    if (partial) return fill(load(`partials/${partial}.html`), vars);
    if (blockKey) return vars[blockKey] ? fill(blockBody, vars) : '';
    if (raw) {
      const value = vars[raw];
      return value === undefined ? '' : String(value);
    }
    const value = vars[varKey];
    return value === undefined || value === null ? '' : escapeHtml(value);
  });
}

function brandName() {
  return process.env.SENDER_NAME || 'CampusLost';
}

function baseVars(extra = {}) {
  return {
    brand: brandName(),
    year: new Date().getFullYear(),
    supportEmail: process.env.SENDER_EMAIL || 'help@campuslost.local',
    ...extra,
  };
}

function renderForgotPassword({ name, resetUrl, expiryHours = 1 }) {
  const vars = baseVars({ name: name || 'there', resetUrl: resetUrl || '', expiryHours });
  return {
    html: fill(load('forgot-password.html'), vars),
    text: `Hi ${vars.name},\n\nWe received a request to reset the password for your account. Open the link below to choose a new password. It is valid for the next ${expiryHours} hour(s).\n\n${vars.resetUrl}\n\nIf you didn't request this, you can safely ignore this email - your password will stay the same.`,
  };
}

function renderNotification({ type = 'Notification', title, message, actionUrl, actionLabel }) {
  const vars = baseVars({
    type: type || 'Notification',
    title: title || '',
    message: message || '',
    actionLink: Boolean(actionUrl),
    actionUrl: actionUrl || '',
    actionLabel: actionLabel || 'View details',
  });
  const action = actionUrl ? `\n\n${vars.actionUrl}` : '';
  return {
    html: fill(load('notification.html'), vars),
    text: `${vars.type}\n\n${vars.title}\n\n${vars.message}${action}`,
  };
}

function renderContactMessage({ recipientRole, recipientName, senderName, senderEmail, senderMobile, message }) {
  const roleLabel = recipientRole === 'guard' ? 'Security Guard' : 'Administrator';
  const vars = baseVars({
    pageTitle: `New contact message from a student - ${brandName()}`,
    roleLabel,
    greetingName: recipientName || 'there',
    senderName: senderName || 'Unknown sender',
    senderEmail: senderEmail || '',
    senderMobile: senderMobile || '',
    hasSenderMobile: Boolean(senderMobile),
    messageText: message || '',
    messageHtml: paragraphs(message || ''),
  });
  return {
    html: fill(load('contact-message.html'), vars),
    text: [
      `${roleLabel} alert - new contact message`,
      '',
      `From: ${vars.senderName}`,
      `Email: ${vars.senderEmail}`,
      ...(vars.hasSenderMobile ? [`Mobile: ${vars.senderMobile}`] : []),
      '',
      'Message:',
      vars.messageText,
    ].join('\n'),
  };
}

function renderFeedbackReceived({ recipientName, senderName, senderEmail, categoryLabel, message, actionUrl }) {
  const vars = baseVars({
    pageTitle: `New feedback - ${brandName()}`,
    greetingName: recipientName || 'there',
    senderName: senderName || 'Unknown sender',
    senderEmail: senderEmail || '',
    categoryLabel: categoryLabel || 'Other',
    actionUrl: actionUrl || '',
    messageText: message || '',
    messageHtml: paragraphs(message || ''),
  });
  const text = [
    'New feedback',
    '',
    `From: ${vars.senderName}`,
    `Email: ${vars.senderEmail}`,
    `Category: ${vars.categoryLabel}`,
    '',
    'Message:',
    vars.messageText,
  ];
  if (vars.actionUrl) text.push('', vars.actionUrl);
  return { html: fill(load('feedback-received.html'), vars), text: text.join('\n') };
}

module.exports = { renderForgotPassword, renderNotification, renderContactMessage, renderFeedbackReceived, escapeHtml };
