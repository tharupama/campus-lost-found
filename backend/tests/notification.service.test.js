const { test } = require('node:test');
const assert = require('node:assert/strict');
const Notification = require('../src/models/Notification.model');
const {
  notifyUser,
  notifyClaimUpdate,
  notifyItemFound,
  notifyItemInVault,
  notifyDropOffReminder,
} = require('../src/services/notification.service');
const { ObjectId } = require('./helpers');

function user() {
  return { _id: new ObjectId(), name: 'Alex', email: 'alex@student.edu', role: 'student' };
}

function claim(status) {
  return {
    status,
    claimant: user(),
    item: { _id: new ObjectId(), title: 'Black wallet' },
  };
}

test('notifyUser stores an in-app notification and emails the recipient', async (t) => {
  const recipient = user();
  const create = t.mock.method(Notification, 'create', async (doc) => ({ _id: new ObjectId(), ...doc }));

  const result = await notifyUser({
    user: recipient,
    type: 'system',
    title: 'Hello',
    message: 'World',
    link: '/items/1',
    items: [new ObjectId()],
  });

  assert.ok(result._id);
  const doc = create.mock.calls[0].arguments[0];
  assert.equal(doc.user, recipient);
  assert.equal(doc.type, 'system');
  assert.equal(doc.title, 'Hello');
  assert.equal(doc.message, 'World');
  assert.equal(doc.link, '/items/1');
  assert.equal(doc.items.length, 1);
});

test('notifyUser can skip the email while still storing the notification', async (t) => {
  const create = t.mock.method(Notification, 'create', async (doc) => doc);

  await notifyUser({ user: user(), type: 'contact', title: 'T', message: 'M', email: false });

  assert.equal(create.mock.callCount(), 1);
});

test('notifyClaimUpdate explains an approved claim', async (t) => {
  const create = t.mock.method(Notification, 'create', async (doc) => doc);

  await notifyClaimUpdate(claim('approved'));

  const doc = create.mock.calls[0].arguments[0];
  assert.equal(doc.type, 'claim');
  assert.equal(doc.title, 'Claim approved');
  assert.match(doc.message, /APPROVED/);
  assert.equal(doc.link, '/my-claims');
});

test('notifyClaimUpdate explains a rejected claim', async (t) => {
  const create = t.mock.method(Notification, 'create', async (doc) => doc);

  await notifyClaimUpdate(claim('rejected'));

  const doc = create.mock.calls[0].arguments[0];
  assert.equal(doc.title, 'Claim rejected');
  assert.match(doc.message, /REJECTED/);
});

test('notifyClaimUpdate reports a completed handover for resolved claims', async (t) => {
  const create = t.mock.method(Notification, 'create', async (doc) => doc);

  await notifyClaimUpdate(claim('resolved'));

  const doc = create.mock.calls[0].arguments[0];
  assert.equal(doc.title, 'Item handed over');
  assert.match(doc.message, /Black wallet/);
  assert.match(doc.message, /Case closed/i);
});

test('notifyItemFound ignores lost reports and notifies finders', async (t) => {
  const create = t.mock.method(Notification, 'create', async (doc) => doc);

  assert.equal(await notifyItemFound({ type: 'lost', title: 'Phone', createdBy: user() }), null);
  assert.equal(create.mock.callCount(), 0);

  const item = {
    _id: new ObjectId(),
    type: 'found',
    title: 'Phone',
    createdBy: user(),
  };
  await notifyItemFound(item);

  assert.equal(create.mock.callCount(), 1);
  const doc = create.mock.calls[0].arguments[0];
  assert.match(doc.title, /found item registered/i);
  assert.equal(doc.link, `/items/${item._id}`);
});

test('notifyItemInVault and notifyDropOffReminder link back to the item', async (t) => {
  const create = t.mock.method(Notification, 'create', async (doc) => doc);
  const item = { _id: new ObjectId(), title: 'Phone', createdBy: user() };

  await notifyItemInVault(item);
  await notifyDropOffReminder(item);

  assert.equal(create.mock.callCount(), 2);
  assert.equal(create.mock.calls[0].arguments[0].link, `/items/${item._id}`);
  assert.equal(create.mock.calls[1].arguments[0].link, `/items/${item._id}`);
  assert.match(create.mock.calls[1].arguments[0].title, /awaiting drop-off/i);
});
