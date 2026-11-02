const { test } = require('node:test');
const assert = require('node:assert/strict');
const Feedback = require('../src/models/Feedback.model');
const User = require('../src/models/User.model');
const Notification = require('../src/models/Notification.model');
const { getContactStaff, sendContactMessage } = require('../src/controllers/contact.controller');
const {
  submitFeedback,
  getMyFeedback,
  getFeedbackSummary,
} = require('../src/controllers/feedback.controller');
const {
  createReq,
  createRes,
  createNext,
  queryChain,
  selectable,
  ObjectId,
} = require('./helpers');

const userId = new ObjectId();

// ---- contact -------------------------------------------------------------

test('getContactStaff separates admins and guards', async (t) => {
  const staff = [
    { role: 'admin', name: 'Ada', email: 'ada@campus.edu' },
    { role: 'guard', name: 'Dana', email: 'dana@campus.edu' },
    { role: 'guard', name: 'Eli', email: 'eli@campus.edu' },
  ];
  t.mock.method(User, 'find', () => queryChain(staff));

  const res = createRes();
  await getContactStaff(createReq(), res, createNext());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.admins.length, 1);
  assert.equal(res.body.guards.length, 2);
});

test('sendContactMessage validates recipient role, name, email and message', async () => {
  const cases = [
    [{ recipientRole: 'student', name: 'A', email: 'a@b.co', message: 'Hello there' }, /admin or a security guard/i],
    [{ recipientRole: 'guard', email: 'a@b.co', message: 'Hello there' }, /name is required/i],
    [{ recipientRole: 'guard', name: 'A', email: 'nope', message: 'Hello there' }, /valid email/i],
    [{ recipientRole: 'guard', name: 'A', email: 'a@b.co', message: 'Hey' }, /at least 5/i],
  ];

  for (const [body, pattern] of cases) {
    const res = createRes();
    await sendContactMessage(createReq({ body }), res, createNext());
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, pattern);
  }
});

test('sendContactMessage notifies every matching staff member', async (t) => {
  const recipients = [
    { _id: new ObjectId(), name: 'Dana', email: 'dana@campus.edu', role: 'guard' },
    { _id: new ObjectId(), name: 'Eli', email: 'eli@campus.edu', role: 'guard' },
  ];
  t.mock.method(User, 'find', () => selectable(recipients));
  const notification = t.mock.method(Notification, 'create', async (doc) => doc);

  const res = createRes();
  await sendContactMessage(
    createReq({
      body: {
        recipientRole: 'GUARD',
        name: ' Sam ',
        email: 'sam@student.edu',
        mobileNumber: '0712345678',
        message: 'I lost my wallet near the library.',
      },
    }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.recipientsNotified, 2);
  assert.equal(res.body.emailsSent, 0);
  assert.match(res.body.message, /notified the guards/i);
  assert.equal(notification.mock.callCount(), 2);
  const payload = notification.mock.calls[0].arguments[0];
  assert.equal(payload.type, 'contact');
  assert.ok(payload.message.includes('Sam'));
  assert.ok(payload.message.includes('sam@student.edu'));
});

// ---- feedback ------------------------------------------------------------

test('submitFeedback validates the category and message length', async () => {
  const cases = [
    [{ category: 'praise', message: 'This is a long enough message' }, /valid category/i],
    [{ category: 'bug', message: 'short' }, /at least 10/i],
  ];

  for (const [body, pattern] of cases) {
    const res = createRes();
    await submitFeedback(createReq({ user: { _id: userId }, body }), res, createNext());
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, pattern);
  }
});

test('submitFeedback stores the feedback and notifies admins', async (t) => {
  const author = { _id: userId, name: 'Sam', email: 'sam@student.edu', role: 'student' };
  t.mock.method(User, 'findById', () => selectable(author));
  const create = t.mock.method(Feedback, 'create', async (doc) => ({
    _id: new ObjectId(),
    ...doc,
  }));
  t.mock.method(User, 'find', () => selectable([]));

  const res = createRes();
  await submitFeedback(
    createReq({
      user: { _id: userId },
      body: { category: 'bug', message: '  The search filter freezes  ' },
    }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 201);
  assert.match(res.body.message, /sent to the admin team/i);
  assert.equal(res.body.emailsSent, 0);
  const doc = create.mock.calls[0].arguments[0];
  assert.equal(doc.category, 'bug');
  assert.equal(doc.message, 'The search filter freezes');
  assert.equal(String(doc.user), String(userId));
});

test('submitFeedback returns 404 when the author no longer exists', async (t) => {
  t.mock.method(User, 'findById', () => selectable(null));

  const res = createRes();
  await submitFeedback(
    createReq({
      user: { _id: userId },
      body: { category: 'bug', message: 'This is a long enough message' },
    }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /account not found/i);
});

test('getMyFeedback filters by the current user', async (t) => {
  const capture = {};
  t.mock.method(Feedback, 'find', (filter) => {
    capture.filter = filter;
    return queryChain([]);
  });
  t.mock.method(Feedback, 'countDocuments', async () => 0);

  const res = createRes();
  await getMyFeedback(createReq({ user: { _id: userId } }), res, createNext());

  assert.equal(String(capture.filter.user), String(userId));
  assert.equal(res.body.pageSize, 10);
});

test('getFeedbackSummary returns the count and labelled category breakdown', async (t) => {
  let call = 0;
  t.mock.method(Feedback, 'aggregate', async () => {
    call += 1;
    if (call === 1) return [{ count: 3 }];
    return [
      { _id: 'bug', count: 2 },
      { _id: 'feature', count: 1 },
    ];
  });

  const res = createRes();
  await getFeedbackSummary(createReq(), res, createNext());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 3);
  assert.deepEqual(res.body.byCategory, [
    { category: 'bug', label: 'Bug report', count: 2 },
    { category: 'feature', label: 'Feature request', count: 1 },
  ]);
});
