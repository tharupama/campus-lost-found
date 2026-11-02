const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User.model');
const RegistrationOtp = require('../src/models/RegistrationOtp.model');
const TrustedDevice = require('../src/models/TrustedDevice.model');
const auth = require('../src/controllers/auth.controller');
const { encrypt, decrypt } = require('../src/services/crypto.service');
const { generateSecret, totp } = require('../src/services/totp.service');
const { createReq, createRes, createNext, selectable, ObjectId } = require('./helpers');

const SECRET = process.env.JWT_SECRET || 'campus-dev-secret';

function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function fakeUser(overrides = {}) {
  const user = {
    _id: new ObjectId(),
    name: 'Alex',
    email: 'alex@student.edu',
    role: 'student',
    isVerified: true,
    twoFactorEnabled: false,
    comparePassword: async () => true,
    save: async () => user,
    ...overrides,
  };
  return user;
}

function registrationToken(email = 'new@student.edu') {
  return jwt.sign({ email, purpose: 'registration' }, SECRET, { expiresIn: '30m' });
}

function mfaToken(user) {
  return jwt.sign({ id: user._id, purpose: 'mfa' }, SECRET, { expiresIn: '5m' });
}

// ---- login ---------------------------------------------------------------

test('login requires an email and password', async () => {
  for (const body of [{}, { email: 'a@b.co' }, { password: 'secret' }]) {
    const res = createRes();
    await auth.login(createReq({ body }), res, createNext());
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /required/i);
  }
});

test('login rejects unknown accounts and wrong passwords', async (t) => {
  t.mock.method(User, 'findOne', () => selectable(null));
  const unknown = createRes();
  await auth.login(
    createReq({ body: { email: 'ghost@student.edu', password: 'secret' } }),
    unknown,
    createNext()
  );
  assert.equal(unknown.statusCode, 401);
  assert.match(unknown.body.message, /invalid campus credentials/i);

  t.mock.method(User, 'findOne', () => selectable(fakeUser({ comparePassword: async () => false })));
  const wrong = createRes();
  await auth.login(
    createReq({ body: { email: 'alex@student.edu', password: 'wrong' } }),
    wrong,
    createNext()
  );
  assert.equal(wrong.statusCode, 401);
});

test('login blocks accounts that are not verified', async (t) => {
  t.mock.method(User, 'findOne', () => selectable(fakeUser({ isVerified: false })));

  const res = createRes();
  await auth.login(
    createReq({ body: { email: 'alex@student.edu', password: 'secret' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'emailNotVerified');
});

test('login normalises the email and returns a JWT without the password', async (t) => {
  const user = fakeUser();
  const find = t.mock.method(User, 'findOne', () => selectable(user));

  const res = createRes();
  await auth.login(
    createReq({ body: { email: '  ALEX@STUDENT.EDU ', password: 'secret' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(typeof res.body.token, 'string');
  assert.equal(res.body.user.password, undefined);
  assert.equal(find.mock.calls[0].arguments[0].email, 'alex@student.edu');
  const decoded = jwt.verify(res.body.token, SECRET);
  assert.equal(String(decoded.id), String(user._id));
});

test('login challenges 2FA users on unfamiliar devices', async (t) => {
  const user = fakeUser({ twoFactorEnabled: true });
  t.mock.method(User, 'findOne', () => selectable(user));
  t.mock.method(TrustedDevice, 'findOne', async () => null);

  const res = createRes();
  await auth.login(
    createReq({ body: { email: 'alex@student.edu', password: 'secret' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.mfaRequired, true);
  assert.equal(res.body.token, undefined);
  const decoded = jwt.verify(res.body.mfaToken, SECRET);
  assert.equal(decoded.purpose, 'mfa');
});

test('login skips the 2FA challenge for a trusted device', async (t) => {
  const user = fakeUser({ twoFactorEnabled: true });
  t.mock.method(User, 'findOne', () => selectable(user));
  t.mock.method(TrustedDevice, 'findOne', async () => ({ _id: new ObjectId() }));

  const res = createRes();
  await auth.login(
    createReq({
      body: { email: 'alex@student.edu', password: 'secret', trustedDevice: 'remembered-token' },
    }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(typeof res.body.token, 'string');
  assert.equal(res.body.mfaRequired, undefined);
});

test('getMe returns the authenticated user', async () => {
  const user = fakeUser();
  const res = createRes();
  await auth.getMe(createReq({ user }), res, createNext());
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user, user);
});

// ---- registration --------------------------------------------------------

test('startRegistration validates the email address', async () => {
  for (const email of ['', 'not-an-email']) {
    const res = createRes();
    await auth.startRegistration(createReq({ body: { email } }), res, createNext());
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /valid email/i);
  }
});

test('startRegistration refuses emails that already have an account', async (t) => {
  t.mock.method(User, 'findOne', async () => fakeUser());

  const res = createRes();
  await auth.startRegistration(
    createReq({ body: { email: 'alex@student.edu' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /already exists/i);
});

test('verifyRegistrationOtp validates its inputs and pending record', async (t) => {
  const missing = createRes();
  await auth.verifyRegistrationOtp(createReq({ body: { email: 'a@b.co' } }), missing, createNext());
  assert.equal(missing.statusCode, 400);

  t.mock.method(RegistrationOtp, 'findOne', async () => null);
  const none = createRes();
  await auth.verifyRegistrationOtp(
    createReq({ body: { email: 'a@b.co', otp: '123456' } }),
    none,
    createNext()
  );
  assert.equal(none.statusCode, 400);
  assert.match(none.body.message, /request a new/i);

  t.mock.method(RegistrationOtp, 'findOne', async () => ({
    otpHash: hashToken('123456'),
    otpExpires: new Date(Date.now() - 1000),
    attempts: 0,
  }));
  const expired = createRes();
  await auth.verifyRegistrationOtp(
    createReq({ body: { email: 'a@b.co', otp: '123456' } }),
    expired,
    createNext()
  );
  assert.equal(expired.statusCode, 400);
  assert.match(expired.body.message, /expired/i);

  t.mock.method(RegistrationOtp, 'findOne', async () => ({
    otpHash: hashToken('123456'),
    otpExpires: new Date(Date.now() + 60000),
    attempts: 5,
  }));
  const locked = createRes();
  await auth.verifyRegistrationOtp(
    createReq({ body: { email: 'a@b.co', otp: '123456' } }),
    locked,
    createNext()
  );
  assert.equal(locked.statusCode, 400);
  assert.match(locked.body.message, /too many incorrect attempts/i);
});

test('verifyRegistrationOtp counts wrong attempts', async (t) => {
  const doc = {
    otpHash: hashToken('111111'),
    otpExpires: new Date(Date.now() + 60000),
    attempts: 0,
    save: async () => doc,
  };
  t.mock.method(RegistrationOtp, 'findOne', async () => doc);

  const res = createRes();
  await auth.verifyRegistrationOtp(
    createReq({ body: { email: 'a@b.co', otp: '222222' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.attemptsLeft, 4);
  assert.equal(doc.attempts, 1);
});

test('verifyRegistrationOtp issues a registration token for the right code', async (t) => {
  const doc = {
    otpHash: hashToken('123456'),
    otpExpires: new Date(Date.now() + 60000),
    attempts: 2,
    otpVerified: false,
    save: async () => doc,
  };
  t.mock.method(RegistrationOtp, 'findOne', async () => doc);

  const res = createRes();
  await auth.verifyRegistrationOtp(
    createReq({ body: { email: 'NEW@student.edu', otp: '123456' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(doc.otpVerified, true);
  assert.equal(doc.otpHash, null);
  const decoded = jwt.verify(res.body.regToken, SECRET);
  assert.equal(decoded.email, 'new@student.edu');
  assert.equal(decoded.purpose, 'registration');
});

test('completeRegistration rejects missing, invalid or expired registration tokens', async () => {
  for (const regToken of [undefined, 'bad-token']) {
    const res = createRes();
    await auth.completeRegistration(createReq({ body: { regToken } }), res, createNext());
    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /session has expired/i);
  }
});

test('completeRegistration validates username, mobile and password', async () => {
  const token = registrationToken();
  const cases = [
    [{ username: 'A', mobileNumber: '0712345678', password: 'Strong1!' }, /at least 2/i],
    [{ username: 'Alex', mobileNumber: 'abc', password: 'Strong1!' }, /valid mobile/i],
    [{ username: 'Alex', mobileNumber: '0712345678', password: '123' }, /at least 6/i],
    [{ username: 'Alex', mobileNumber: '0712345678', password: 'aaaaaa' }, /too weak/i],
  ];

  for (const [fields, pattern] of cases) {
    const res = createRes();
    await auth.completeRegistration(
      createReq({ body: { regToken: token, ...fields } }),
      res,
      createNext()
    );
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, pattern);
  }
});

test('completeRegistration creates a verified student account', async (t) => {
  const token = registrationToken('new@student.edu');
  t.mock.method(RegistrationOtp, 'findOne', async () => ({ otpVerified: true }));
  t.mock.method(User, 'findOne', async () => null);
  const create = t.mock.method(User, 'create', async (doc) => fakeUser({ ...doc }));
  t.mock.method(RegistrationOtp, 'deleteOne', async () => ({}));

  const res = createRes();
  await auth.completeRegistration(
    createReq({
      body: {
        regToken: token,
        username: 'New Student',
        mobileNumber: '0712345678',
        address: 'Hostel A',
        password: 'Strong1!',
      },
    }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 201);
  assert.equal(typeof res.body.token, 'string');
  assert.equal(res.body.user.password, undefined);
  const doc = create.mock.calls[0].arguments[0];
  assert.equal(doc.email, 'new@student.edu');
  assert.equal(doc.name, 'New Student');
  assert.equal(doc.role, 'student');
  assert.equal(doc.isVerified, true);
});

// ---- password reset ------------------------------------------------------

test('forgotPassword requires an email', async () => {
  const res = createRes();
  await auth.forgotPassword(createReq({ body: {} }), res, createNext());
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /email is required/i);
});

test('forgotPassword does not reveal whether an account exists', async (t) => {
  t.mock.method(User, 'findOne', async () => null);

  const res = createRes();
  await auth.forgotPassword(
    createReq({ body: { email: 'ghost@student.edu' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.match(res.body.message, /if that email is registered/i);
});

test('resetPassword requires a token and a strong enough password', async () => {
  const missing = createRes();
  await auth.resetPassword(createReq({ body: {} }), missing, createNext());
  assert.equal(missing.statusCode, 400);

  const short = createRes();
  await auth.resetPassword(createReq({ body: { token: 'abc', password: '123' } }), short, createNext());
  assert.equal(short.statusCode, 400);
  assert.match(short.body.message, /at least 6/i);
});

test('resetPassword rejects invalid or expired reset tokens', async (t) => {
  t.mock.method(User, 'findOne', async () => null);

  const res = createRes();
  await auth.resetPassword(
    createReq({ body: { token: 'expired-token', password: 'new-secret' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /invalid or has expired/i);
});

test('resetPassword updates the password and sends a confirmation email', async (t) => {
  const user = fakeUser({ resetPasswordToken: hashToken('raw-token') });
  t.mock.method(User, 'findOne', async () => user);

  const res = createRes();
  await auth.resetPassword(
    createReq({ body: { token: 'raw-token', password: 'new-secret' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(user.password, 'new-secret');
  assert.equal(user.resetPasswordToken, null);
  assert.equal(user.resetPasswordExpires, null);
});

// ---- profile -------------------------------------------------------------

test('updateProfile returns 404 when the user no longer exists', async (t) => {
  t.mock.method(User, 'findById', () => selectable(null));

  const res = createRes();
  await auth.updateProfile(createReq({ user: { _id: new ObjectId() } }), res, createNext());
  assert.equal(res.statusCode, 404);
});

test('updateProfile validates the username and password change rules', async (t) => {
  const user = fakeUser({ comparePassword: async (password) => password === 'secret' });
  t.mock.method(User, 'findById', () => selectable(user));

  const shortName = createRes();
  await auth.updateProfile(
    createReq({ user: { _id: user._id }, body: { name: 'A' } }),
    shortName,
    createNext()
  );
  assert.equal(shortName.statusCode, 400);

  const noCurrent = createRes();
  await auth.updateProfile(
    createReq({ user: { _id: user._id }, body: { newPassword: 'new-secret' } }),
    noCurrent,
    createNext()
  );
  assert.equal(noCurrent.statusCode, 400);
  assert.match(noCurrent.body.message, /current password/i);

  const wrong = createRes();
  await auth.updateProfile(
    createReq({
      user: { _id: user._id },
      body: { currentPassword: 'wrong', newPassword: 'new-secret' },
    }),
    wrong,
    createNext()
  );
  assert.equal(wrong.statusCode, 400);
  assert.match(wrong.body.message, /current password is incorrect/i);
});

test('updateProfile saves profile changes', async (t) => {
  const user = fakeUser();
  t.mock.method(User, 'findById', () => selectable(user));

  const res = createRes();
  await auth.updateProfile(
    createReq({
      user: { _id: user._id },
      body: { name: ' Alexander ', mobileNumber: '0712345678', address: 'Hostel B' },
    }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(user.name, 'Alexander');
  assert.equal(user.mobileNumber, '0712345678');
  assert.equal(user.address, 'Hostel B');
  assert.equal(res.body.user.password, undefined);
});

// ---- two-factor authentication -------------------------------------------

test('getTwoFactorStatus reports the enabled state and remaining recovery codes', async (t) => {
  t.mock.method(User, 'findById', () =>
    selectable(fakeUser({ twoFactorEnabled: true, twoFactorRecoveryCodes: ['a', 'b', 'c'] }))
  );

  const res = createRes();
  await auth.getTwoFactorStatus(createReq({ user: { _id: new ObjectId() } }), res, createNext());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.enabled, true);
  assert.equal(res.body.recoveryCodesRemaining, 3);
});

test('setupTwoFactor generates an encrypted pending secret and otpauth URL', async (t) => {
  const user = fakeUser({ twoFactorEnabled: false });
  t.mock.method(User, 'findById', async () => user);

  const res = createRes();
  await auth.setupTwoFactor(createReq({ user: { _id: user._id } }), res, createNext());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.secret.length, 32);
  assert.match(res.body.otpauthUrl, /^otpauth:\/\/totp\//);
  assert.ok(res.body.otpauthUrl.includes('alex%40student.edu'));
  assert.equal(decrypt(user.twoFactorPendingSecret), res.body.secret);
});

test('setupTwoFactor refuses to restart when 2FA is already on', async (t) => {
  t.mock.method(User, 'findById', async () => fakeUser({ twoFactorEnabled: true }));

  const res = createRes();
  await auth.setupTwoFactor(createReq({ user: { _id: new ObjectId() } }), res, createNext());

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /already enabled/i);
});

test('enableTwoFactor requires a pending setup and a valid code', async (t) => {
  const noPending = fakeUser();
  t.mock.method(User, 'findById', () => selectable(noPending));
  const missing = createRes();
  await auth.enableTwoFactor(
    createReq({ user: { _id: noPending._id }, body: { code: '123456' } }),
    missing,
    createNext()
  );
  assert.equal(missing.statusCode, 400);

  const secret = generateSecret();
  const user = fakeUser({ twoFactorPendingSecret: encrypt(secret) });
  t.mock.method(User, 'findById', () => selectable(user));
  const wrong = createRes();
  await auth.enableTwoFactor(
    createReq({ user: { _id: user._id }, body: { code: '000000' } }),
    wrong,
    createNext()
  );
  assert.equal(wrong.statusCode, 400);
  assert.match(wrong.body.message, /not valid/i);
});

test('enableTwoFactor activates 2FA and returns ten recovery codes', async (t) => {
  const secret = generateSecret();
  const user = fakeUser({ twoFactorPendingSecret: encrypt(secret) });
  t.mock.method(User, 'findById', () => selectable(user));

  const res = createRes();
  await auth.enableTwoFactor(
    createReq({ user: { _id: user._id }, body: { code: totp(secret) } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.enabled, true);
  assert.equal(res.body.recoveryCodes.length, 10);
  assert.equal(user.twoFactorEnabled, true);
  assert.equal(user.twoFactorPendingSecret, null);
  assert.equal(user.twoFactorRecoveryCodes.length, 10);
  assert.equal(new Set(res.body.recoveryCodes).size, 10);
});

test('verifyTwoFactorLogin validates the session token', async (t) => {
  const missing = createRes();
  await auth.verifyTwoFactorLogin(createReq({ body: {} }), missing, createNext());
  assert.equal(missing.statusCode, 400);

  const invalid = createRes();
  await auth.verifyTwoFactorLogin(
    createReq({ body: { mfaToken: 'not-a-token', code: '123456' } }),
    invalid,
    createNext()
  );
  assert.equal(invalid.statusCode, 401);

  const wrongPurpose = createRes();
  await auth.verifyTwoFactorLogin(
    createReq({
      body: { mfaToken: jwt.sign({ id: 'x', purpose: 'registration' }, SECRET), code: '123456' },
    }),
    wrongPurpose,
    createNext()
  );
  assert.equal(wrongPurpose.statusCode, 401);
  assert.match(wrongPurpose.body.message, /invalid verification session/i);
});

test('verifyTwoFactorLogin rejects accounts without active 2FA', async (t) => {
  t.mock.method(User, 'findById', () => selectable(fakeUser({ twoFactorEnabled: false })));

  const res = createRes();
  await auth.verifyTwoFactorLogin(
    createReq({ body: { mfaToken: mfaToken({ _id: new ObjectId() }), code: '123456' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /not active/i);
});

test('verifyTwoFactorLogin accepts a current authenticator code', async (t) => {
  const secret = generateSecret();
  let savedLastStep;
  const user = fakeUser({
    twoFactorEnabled: true,
    twoFactorSecret: encrypt(secret),
    twoFactorLastStep: 0,
    twoFactorRecoveryCodes: [],
    save: async () => {
      savedLastStep = user.twoFactorLastStep;
      return user;
    },
  });
  t.mock.method(User, 'findById', () => selectable(user));

  const res = createRes();
  await auth.verifyTwoFactorLogin(
    createReq({ body: { mfaToken: mfaToken(user), code: totp(secret) } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(typeof res.body.token, 'string');
  assert.ok(savedLastStep > 0);
  assert.equal(user.twoFactorSecret, undefined);
});

test('verifyTwoFactorLogin rejects replayed TOTP codes', async (t) => {
  const secret = generateSecret();
  const counter = Math.floor(Date.now() / 1000 / 30);
  const user = fakeUser({
    twoFactorEnabled: true,
    twoFactorSecret: encrypt(secret),
    twoFactorLastStep: counter,
    twoFactorRecoveryCodes: [],
  });
  t.mock.method(User, 'findById', () => selectable(user));

  const res = createRes();
  await auth.verifyTwoFactorLogin(
    createReq({ body: { mfaToken: mfaToken(user), code: totp(secret) } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /already used/i);
});

test('verifyTwoFactorLogin consumes a recovery code', async (t) => {
  const rawCode = 'ABCDE-FGHIJ';
  let savedRecoveryCount;
  const user = fakeUser({
    twoFactorEnabled: true,
    twoFactorSecret: encrypt(generateSecret()),
    twoFactorRecoveryCodes: [hashToken('ABCDEFGHIJ'), hashToken('OTHERCODE')],
    twoFactorLastStep: 0,
    save: async () => {
      savedRecoveryCount = user.twoFactorRecoveryCodes.length;
      return user;
    },
  });
  t.mock.method(User, 'findById', () => selectable(user));

  const res = createRes();
  await auth.verifyTwoFactorLogin(
    createReq({ body: { mfaToken: mfaToken(user), code: rawCode } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.match(res.body.message, /recovery code accepted/i);
  assert.equal(savedRecoveryCount, 1);
  assert.equal(user.twoFactorRecoveryCodes, undefined);
});

test('verifyTwoFactorLogin can remember a trusted device', async (t) => {
  const secret = generateSecret();
  const user = fakeUser({
    twoFactorEnabled: true,
    twoFactorSecret: encrypt(secret),
    twoFactorRecoveryCodes: [],
    twoFactorLastStep: 0,
  });
  t.mock.method(User, 'findById', () => selectable(user));
  const device = t.mock.method(TrustedDevice, 'create', async (doc) => doc);

  const res = createRes();
  await auth.verifyTwoFactorLogin(
    createReq({
      body: { mfaToken: mfaToken(user), code: totp(secret), rememberDevice: true },
      headers: { 'user-agent': 'TestBrowser/1.0' },
    }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.match(res.body.trustedDevice, /^[0-9a-f]{64}$/);
  assert.equal(device.mock.callCount(), 1);
  assert.equal(device.mock.calls[0].arguments[0].userAgent, 'TestBrowser/1.0');
});

test('disableTwoFactor requires the correct password', async (t) => {
  const user = fakeUser({ twoFactorEnabled: true, comparePassword: async () => false });
  t.mock.method(User, 'findById', () => selectable(user));

  const missing = createRes();
  await auth.disableTwoFactor(createReq({ user: { _id: user._id }, body: {} }), missing, createNext());
  assert.equal(missing.statusCode, 400);

  const wrong = createRes();
  await auth.disableTwoFactor(
    createReq({ user: { _id: user._id }, body: { password: 'wrong' } }),
    wrong,
    createNext()
  );
  assert.equal(wrong.statusCode, 400);
  assert.match(wrong.body.message, /password is incorrect/i);
});

test('disableTwoFactor clears secrets, recovery codes and trusted devices', async (t) => {
  const user = fakeUser({
    twoFactorEnabled: true,
    twoFactorSecret: 'enc',
    twoFactorPendingSecret: 'enc',
    twoFactorRecoveryCodes: ['hash'],
    twoFactorLastStep: 12,
  });
  t.mock.method(User, 'findById', () => selectable(user));
  const devices = t.mock.method(TrustedDevice, 'deleteMany', async () => ({}));

  const res = createRes();
  await auth.disableTwoFactor(
    createReq({ user: { _id: user._id }, body: { password: 'secret' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(user.twoFactorEnabled, false);
  assert.equal(user.twoFactorSecret, null);
  assert.equal(user.twoFactorPendingSecret, null);
  assert.deepEqual(user.twoFactorRecoveryCodes, []);
  assert.equal(user.twoFactorLastStep, 0);
  assert.equal(devices.mock.callCount(), 1);
});

test('regenerateRecoveryCodes requires enabled 2FA and the correct password', async (t) => {
  const disabled = fakeUser({ twoFactorEnabled: false });
  t.mock.method(User, 'findById', () => selectable(disabled));
  const off = createRes();
  await auth.regenerateRecoveryCodes(
    createReq({ user: { _id: disabled._id }, body: { password: 'secret' } }),
    off,
    createNext()
  );
  assert.equal(off.statusCode, 400);
  assert.match(off.body.message, /not enabled/i);

  const user = fakeUser({
    twoFactorEnabled: true,
    comparePassword: async () => false,
  });
  t.mock.method(User, 'findById', () => selectable(user));
  const wrong = createRes();
  await auth.regenerateRecoveryCodes(
    createReq({ user: { _id: user._id }, body: { password: 'wrong' } }),
    wrong,
    createNext()
  );
  assert.equal(wrong.statusCode, 400);
});

test('regenerateRecoveryCodes replaces all recovery codes', async (t) => {
  const user = fakeUser({ twoFactorEnabled: true });
  t.mock.method(User, 'findById', () => selectable(user));

  const res = createRes();
  await auth.regenerateRecoveryCodes(
    createReq({ user: { _id: user._id }, body: { password: 'secret' } }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.recoveryCodes.length, 10);
  assert.equal(user.twoFactorRecoveryCodes.length, 10);
});
