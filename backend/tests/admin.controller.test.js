const { test } = require('node:test');
const assert = require('node:assert/strict');
const Claim = require('../src/models/Claim.model');
const Feedback = require('../src/models/Feedback.model');
const Item = require('../src/models/Item.model');
const User = require('../src/models/User.model');
const Notification = require('../src/models/Notification.model');
const {
  reviewClaim,
  markAvailable,
  handover,
  getVault,
  createUser,
  updateUser,
  deleteUser,
  updateFeedback,
  deleteFeedback,
} = require('../src/controllers/admin.controller');
const {
  createReq,
  createRes,
  createNext,
  queryChain,
  makeClaim,
  ObjectId,
} = require('./helpers');

const adminId = new ObjectId();

function adminReq(overrides = {}) {
  return createReq({ user: { _id: adminId, role: 'admin' }, ...overrides });
}

test('reviewClaim rejects statuses other than approved/rejected', async () => {
  const res = createRes();
  await reviewClaim(adminReq({ body: { status: 'resolved' } }), res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /approved or rejected/i);
});

test('reviewClaim returns 404 for an unknown claim', async (t) => {
  t.mock.method(Claim, 'findById', () => queryChain(null));

  const res = createRes();
  await reviewClaim(adminReq({ params: { id: 'missing' }, body: { status: 'approved' } }), res, createNext());

  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /claim not found/i);
});

test('reviewClaim refuses to review a claim twice', async (t) => {
  const claim = makeClaim({ status: 'approved' });
  t.mock.method(Claim, 'findById', () => queryChain(claim));

  const res = createRes();
  await reviewClaim(adminReq({ params: { id: claim._id }, body: { status: 'rejected' } }), res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /already approved/i);
});

test('approving a claim marks the item claimed and rejects competing claims', async (t) => {
  const claim = makeClaim();
  t.mock.method(Claim, 'findById', () => queryChain(claim));
  const updateItem = t.mock.method(Item, 'findByIdAndUpdate', async () => ({}));
  const updateClaims = t.mock.method(Claim, 'updateMany', async () => ({}));
  const notification = t.mock.method(Notification, 'create', async (doc) => doc);

  const res = createRes();
  await reviewClaim(adminReq({ params: { id: claim._id }, body: { status: 'approved' } }), res, createNext());

  assert.equal(res.statusCode, 200);
  assert.equal(claim.status, 'approved');
  assert.equal(String(claim.reviewedBy), String(adminId));
  assert.equal(updateItem.mock.callCount(), 1);
  assert.deepEqual(updateItem.mock.calls[0].arguments, [
    claim.item._id,
    { status: 'claimed', claimedBy: claim.claimant },
  ]);
  assert.equal(updateClaims.mock.callCount(), 1);
  const competingFilter = updateClaims.mock.calls[0].arguments[0];
  assert.equal(String(competingFilter.item), String(claim.item._id));
  assert.equal(competingFilter.status, 'pending');
  assert.equal(notification.mock.callCount(), 1);
});

test('rejecting a claim leaves the item untouched', async (t) => {
  const claim = makeClaim();
  t.mock.method(Claim, 'findById', () => queryChain(claim));
  const updateItem = t.mock.method(Item, 'findByIdAndUpdate', async () => ({}));
  t.mock.method(Notification, 'create', async (doc) => doc);

  const res = createRes();
  await reviewClaim(adminReq({ params: { id: claim._id }, body: { status: 'rejected' } }), res, createNext());

  assert.equal(res.statusCode, 200);
  assert.equal(claim.status, 'rejected');
  assert.equal(updateItem.mock.callCount(), 0);
});

test('markAvailable returns 404 for an unknown item', async (t) => {
  t.mock.method(Item, 'findById', async () => null);

  const res = createRes();
  await markAvailable(adminReq({ params: { id: 'missing' } }), res, createNext());

  assert.equal(res.statusCode, 404);
});

test('markAvailable only accepts found items', async (t) => {
  t.mock.method(Item, 'findById', async () => ({ type: 'lost', status: 'active' }));

  const res = createRes();
  await markAvailable(adminReq({ params: { id: '1' } }), res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /only found items/i);
});

test('markAvailable only accepts active items', async (t) => {
  t.mock.method(Item, 'findById', async () => ({ type: 'found', status: 'claimed' }));

  const res = createRes();
  await markAvailable(adminReq({ params: { id: '1' } }), res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /must be active/i);
});

test('markAvailable moves a found item into the guard room and notifies the finder', async (t) => {
  const item = {
    _id: new ObjectId(),
    type: 'found',
    status: 'active',
    handoverStatus: 'pending',
    save: async () => item,
    populate: async () => item,
    createdBy: { _id: new ObjectId(), email: 'finder@student.edu' },
  };
  t.mock.method(Item, 'findById', async () => item);
  const notification = t.mock.method(Notification, 'create', async (doc) => doc);

  const res = createRes();
  await markAvailable(adminReq({ params: { id: item._id } }), res, createNext());

  assert.equal(res.statusCode, 200);
  assert.equal(item.handoverStatus, 'in_vault');
  assert.ok(item.handedOverAt instanceof Date);
  assert.ok(item.lastReminderAt instanceof Date);
  assert.equal(notification.mock.callCount(), 1);
});

test('handover requires both a claim id and claimant id', async () => {
  const res = createRes();
  await handover(adminReq({ body: {} }), res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /claim id \+ student id/i);
});

test('handover returns 404 for an unknown claim', async (t) => {
  t.mock.method(Claim, 'findById', () => queryChain(null));

  const res = createRes();
  await handover(
    adminReq({ body: { claimId: new ObjectId(), claimantId: new ObjectId() } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /claim not found/i);
});

test('handover refuses unapproved claims', async (t) => {
  const claim = makeClaim({ status: 'pending' });
  t.mock.method(Claim, 'findById', () => queryChain(claim));

  const res = createRes();
  await handover(
    adminReq({ body: { claimId: claim._id, claimantId: claim.claimant._id } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /not approved/i);
});

test('handover rejects a claimant id that does not match the claim', async (t) => {
  const claim = makeClaim({ status: 'approved' });
  t.mock.method(Claim, 'findById', () => queryChain(claim));

  const res = createRes();
  await handover(
    adminReq({ body: { claimId: claim._id, claimantId: new ObjectId() } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /identity does not match/i);
});

test('handover refuses an item that is already resolved', async (t) => {
  const claim = makeClaim({ status: 'approved' });
  claim.item.status = 'resolved';
  t.mock.method(Claim, 'findById', () => queryChain(claim));

  const res = createRes();
  await handover(
    adminReq({ body: { claimId: claim._id, claimantId: claim.claimant._id } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /already resolved/i);
});

test('handover resolves the item and claim from a scanned QR code', async (t) => {
  const claim = makeClaim({ status: 'approved' });
  claim.item.save = async () => claim.item;
  t.mock.method(Claim, 'findById', () => queryChain(claim));
  t.mock.method(Notification, 'create', async (doc) => doc);

  const res = createRes();
  await handover(
    adminReq({ body: { code: `${claim._id}::${claim.claimant._id}` } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(claim.item.status, 'resolved');
  assert.equal(claim.status, 'resolved');
  assert.match(res.body.message, /handover verified/i);
});

test('getVault applies the expected view filters', async (t) => {
  const cases = [
    ['all', (filter) => filter.handoverStatus === undefined],
    ['pending', (filter) => filter.type === 'found' && filter.handoverStatus === 'pending'],
    ['in_vault', (filter) => filter.handoverStatus === 'in_vault'],
    ['claimed', (filter) => filter.status === 'claimed'],
  ];

  for (const [view, check] of cases) {
    const capture = {};
    t.mock.method(Item, 'find', (filter) => {
      capture.filter = filter;
      return queryChain([]);
    });
    t.mock.method(Item, 'countDocuments', async () => 0);

    const res = createRes();
    await getVault(adminReq({ query: { view } }), res, createNext());

    assert.ok(check(capture.filter), `unexpected filter for view ${view}`);
    assert.equal(res.statusCode, 200);
  }
});

test('createUser validates required fields, password length, role and duplicates', async (t) => {
  const cases = [
    [{ email: 'a@b.co', password: 'secret1' }, /name is required/i],
    [{ name: 'A', password: 'secret1' }, /email is required/i],
    [{ name: 'A', email: 'a@b.co' }, /password is required/i],
    [{ name: 'A', email: 'a@b.co', password: '123' }, /at least 6/i],
    [{ name: 'A', email: 'a@b.co', password: 'secret1', role: 'root' }, /invalid role/i],
  ];

  for (const [body, pattern] of cases) {
    const res = createRes();
    await createUser(adminReq({ body }), res, createNext());
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, pattern);
  }

  t.mock.method(User, 'findOne', async () => ({ _id: new ObjectId() }));
  const res = createRes();
  await createUser(
    adminReq({ body: { name: 'A', email: 'a@b.co', password: 'secret1' } }),
    res,
    createNext()
  );
  assert.equal(res.statusCode, 409);
});

test('createUser creates a verified account with a normalised email', async (t) => {
  t.mock.method(User, 'findOne', async () => null);
  const create = t.mock.method(User, 'create', async (doc) => ({ _id: new ObjectId(), ...doc }));

  const res = createRes();
  await createUser(
    adminReq({
      body: { name: '  Alex  ', email: 'ALEX@STUDENT.EDU', password: 'secret1', role: 'guard' },
    }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 201);
  const doc = create.mock.calls[0].arguments[0];
  assert.equal(doc.name, 'Alex');
  assert.equal(doc.email, 'alex@student.edu');
  assert.equal(doc.role, 'guard');
  assert.equal(doc.isVerified, true);
  assert.equal(res.body.user.password, undefined);
});

test('updateUser returns 404 for an unknown account', async (t) => {
  t.mock.method(User, 'findById', async () => null);

  const res = createRes();
  await updateUser(adminReq({ params: { id: 'missing' }, body: { name: 'X' } }), res, createNext());

  assert.equal(res.statusCode, 404);
});

test('updateUser prevents changing your own admin role', async (t) => {
  const user = { _id: adminId, role: 'admin', save: async () => user };
  t.mock.method(User, 'findById', async () => user);

  const res = createRes();
  await updateUser(
    adminReq({ params: { id: adminId }, body: { role: 'student' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /cannot change your own admin role/i);
});

test('updateUser prevents demoting the last admin', async (t) => {
  const user = { _id: new ObjectId(), role: 'admin', save: async () => user };
  t.mock.method(User, 'findById', async () => user);
  t.mock.method(User, 'countDocuments', async () => 1);

  const res = createRes();
  await updateUser(
    adminReq({ params: { id: user._id }, body: { role: 'student' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /cannot demote the last admin/i);
});

test('updateUser rejects invalid roles and duplicate emails', async (t) => {
  const user = { _id: new ObjectId(), role: 'guard', save: async () => user };
  t.mock.method(User, 'findById', async () => user);

  const invalid = createRes();
  await updateUser(adminReq({ params: { id: user._id }, body: { role: 'root' } }), invalid, createNext());
  assert.equal(invalid.statusCode, 400);

  t.mock.method(User, 'findOne', async () => ({ _id: new ObjectId() }));
  const duplicate = createRes();
  await updateUser(
    adminReq({ params: { id: user._id }, body: { email: 'taken@campus.edu' } }),
    duplicate,
    createNext()
  );
  assert.equal(duplicate.statusCode, 409);
});

test('updateUser saves allowed profile changes', async (t) => {
  const user = {
    _id: new ObjectId(),
    role: 'guard',
    email: 'guard@campus.edu',
    save: async () => user,
  };
  t.mock.method(User, 'findById', async () => user);

  const res = createRes();
  await updateUser(
    adminReq({ params: { id: user._id }, body: { name: ' Dana ', address: ' Gate 2 ' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(user.name, 'Dana');
  assert.equal(user.address, 'Gate 2');
  assert.equal(res.body.user.password, undefined);
});

test('deleteUser prevents deleting your own account and the last admin', async (t) => {
  const self = { _id: adminId, role: 'admin', deleteOne: async () => {} };
  t.mock.method(User, 'findById', async () => self);
  const own = createRes();
  await deleteUser(adminReq({ params: { id: adminId } }), own, createNext());
  assert.equal(own.statusCode, 400);
  assert.match(own.body.message, /cannot delete your own account/i);

  const lastAdmin = { _id: new ObjectId(), role: 'admin', deleteOne: async () => {} };
  t.mock.method(User, 'findById', async () => lastAdmin);
  t.mock.method(User, 'countDocuments', async () => 1);
  const last = createRes();
  await deleteUser(adminReq({ params: { id: lastAdmin._id } }), last, createNext());
  assert.equal(last.statusCode, 400);
  assert.match(last.body.message, /cannot delete the last admin/i);
});

test('deleteUser removes a regular account', async (t) => {
  let deleted = false;
  const user = {
    _id: new ObjectId(),
    role: 'student',
    deleteOne: async () => {
      deleted = true;
    },
  };
  t.mock.method(User, 'findById', async () => user);

  const res = createRes();
  await deleteUser(adminReq({ params: { id: user._id } }), res, createNext());

  assert.equal(res.statusCode, 200);
  assert.equal(deleted, true);
});

test('updateFeedback validates the status and marks the reviewer', async (t) => {
  const feedback = {
    _id: new ObjectId(),
    status: 'new',
    reviewedBy: null,
    reviewedAt: null,
    save: async () => feedback,
    populate: async () => feedback,
  };

  t.mock.method(Feedback, 'findById', async () => feedback);
  const invalid = createRes();
  await updateFeedback(
    adminReq({ params: { id: feedback._id }, body: { status: 'closed' } }),
    invalid,
    createNext()
  );
  assert.equal(invalid.statusCode, 400);

  const res = createRes();
  await updateFeedback(
    adminReq({ params: { id: feedback._id }, body: { status: 'reviewed' } }),
    res,
    createNext()
  );
  assert.equal(res.statusCode, 200);
  assert.equal(feedback.status, 'reviewed');
  assert.equal(String(feedback.reviewedBy), String(adminId));
  assert.ok(feedback.reviewedAt instanceof Date);
});

test('deleteFeedback removes related notifications and the feedback', async (t) => {
  let deleted = false;
  const feedback = {
    _id: new ObjectId(),
    deleteOne: async () => {
      deleted = true;
    },
  };
  t.mock.method(Feedback, 'findById', async () => feedback);
  const notifications = t.mock.method(Notification, 'deleteMany', async () => ({}));

  const res = createRes();
  await deleteFeedback(adminReq({ params: { id: feedback._id } }), res, createNext());

  assert.equal(res.statusCode, 200);
  assert.equal(deleted, true);
  assert.equal(notifications.mock.callCount(), 1);
  assert.equal(String(notifications.mock.calls[0].arguments[0].feedback), String(feedback._id));
});
