const { test } = require('node:test');
const assert = require('node:assert/strict');
const Item = require('../src/models/Item.model');
const Notification = require('../src/models/Notification.model');
const { checkPendingDropOffs } = require('../src/services/reminder.service');
const { ObjectId } = require('./helpers');

function foundItem(overrides = {}) {
  const item = {
    _id: new ObjectId(),
    type: 'found',
    status: 'active',
    handoverStatus: 'pending',
    title: 'Blue backpack',
    createdBy: { _id: new ObjectId(), name: 'Sam', email: 'sam@student.edu' },
    save: async () => item,
    ...overrides,
  };
  return item;
}

test('checkPendingDropOffs is a no-op on Vercel', async (t) => {
  const previous = process.env.VERCEL;
  process.env.VERCEL = '1';
  t.after(() => {
    if (previous === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
  });
  const find = t.mock.method(Item, 'find', () => {
    throw new Error('should not query on Vercel');
  });

  assert.equal(await checkPendingDropOffs(), 0);
  assert.equal(find.mock.callCount(), 0);
});

test('checkPendingDropOffs queries only active, pending found items older than the window', async (t) => {
  const capture = {};
  t.mock.method(Item, 'find', (filter) => {
    capture.filter = filter;
    return { populate: async () => [] };
  });

  const sent = await checkPendingDropOffs();

  assert.equal(sent, 0);
  assert.equal(capture.filter.type, 'found');
  assert.equal(capture.filter.status, 'active');
  assert.equal(capture.filter.handoverStatus, 'pending');
  assert.ok(capture.filter.createdAt.$lte instanceof Date);
  assert.ok(Array.isArray(capture.filter.$or));
  assert.deepEqual(capture.filter.$or[0], { lastReminderAt: null });
  assert.ok(capture.filter.$or[1].lastReminderAt.$lte instanceof Date);
});

test('checkPendingDropOffs reminds each finder and stamps lastReminderAt', async (t) => {
  const first = foundItem();
  const second = foundItem({ title: 'Umbrella' });
  t.mock.method(Item, 'find', () => ({ populate: async () => [first, second] }));
  const notification = t.mock.method(Notification, 'create', async (doc) => doc);

  const sent = await checkPendingDropOffs();

  assert.equal(sent, 2);
  assert.equal(notification.mock.callCount(), 2);
  assert.ok(first.lastReminderAt instanceof Date);
  assert.ok(second.lastReminderAt instanceof Date);
  assert.match(notification.mock.calls[0].arguments[0].title, /awaiting drop-off/i);
});

test('checkPendingDropOffs skips items whose finder account is gone', async (t) => {
  const orphan = foundItem({ createdBy: null });
  t.mock.method(Item, 'find', () => ({ populate: async () => [orphan] }));
  const notification = t.mock.method(Notification, 'create', async (doc) => doc);

  const sent = await checkPendingDropOffs();

  assert.equal(sent, 0);
  assert.equal(notification.mock.callCount(), 0);
  assert.equal(orphan.lastReminderAt, undefined);
});
