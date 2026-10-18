const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  renderForgotPassword,
  renderOtp,
  renderNotification,
  renderContactMessage,
  renderFeedbackReceived,
} = require('../src/templates');

const BRAND_COLORS = ['#ad3a20', '#d55a3c', '#5c100b', '#fdf4f3'];
const OLD_COLORS = ['#4f46e5', '#7c3aed', '#eef2ff', '#1e1b4b', '#8b5cf6', '#c7d2fe'];

function renderAll() {
  return {
    otp: renderOtp({ name: 'Alex', otp: '482913', expiryMinutes: 10 }).html,
    forgotPassword: renderForgotPassword({
      name: 'Alex',
      resetUrl: 'https://example.test/reset/abc',
      expiryHours: 1,
    }).html,
    notification: renderNotification({
      type: 'Claim update',
      title: 'Your claim was approved',
      message: 'A guard approved your claim.',
      actionUrl: 'https://example.test/claims/1',
      actionLabel: 'View claim',
    }).html,
    contactMessage: renderContactMessage({
      recipientRole: 'guard',
      recipientName: 'Dana',
      senderName: 'Sam',
      senderEmail: 'sam@example.test',
      senderMobile: '0712345678',
      message: 'I lost my wallet near the library.',
    }).html,
    feedbackReceived: renderFeedbackReceived({
      recipientName: 'Admin',
      senderName: 'Sam',
      senderEmail: 'sam@example.test',
      categoryLabel: 'Bug report',
      message: 'The search filter freezes sometimes.',
      actionUrl: 'https://example.test/feedback/1',
    }).html,
  };
}

test('every template renders without leftover template syntax', () => {
  for (const [name, html] of Object.entries(renderAll())) {
    assert.ok(html.length > 500, `${name} rendered HTML looks too small`);
    assert.ok(!/\{\{[^}]+\}\}/.test(html), `${name} still contains unrendered {{ }} tokens`);
  }
});

test('every template uses the website brand colors', () => {
  for (const [name, html] of Object.entries(renderAll())) {
    for (const color of BRAND_COLORS) {
      assert.ok(html.includes(color), `${name} is missing brand color ${color}`);
    }
  }
});

test('no template uses the old indigo/violet theme', () => {
  for (const [name, html] of Object.entries(renderAll())) {
    for (const color of OLD_COLORS) {
      assert.ok(!html.includes(color), `${name} still contains old color ${color}`);
    }
  }
});

test('otp email shows the code and expiry', () => {
  const { html } = renderOtp({ name: 'Alex', otp: '482913', expiryMinutes: 15 });
  assert.ok(html.includes('482913'));
  assert.ok(html.includes('15 minutes'));
  assert.ok(html.includes('Hi Alex'));
});

test('forgot-password email includes reset button and link', () => {
  const { html } = renderForgotPassword({
    name: 'Alex',
    resetUrl: 'https://example.test/reset/abc',
    expiryHours: 2,
  });
  assert.ok(html.includes('https://example.test/reset/abc'));
  assert.ok(html.includes('Reset password'));
  assert.ok(html.includes('2 hour(s)'));
});

test('notification email includes title, message and action button', () => {
  const html = renderNotification({
    type: 'Claim update',
    title: 'Your claim was approved',
    message: 'A guard approved your claim.',
    actionUrl: 'https://example.test/claims/1',
    actionLabel: 'View claim',
  }).html;
  assert.ok(html.includes('Your claim was approved'));
  assert.ok(html.includes('A guard approved your claim.'));
  assert.ok(html.includes('View claim'));
});

test('notification email omits button when there is no action url', () => {
  const html = renderNotification({
    type: 'Reminder',
    title: 'Item marked as found',
    message: 'Nice work!',
  }).html;
  assert.ok(!html.includes('View details'));
});

test('contact-message email shows sender details and escapes HTML', () => {
  const html = renderContactMessage({
    recipientRole: 'guard',
    recipientName: 'Dana',
    senderName: 'Sam <script>',
    senderEmail: 'sam@example.test',
    senderMobile: '0712345678',
    message: 'I lost my wallet & keys',
  }).html;
  assert.ok(html.includes('Security Guard alert'));
  assert.ok(html.includes('sam@example.test'));
  assert.ok(html.includes('0712345678'));
  assert.ok(!html.includes('<script>'), 'sender name must be HTML-escaped');
  assert.ok(html.includes('I lost my wallet &amp; keys'));
});

test('contact-message email hides mobile row when no mobile provided', () => {
  const html = renderContactMessage({
    recipientRole: 'admin',
    senderName: 'Sam',
    senderEmail: 'sam@example.test',
    message: 'Hello',
  }).html;
  assert.ok(html.includes('Administrator alert'));
  assert.ok(!html.includes('Mobile'));
});

test('feedback email shows category, sender and message', () => {
  const html = renderFeedbackReceived({
    recipientName: 'Admin',
    senderName: 'Sam',
    senderEmail: 'sam@example.test',
    categoryLabel: 'Bug report',
    message: 'The search filter freezes sometimes.',
    actionUrl: 'https://example.test/feedback/1',
  }).html;
  assert.ok(html.includes('Bug report'));
  assert.ok(html.includes('Sam sent feedback'));
  assert.ok(html.includes('Review in CampusLost'));
  assert.ok(html.includes('The search filter freezes sometimes.'));
});

test('text fallbacks are generated for every email', () => {
  assert.ok(renderOtp({ name: 'Alex', otp: '482913' }).text.includes('482913'));
  assert.ok(
    renderForgotPassword({ name: 'Alex', resetUrl: 'https://x.test/r' }).text.includes('https://x.test/r')
  );
  assert.ok(
    renderNotification({ title: 'T', message: 'M' }).text.includes('T'),
    'notification text should include the title'
  );
});
