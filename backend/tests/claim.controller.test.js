const { test } = require('node:test');
const assert = require('node:assert/strict');
const Claim = require('../src/models/Claim.model');
const Item = require('../src/models/Item.model');
const { createClaim, getMyClaims } = require('../src/controllers/claim.controller');
const { createReq, createRes, createNext, queryChain, ObjectId } = require('./helpers');

const claimantId = new ObjectId();
const ownerId = new ObjectId();

function validBody(overrides = {}) {
  return {
    itemId: new ObjectId().toString(),
    proofAnswer: 'Scratch on the back',
    contactNumber: '0712345678',
    ...overrides,
  };
}

test('createClaim requires an item', async () => {
  for (const body of [{}, { proofAnswer: 'x' }]) {
    const res = createRes();
    await createClaim(createReq({ user: { _id: claimantId }, body }), res, createNext());
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /item is required/i);
  }
});

test('createClaim accepts a claim without a proof answer', async (t) => {
  const itemId = new ObjectId();
  t.mock.method(Item, 'findById', async () => ({ _id: itemId, status: 'active', createdBy: ownerId }));
  t.mock.method(Claim, 'findOne', async () => null);
  const create = t.mock.method(Claim, 'create', async (doc) => ({ _id: new ObjectId(), ...doc }));

  const res = createRes();
  await createClaim(
    createReq({ user: { _id: claimantId }, body: { itemId, contactNumber: '0712345678' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 201);
  assert.equal(create.mock.calls[0].arguments[0].proofAnswer, undefined);
});

test('createClaim requires a contact number', async () => {
  const res = createRes();
  await createClaim(
    createReq({ user: { _id: claimantId }, body: validBody({ contactNumber: '   ' }) }),
    res,
    createNext()
  );
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /contact number is required/i);
});

test('createClaim returns 404 for an unknown item', async (t) => {
  t.mock.method(Item, 'findById', async () => null);

  const res = createRes();
  await createClaim(createReq({ user: { _id: claimantId }, body: validBody() }), res, createNext());

  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /item not found/i);
});

test('createClaim blocks claiming an item you reported yourself', async (t) => {
  t.mock.method(Item, 'findById', async () => ({
    _id: new ObjectId(),
    status: 'active',
    createdBy: claimantId,
  }));

  const res = createRes();
  await createClaim(createReq({ user: { _id: claimantId }, body: validBody() }), res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /cannot claim an item you reported/i);
});

test('createClaim blocks items that are no longer available', async (t) => {
  t.mock.method(Item, 'findById', async () => ({
    _id: new ObjectId(),
    status: 'claimed',
    createdBy: ownerId,
  }));

  const res = createRes();
  await createClaim(createReq({ user: { _id: claimantId }, body: validBody() }), res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /no longer available/i);
});

test('createClaim blocks duplicate pending claims', async (t) => {
  t.mock.method(Item, 'findById', async () => ({
    _id: new ObjectId(),
    status: 'active',
    createdBy: ownerId,
  }));
  t.mock.method(Claim, 'findOne', async () => ({ _id: new ObjectId(), status: 'pending' }));

  const res = createRes();
  await createClaim(createReq({ user: { _id: claimantId }, body: validBody() }), res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /already have a pending claim/i);
});

test('createClaim creates a pending claim with trimmed contact details', async (t) => {
  const itemId = new ObjectId();
  t.mock.method(Item, 'findById', async () => ({ _id: itemId, status: 'active', createdBy: ownerId }));
  t.mock.method(Claim, 'findOne', async () => null);
  const create = t.mock.method(Claim, 'create', async (doc) => ({ _id: new ObjectId(), ...doc }));

  const res = createRes();
  await createClaim(
    createReq({
      user: { _id: claimantId },
      body: validBody({ itemId, contactNumber: '  0712345678  ', note: 'Please call' }),
    }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 201);
  assert.ok(res.body.claim._id);

  const doc = create.mock.calls[0].arguments[0];
  assert.equal(String(doc.item), String(itemId));
  assert.equal(String(doc.claimant), String(claimantId));
  assert.equal(doc.contactNumber, '0712345678');
  assert.equal(doc.proofAnswer, 'Scratch on the back');
  assert.equal(doc.note, 'Please call');
});

test('getMyClaims filters by claimant and uses a 10-item page size', async (t) => {
  const capture = {};
  t.mock.method(Claim, 'find', (filter) => {
    capture.filter = filter;
    return queryChain([]);
  });
  t.mock.method(Claim, 'countDocuments', async () => 0);

  const res = createRes();
  await getMyClaims(createReq({ user: { _id: claimantId } }), res, createNext());

  assert.equal(String(capture.filter.claimant), String(claimantId));
  assert.equal(res.body.pageSize, 10);
  assert.equal(res.body.total, 0);
});
