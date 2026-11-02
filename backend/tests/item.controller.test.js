const { test } = require('node:test');
const assert = require('node:assert/strict');
const Item = require('../src/models/Item.model');
const Notification = require('../src/models/Notification.model');
const {
  getItems,
  getItem,
  getMyItems,
  createItem,
} = require('../src/controllers/item.controller');
const { createReq, createRes, createNext, queryChain, ObjectId } = require('./helpers');

const userId = new ObjectId();

test('getItems applies the public feed defaults', async (t) => {
  const capture = {};
  t.mock.method(Item, 'find', (filter) => {
    capture.filter = filter;
    return queryChain([{ title: 'Wallet' }]);
  });
  t.mock.method(Item, 'countDocuments', async () => 1);

  const res = createRes();
  await getItems(createReq(), res, createNext());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.page, 1);
  assert.equal(res.body.pageSize, 12);
  assert.equal(res.body.totalPages, 1);
  assert.deepEqual(capture.filter.status, { $in: ['active', 'claimed'] });
  assert.deepEqual(capture.filter.$and[0], {
    $or: [{ type: { $ne: 'found' } }, { handoverStatus: 'in_vault' }],
  });
});

test('getItems respects explicit type filters without adding a status default', async (t) => {
  const capture = {};
  t.mock.method(Item, 'find', (filter) => {
    capture.filter = filter;
    return queryChain([]);
  });
  t.mock.method(Item, 'countDocuments', async () => 0);

  const res = createRes();
  await getItems(createReq({ query: { type: 'lost' } }), res, createNext());

  assert.equal(capture.filter.type, 'lost');
  assert.equal(capture.filter.status, undefined);
});

test('getItems builds a case-insensitive search across title, description and category', async (t) => {
  const capture = {};
  t.mock.method(Item, 'find', (filter) => {
    capture.filter = filter;
    return queryChain([]);
  });
  t.mock.method(Item, 'countDocuments', async () => 0);

  await getItems(createReq({ query: { search: 'wallet' } }), createRes(), createNext());

  assert.equal(capture.filter.$and.length, 2);
  const searchClause = capture.filter.$and[1];
  assert.equal(searchClause.$or.length, 3);
  assert.deepEqual(searchClause.$or[0], { title: { $regex: 'wallet', $options: 'i' } });
  assert.deepEqual(searchClause.$or[1], { description: { $regex: 'wallet', $options: 'i' } });
  assert.deepEqual(searchClause.$or[2], { category: { $regex: 'wallet', $options: 'i' } });
});

test('getItems clamps the page size to 60', async (t) => {
  t.mock.method(Item, 'find', () => queryChain([]));
  t.mock.method(Item, 'countDocuments', async () => 0);

  const res = createRes();
  await getItems(createReq({ query: { pageSize: '500' } }), res, createNext());

  assert.equal(res.body.pageSize, 60);
});

test('getItem hides the secret feature from anonymous users but reports whether one exists', async (t) => {
  const capture = {};
  t.mock.method(Item, 'findById', () => queryChain({ _id: '1', title: 'Wallet', secretFeature: 'Sticker inside' }, capture));

  const res = createRes();
  await getItem(createReq({ params: { id: '1' } }), res, createNext());

  assert.equal(res.statusCode, 200);
  assert.deepEqual(capture.select[0], ['+secretFeature']);
  assert.equal(res.body.item.secretFeature, undefined);
  assert.equal(res.body.item.hasSecretMark, true);
});

test('getItem exposes the secret feature only to admin and guard roles', async (t) => {
  for (const role of ['admin', 'guard']) {
    const capture = {};
    t.mock.method(Item, 'findById', () => queryChain({ _id: '1', secretFeature: 'Sticker inside' }, capture));

    const res = createRes();
    await getItem(createReq({ params: { id: '1' }, user: { role } }), res, createNext());

    assert.deepEqual(capture.select[0], ['+secretFeature'], `${role} should see secretFeature`);
    assert.equal(res.body.item.secretFeature, 'Sticker inside');
    assert.equal(res.body.item.hasSecretMark, true);
  }
});

test('getItem still hides the secret feature from students', async (t) => {
  const capture = {};
  t.mock.method(Item, 'findById', () => queryChain({ _id: '1', secretFeature: 'Sticker inside' }, capture));

  const res = createRes();
  await getItem(createReq({ params: { id: '1' }, user: { role: 'student' } }), res, createNext());

  assert.deepEqual(capture.select[0], ['+secretFeature']);
  assert.equal(res.body.item.secretFeature, undefined);
  assert.equal(res.body.item.hasSecretMark, true);
});

test('getItem reports no secret mark when the stored value is empty', async (t) => {
  t.mock.method(Item, 'findById', () => queryChain({ _id: '1', secretFeature: '   ' }));

  const res = createRes();
  await getItem(createReq({ params: { id: '1' } }), res, createNext());

  assert.equal(res.body.item.hasSecretMark, false);
});

test('getItem returns 404 when the item does not exist', async (t) => {
  t.mock.method(Item, 'findById', () => queryChain(null));

  const res = createRes();
  await getItem(createReq({ params: { id: 'missing' } }), res, createNext());

  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /not found/i);
});

test('getMyItems filters by the authenticated user', async (t) => {
  const capture = {};
  t.mock.method(Item, 'find', (filter) => {
    capture.filter = filter;
    return queryChain([]);
  });
  t.mock.method(Item, 'countDocuments', async () => 0);

  const res = createRes();
  await getMyItems(createReq({ user: { _id: userId } }), res, createNext());

  assert.equal(String(capture.filter.createdBy), String(userId));
  assert.equal(res.body.pageSize, 12);
});

test('createItem rejects an invalid type', async () => {
  const res = createRes();
  await createItem(
    createReq({ user: { _id: userId }, body: { type: 'stolen', title: 'X', category: 'Y', location: 'Z' } }),
    res,
    createNext()
  );
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /type must be lost or found/i);
});

test('createItem requires title, category and location', async () => {
  for (const body of [
    { type: 'lost', category: 'Y', location: 'Z' },
    { type: 'lost', title: 'X', location: 'Z' },
    { type: 'lost', title: 'X', category: 'Y' },
  ]) {
    const res = createRes();
    await createItem(createReq({ user: { _id: userId }, body }), res, createNext());
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /required/i);
  }
});

test('createItem stores a lost report without running the match engine', async (t) => {
  const created = { _id: new ObjectId(), type: 'lost', title: 'Wallet' };
  const create = t.mock.method(Item, 'create', async (doc) => ({ ...created, ...doc }));
  const find = t.mock.method(Item, 'find', () => ({ populate: async () => [] }));

  const res = createRes();
  await createItem(
    createReq({
      user: { _id: userId },
      body: {
        type: 'lost',
        title: 'Wallet',
        description: 'Black leather',
        category: 'Accessories',
        location: 'Library',
        date: '2026-01-02',
      },
    }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body.matches, []);
  assert.equal(res.body.matchCount, 0);
  assert.equal(find.mock.callCount(), 0);

  const doc = create.mock.calls[0].arguments[0];
  assert.equal(doc.type, 'lost');
  assert.equal(doc.expiresAt, null);
  assert.equal(doc.secretFeature, undefined);
  assert.equal(String(doc.createdBy), String(userId));
  assert.ok(doc.date instanceof Date);
});

test('createItem sets a 90-day expiry and matches for found reports', async (t) => {
  const created = { _id: new ObjectId(), type: 'found', title: 'Wallet' };
  const create = t.mock.method(Item, 'create', async (doc) => ({
    ...created,
    ...doc,
    populate: async () => ({ ...created, ...doc, createdBy: { email: 'finder@student.edu' } }),
  }));
  t.mock.method(Item, 'find', () => ({ populate: async () => [] }));
  t.mock.method(Notification, 'create', async (doc) => doc);

  const res = createRes();
  await createItem(
    createReq({
      user: { _id: userId },
      body: {
        type: 'found',
        title: 'Wallet',
        category: 'Accessories',
        location: 'Library',
        secretFeature: 'Sticker inside',
      },
    }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.matchCount, 0);

  const doc = create.mock.calls[0].arguments[0];
  assert.equal(doc.secretFeature, 'Sticker inside');
  const days = (doc.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  assert.ok(days > 89.9 && days <= 90, `expected about 90 days, got ${days}`);
});
