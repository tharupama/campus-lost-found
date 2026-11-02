const { test } = require('node:test');
const assert = require('node:assert/strict');
const Item = require('../src/models/Item.model');
const Notification = require('../src/models/Notification.model');
const { runMatchEngine, MIN_SCORE } = require('../src/services/matchEngine.service');
const { ObjectId } = require('./helpers');

const DAY = 24 * 60 * 60 * 1000;

function candidate(overrides = {}) {
  const now = Date.now();
  return {
    _id: new ObjectId(),
    category: 'Electronics',
    location: 'Library',
    date: new Date(now - DAY),
    title: 'black phone',
    description: 'cracked screen',
    createdBy: { _id: new ObjectId(), name: 'Alex', email: 'alex@student.edu' },
    ...overrides,
  };
}

function found(overrides = {}) {
  return {
    _id: new ObjectId(),
    category: 'Electronics',
    location: 'Library',
    date: new Date(),
    title: 'black phone',
    description: 'cracked screen',
    ...overrides,
  };
}

function stubCandidates(t, candidates) {
  const capture = {};
  t.mock.method(Item, 'find', (filter) => {
    capture.filter = filter;
    return { populate: async () => candidates };
  });
  return capture;
}

test('MIN_SCORE is 60', () => {
  assert.equal(MIN_SCORE, 60);
});

test('a perfect category/location/time/keyword match scores 100 and notifies the owner', async (t) => {
  const lost = candidate({ title: 'black leather wallet', description: '' });
  const foundItem = found({ title: 'black leather wallet', description: '' });
  stubCandidates(t, [lost]);
  const notification = t.mock.method(Notification, 'create', async (doc) => doc);

  const matches = await runMatchEngine(foundItem);

  assert.equal(matches.length, 1);
  assert.equal(matches[0].score, 100);
  assert.equal(String(matches[0].lostItemId), String(lost._id));
  assert.equal(String(matches[0].foundItemId), String(foundItem._id));
  assert.equal(notification.mock.callCount(), 1);

  const payload = notification.mock.calls[0].arguments[0];
  assert.equal(payload.type, 'match');
  assert.equal(String(payload.user._id), String(lost.createdBy._id));
  assert.match(payload.title, /potential match/i);
  assert.ok(payload.message.includes(lost.title));
  assert.ok(payload.message.includes(foundItem.title));
  assert.ok(payload.message.includes('100/100'));
  assert.deepEqual(payload.items.map(String), [String(lost._id), String(foundItem._id)]);
  assert.equal(payload.link, `/items/${foundItem._id}`);
});

test('a candidate exactly at the threshold still matches', async (t) => {
  const lost = candidate({
    category: 'Electronics',
    location: 'Library',
    date: new Date(Date.now() - 30 * DAY),
    title: 'unrelated gadget',
    description: 'nothing in common',
  });
  stubCandidates(t, [lost]);
  t.mock.method(Notification, 'create', async (doc) => doc);

  const matches = await runMatchEngine(found({ title: 'black phone', description: 'cracked screen' }));

  assert.equal(matches.length, 1);
  assert.equal(matches[0].score, 65);
});

test('a candidate below the threshold produces no match and no notification', async (t) => {
  const lost = candidate({
    category: 'Books',
    location: 'Library',
    date: new Date(Date.now() - 30 * DAY),
    title: 'unrelated gadget',
    description: 'nothing in common',
  });
  stubCandidates(t, [lost]);
  const notification = t.mock.method(Notification, 'create', async (doc) => doc);

  const matches = await runMatchEngine(found());

  assert.deepEqual(matches, []);
  assert.equal(notification.mock.callCount(), 0);
});

test('time proximity contributes 20, 12, 6 or 0 points', async (t) => {
  const now = Date.now();
  const cases = [
    { days: 1, expected: 100 },
    { days: 5, expected: 92 },
    { days: 10, expected: 86 },
    { days: 20, expected: 80 },
  ];

  for (const { days, expected } of cases) {
    const lost = candidate({
      _id: new ObjectId(),
      date: new Date(now - days * DAY),
      title: 'black leather wallet',
      description: '',
    });
    const foundItem = found({ title: 'black leather wallet', description: '' });
    stubCandidates(t, [lost]);
    t.mock.method(Notification, 'create', async (doc) => doc);

    const matches = await runMatchEngine(foundItem);
    assert.equal(matches[0].score, expected, `${days} day(s) should score ${expected}`);
  }
});

test('keyword score is capped at 15 points', async (t) => {
  const words = 'alpha bravo charlie delta echo foxtrot';
  const lost = candidate({ title: words, description: '' });
  const foundItem = found({ title: words, description: '' });
  stubCandidates(t, [lost]);
  t.mock.method(Notification, 'create', async (doc) => doc);

  const matches = await runMatchEngine(foundItem);
  assert.equal(matches[0].score, 100);
});

test('only recent active lost reports at the same location are considered', async (t) => {
  const capture = stubCandidates(t, []);
  t.mock.method(Notification, 'create', async (doc) => doc);

  await runMatchEngine(found({ location: 'Cafeteria' }));

  const filter = capture.filter;
  assert.equal(filter.type, 'lost');
  assert.equal(filter.status, 'active');
  assert.equal(filter.location, 'Cafeteria');
  assert.ok(filter.date.$gte instanceof Date);

  const ageDays = (Date.now() - filter.date.$gte.getTime()) / DAY;
  assert.ok(ageDays >= 20.9 && ageDays <= 21.1, `expected a 21-day window, got ${ageDays}`);
});

test('each matching lost report gets its own notification', async (t) => {
  const first = candidate({ _id: new ObjectId(), title: 'black leather wallet', description: '' });
  const second = candidate({ _id: new ObjectId(), title: 'black leather wallet', description: '' });
  stubCandidates(t, [first, second]);
  const notification = t.mock.method(Notification, 'create', async (doc) => doc);

  const matches = await runMatchEngine(found({ title: 'black leather wallet', description: '' }));

  assert.equal(matches.length, 2);
  assert.equal(notification.mock.callCount(), 2);
});
