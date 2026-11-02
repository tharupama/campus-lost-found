const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  generateSecret,
  hotp,
  totp,
  verifyTotp,
  keyUri,
  base32Encode,
  base32Decode,
} = require('../src/services/totp.service');

const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const STEP_MS = 30 * 1000;

test('HOTP matches the RFC 6238 SHA-1 test vector', () => {
  assert.equal(hotp(RFC_SECRET, 1, 8), '94287082');
});

test('TOTP matches the RFC 6238 SHA-1 test vectors', () => {
  const vectors = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ];
  for (const [seconds, expected] of vectors) {
    assert.equal(totp(RFC_SECRET, { time: seconds * 1000, digits: 8 }), expected);
  }
});

test('TOTP produces six digits by default', () => {
  const code = totp(RFC_SECRET, { time: 59 * 1000 });
  assert.equal(code, '287082');
  assert.equal(code.length, 6);
});

test('base32Encode and base32Decode round-trip binary data', () => {
  const input = Buffer.from('The quick brown fox jumps over the lazy dog');
  const encoded = base32Encode(input);
  assert.match(encoded, /^[A-Z2-7]+$/);
  assert.deepEqual(base32Decode(encoded), input);
});

test('base32Decode ignores padding, whitespace and separators', () => {
  const encoded = base32Encode(Buffer.from('hello world'));
  const messy = `${encoded.toLowerCase().slice(0, 4)}-${encoded.slice(4)}===`;
  assert.deepEqual(base32Decode(messy), Buffer.from('hello world'));
});

test('generateSecret returns a URL-safe base32 secret of the expected size', () => {
  const secret = generateSecret();
  assert.equal(secret.length, 32);
  assert.match(secret, /^[A-Z2-7]+$/);
  assert.notEqual(generateSecret(), secret);
});

test('verifyTotp accepts the current time step', () => {
  const now = Date.now();
  const code = totp(RFC_SECRET, { time: now });
  assert.equal(verifyTotp(RFC_SECRET, code, { time: now }), Math.floor(now / 1000 / 30));
});

test('verifyTotp accepts adjacent steps within the window', () => {
  const now = Date.now();
  const currentCounter = Math.floor(now / 1000 / 30);
  const previousCode = hotp(RFC_SECRET, currentCounter - 1);
  const nextCode = hotp(RFC_SECRET, currentCounter + 1);

  assert.equal(verifyTotp(RFC_SECRET, previousCode, { time: now, window: 1 }), currentCounter - 1);
  assert.equal(verifyTotp(RFC_SECRET, nextCode, { time: now, window: 1 }), currentCounter + 1);
});

test('verifyTotp rejects codes outside the window', () => {
  const now = Date.now();
  const currentCounter = Math.floor(now / 1000 / 30);
  const oldCode = hotp(RFC_SECRET, currentCounter - 5);
  assert.equal(verifyTotp(RFC_SECRET, oldCode, { time: now, window: 1 }), null);
  assert.equal(verifyTotp(RFC_SECRET, oldCode, { time: now, window: 0 }), null);
});

test('verifyTotp rejects malformed or wrong-length tokens', () => {
  const code = totp(RFC_SECRET);
  assert.equal(verifyTotp(RFC_SECRET, ''), null);
  assert.equal(verifyTotp(RFC_SECRET, null), null);
  assert.equal(verifyTotp(RFC_SECRET, code.slice(0, 4)), null);
  assert.equal(verifyTotp(RFC_SECRET, `${code}99`), null);
});

test('verifyTotp strips separators from the submitted code', () => {
  const now = Date.now();
  const code = totp(RFC_SECRET, { time: now });
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  assert.notEqual(verifyTotp(RFC_SECRET, spaced, { time: now }), null);
});

test('keyUri builds a valid otpauth URL', () => {
  const uri = keyUri({
    secret: 'JBSWY3DPEHPK3PXP',
    label: 'alex@student.edu',
    issuer: 'Ruhuna Lost & Found',
  });
  assert.match(uri, /^otpauth:\/\/totp\//);
  assert.ok(uri.includes('JBSWY3DPEHPK3PXP'));
  assert.ok(uri.includes('issuer=Ruhuna+Lost+%26+Found'));
  assert.ok(uri.includes('algorithm=SHA1'));
  assert.ok(uri.includes('digits=6'));
  assert.ok(uri.includes('period=30'));
});

test('TOTP codes change across time steps', () => {
  const now = Date.now();
  const first = totp(RFC_SECRET, { time: now });
  const next = totp(RFC_SECRET, { time: now + STEP_MS });
  assert.notEqual(first, next);
});
