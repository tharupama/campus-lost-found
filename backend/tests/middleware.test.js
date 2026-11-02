const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User.model');
const { protect, authorize } = require('../src/middleware/auth.middleware');
const { notFound, errorHandler } = require('../src/middleware/error.middleware');
const { createReq, createRes, createNext } = require('./helpers');

const SECRET = process.env.JWT_SECRET || 'campus-dev-secret';

function tokenFor(payload, options = {}) {
  return jwt.sign(payload, SECRET, options);
}

test('protect rejects requests without a token', async () => {
  const req = createReq();
  const res = createRes();
  const next = createNext();

  await protect(req, res, next);

  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /no token/i);
  assert.equal(next.called, false);
});

test('protect rejects an Authorization header without the Bearer prefix', async () => {
  const req = createReq({ headers: { authorization: 'Token abc' } });
  const res = createRes();
  const next = createNext();

  await protect(req, res, next);

  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /no token/i);
});

test('protect rejects an invalid or expired token', async () => {
  for (const token of ['not-a-jwt', tokenFor({ id: 'x' }, { expiresIn: -10 })]) {
    const req = createReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createRes();
    const next = createNext();

    await protect(req, res, next);

    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /invalid or expired/i);
    assert.equal(next.called, false);
  }
});

test('protect rejects a token signed with the wrong secret', async () => {
  const token = jwt.sign({ id: 'someone' }, 'a-different-secret');
  const req = createReq({ headers: { authorization: `Bearer ${token}` } });
  const res = createRes();
  const next = createNext();

  await protect(req, res, next);

  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /invalid or expired/i);
});

test('protect rejects a valid token whose user no longer exists', async (t) => {
  t.mock.method(User, 'findById', () => ({ select: async () => null }));
  const req = createReq({ headers: { authorization: `Bearer ${tokenFor({ id: 'missing' })}` } });
  const res = createRes();
  const next = createNext();

  await protect(req, res, next);

  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /user not found/i);
});

test('protect attaches the user and calls next for a valid token', async (t) => {
  const user = { _id: '507f1f77bcf86cd799439011', role: 'student', name: 'Alex' };
  t.mock.method(User, 'findById', () => ({ select: async () => user }));
  const req = createReq({ headers: { authorization: `Bearer ${tokenFor({ id: user._id })}` } });
  const res = createRes();
  const next = createNext();

  await protect(req, res, next);

  assert.equal(req.user, user);
  assert.equal(next.called, true);
  assert.equal(next.error, undefined);
});

test('authorize denies requests with no authenticated user', () => {
  const req = createReq();
  const res = createRes();
  const next = createNext();

  authorize('admin')(req, res, next);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /insufficient role/i);
  assert.equal(next.called, false);
});

test('authorize allows an accepted role', () => {
  for (const role of ['admin', 'guard']) {
    const req = createReq({ user: { role } });
    const res = createRes();
    const next = createNext();

    authorize('admin', 'guard')(req, res, next);

    assert.equal(next.called, true);
    assert.equal(res.body, undefined);
  }
});

test('authorize rejects a role outside the allowed list', () => {
  const req = createReq({ user: { role: 'student' } });
  const res = createRes();
  const next = createNext();

  authorize('admin', 'guard')(req, res, next);

  assert.equal(res.statusCode, 403);
  assert.equal(next.called, false);
});

test('notFound returns a 404 with the requested URL', () => {
  const req = createReq({ originalUrl: '/api/unknown' });
  const res = createRes();

  notFound(req, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { message: 'Not found: /api/unknown' });
});

test('errorHandler uses the error status code and message', () => {
  const err = new Error('Bad input');
  err.statusCode = 422;
  const res = createRes();

  errorHandler(err, createReq(), res, createNext());

  assert.equal(res.statusCode, 422);
  assert.deepEqual(res.body, { message: 'Bad input' });
});

test('errorHandler defaults to 500 and a generic message', () => {
  const err = new Error('');
  const res = createRes();

  errorHandler(err, createReq(), res, createNext());

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { message: 'Server error' });
});

test('errorHandler maps Multer errors to a 400 upload error', () => {
  const err = new Error('File too large');
  err.name = 'MulterError';
  const res = createRes();

  errorHandler(err, createReq(), res, createNext());

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Upload error: File too large');
});

test('errorHandler only exposes stack traces in development', (t) => {
  const previous = process.env.NODE_ENV;
  t.after(() => {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  });

  process.env.NODE_ENV = 'development';
  const devRes = createRes();
  errorHandler(new Error('boom'), createReq(), devRes, createNext());
  assert.ok(devRes.body.stack);

  process.env.NODE_ENV = 'production';
  const prodRes = createRes();
  errorHandler(new Error('boom'), createReq(), prodRes, createNext());
  assert.equal(prodRes.body.stack, undefined);
});
