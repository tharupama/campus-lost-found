const fs = require('fs');
const path = require('path');
const {
  renderForgotPassword,
  renderOtp,
  renderNotification,
  renderContactMessage,
  renderFeedbackReceived,
} = require('../src/templates');

const outDir = path.join(__dirname, '..', 'emails-preview');
fs.mkdirSync(outDir, { recursive: true });

const samples = {
  'otp.html': renderOtp({ name: 'Alex', otp: '482913', expiryMinutes: 10 }),
  'forgot-password.html': renderForgotPassword({
    name: 'Alex',
    resetUrl: 'https://example.test/reset/abc',
    expiryHours: 1,
  }),
  'notification.html': renderNotification({
    type: 'Claim update',
    title: 'Your claim was approved',
    message: 'A guard approved your claim for the black wallet found near the library.',
    actionUrl: 'https://example.test/claims/1',
    actionLabel: 'View claim',
  }),
  'contact-message.html': renderContactMessage({
    recipientRole: 'guard',
    recipientName: 'Dana',
    senderName: 'Sam Carter',
    senderEmail: 'sam@example.test',
    senderMobile: '0712345678',
    message: 'I lost my wallet near the library yesterday evening.\n\nIt is brown leather with a student ID inside.',
  }),
  'feedback-received.html': renderFeedbackReceived({
    recipientName: 'Admin',
    senderName: 'Sam Carter',
    senderEmail: 'sam@example.test',
    categoryLabel: 'Bug report',
    message: 'The search filter freezes sometimes when I type too fast.',
    actionUrl: 'https://example.test/feedback/1',
  }),
};

for (const [file, rendered] of Object.entries(samples)) {
  fs.writeFileSync(path.join(outDir, file), rendered.html, 'utf8');
}

const index = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Email previews</title>
<style>
  body { font-family: system-ui, sans-serif; background:#f1f5f9; margin:0; padding:32px; }
  h1 { font-size:18px; color:#5c100b; }
  ul { list-style:none; padding:0; }
  li { margin:8px 0; }
  a { color:#ad3a20; font-weight:600; text-decoration:none; }
  a:hover { text-decoration:underline; }
</style></head>
<body>
  <h1>Email template previews</h1>
  <ul>
    ${Object.keys(samples)
      .map((file) => `<li><a href="${file}" target="_blank">${file}</a></li>`)
      .join('\n    ')}
  </ul>
</body>
</html>`;
fs.writeFileSync(path.join(outDir, 'index.html'), index, 'utf8');

console.log(`Preview emails written to ${outDir}`);
console.log('Open index.html in your browser to view them.');
