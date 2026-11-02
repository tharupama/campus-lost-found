const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Types } = require('mongoose');
const Item = require('../src/models/Item.model');
const User = require('../src/models/User.model');
const Claim = require('../src/models/Claim.model');
const Notification = require('../src/models/Notification.model');
const Feedback = require('../src/models/Feedback.model');
const RegistrationOtp = require('../src/models/RegistrationOtp.model');
const TrustedDevice = require('../src/models/TrustedDevice.model');

const userId = new Types.ObjectId();

function validItem(overrides = {}) {
  return new Item({
    title: 'Black leather wallet',
    type: 'lost',
    category: 'Accessories',
    location: 'Library',
    date: new Date('2026-01-01'),
    createdBy: userId,
    ...overrides,
  });
}

function errorsOf(document) {
  const error = document.validateSync();
  return error ? Object.keys(error.errors) : [];
}

test('Item requires title, type, category, location, date and createdBy', () => {
  const errors = errorsOf(new Item({}));
  for (const field of ['title', 'type', 'category', 'location', 'date', 'createdBy']) {
    assert.ok(errors.includes(field), `expected a validation error for ${field}`);
  }
});

test('Item rejects unknown type and status values', () => {
  assert.ok(errorsOf(validItem({ type: 'stolen' })).includes('type'));
  assert.ok(errorsOf(validItem({ status: 'archived' })).includes('status'));
  assert.ok(errorsOf(validItem({ handoverStatus: 'lost' })).includes('handoverStatus'));
});

test('Item applies safe defaults', () => {
  const item = validItem();
  assert.equal(item.status, 'active');
  assert.equal(item.handoverStatus, 'pending');
  assert.equal(item.expiresAt, null);
  assert.equal(item.claimedBy, null);
  assert.equal(item.validateSync(), undefined);
});

test('Item trims title and enforces the maximum title length', () => {
  assert.equal(validItem({ title: '  Phone  ' }).title, 'Phone');
  assert.ok(errorsOf(validItem({ title: 'x'.repeat(121) })).includes('title'));
  assert.ok(errorsOf(validItem({ description: 'x'.repeat(1001) })).includes('description'));
});

test('Item hides secretFeature from queries by default', () => {
  const path = Item.schema.path('secretFeature');
  assert.equal(path.options.select, false);
});

test('User requires a name, email and password', () => {
  const errors = errorsOf(new User({}));
  for (const field of ['name', 'email', 'password']) {
    assert.ok(errors.includes(field), `expected a validation error for ${field}`);
  }
});

test('User normalises email and applies role / verification defaults', () => {
  const user = new User({ name: 'Alex', email: 'ALEX@STUDENT.EDU', password: 'secret1' });
  assert.equal(user.email, 'alex@student.edu');
  assert.equal(user.role, 'student');
  assert.equal(user.isVerified, false);
  assert.equal(user.twoFactorEnabled, false);
  assert.equal(user.validateSync(), undefined);
});

test('User rejects invalid roles and short passwords', () => {
  assert.ok(errorsOf(new User({ name: 'A', email: 'a@b.co', password: 'secret1', role: 'superadmin' })).includes('role'));
  assert.ok(errorsOf(new User({ name: 'A', email: 'a@b.co', password: '123' })).includes('password'));
});

test('User hides passwords and two-factor secrets from queries', () => {
  for (const field of [
    'password',
    'twoFactorSecret',
    'twoFactorPendingSecret',
    'twoFactorRecoveryCodes',
    'twoFactorLastStep',
  ]) {
    assert.equal(User.schema.path(field).options.select, false, `${field} should not be selected`);
  }
});

test('Claim requires an item, claimant, contact number and proof answer', () => {
  const errors = errorsOf(new Claim({}));
  for (const field of ['item', 'claimant', 'contactNumber', 'proofAnswer']) {
    assert.ok(errors.includes(field), `expected a validation error for ${field}`);
  }
});

test('Claim defaults to pending and rejects unknown statuses', () => {
  const valid = new Claim({
    item: new Types.ObjectId(),
    claimant: new Types.ObjectId(),
    contactNumber: '0712345678',
    proofAnswer: 'Scratch on the back',
  });
  assert.equal(valid.status, 'pending');
  assert.equal(valid.validateSync(), undefined);

  valid.status = 'lost';
  assert.ok(errorsOf(valid).includes('status'));
});

test('Notification requires a user, title and message', () => {
  const errors = errorsOf(new Notification({}));
  for (const field of ['user', 'title', 'message']) {
    assert.ok(errors.includes(field), `expected a validation error for ${field}`);
  }
});

test('Notification defaults to an unread system notification', () => {
  const notification = new Notification({
    user: userId,
    title: 'Match found',
    message: 'We found something',
  });
  assert.equal(notification.type, 'system');
  assert.equal(notification.read, false);
  assert.equal(notification.validateSync(), undefined);

  notification.type = 'spam';
  assert.ok(errorsOf(notification).includes('type'));
});

test('Feedback defaults to the other category and new status', () => {
  const feedback = new Feedback({ user: userId, message: 'The filter is confusing' });
  assert.equal(feedback.category, 'other');
  assert.equal(feedback.status, 'new');
  assert.equal(feedback.reviewedBy, null);
  assert.equal(feedback.validateSync(), undefined);
});

test('Feedback rejects invalid categories/statuses and enforces message length', () => {
  const base = { user: userId, message: 'A valid message' };
  assert.ok(errorsOf(new Feedback({ ...base, category: 'praise' })).includes('category'));
  assert.ok(errorsOf(new Feedback({ ...base, status: 'closed' })).includes('status'));
  assert.ok(errorsOf(new Feedback({ ...base, message: 'x'.repeat(2001) })).includes('message'));
});

test('RegistrationOtp normalises email and starts unverified', () => {
  const otp = new RegistrationOtp({ email: 'NEW@STUDENT.EDU' });
  assert.equal(otp.email, 'new@student.edu');
  assert.equal(otp.attempts, 0);
  assert.equal(otp.otpVerified, false);
  assert.equal(otp.otpHash, null);
});

test('TrustedDevice requires a user, token hash and expiry date', () => {
  const errors = errorsOf(new TrustedDevice({}));
  for (const field of ['user', 'tokenHash', 'expiresAt']) {
    assert.ok(errors.includes(field), `expected a validation error for ${field}`);
  }
});
