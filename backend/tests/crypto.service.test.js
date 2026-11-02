const { test } = require('node:test');
const assert = require('node:assert/strict');
const { encrypt, decrypt, randomToken } = require('../src/services/crypto.service');

function withEnv(name, value, fn) {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
}

test('encrypt/decrypt round-trips a value', () => {
  const ciphertext = encrypt('super-secret-totp');
  assert.equal(decrypt(ciphertext), 'super-secret-totp');
});

test('encrypt uses a fresh IV every time', () => {
  const first = encrypt('same-value');
  const second = encrypt('same-value');
  assert.notEqual(first, second);
  assert.equal(first.split('.').length, 3);
  assert.equal(decrypt(first), 'same-value');
  assert.equal(decrypt(second), 'same-value');
});

test('decrypt returns null for empty or malformed payloads', () => {
  assert.equal(decrypt(null), null);
  assert.equal(decrypt(undefined), null);
  assert.equal(decrypt(''), null);
  assert.equal(decrypt('not-a-payload'), null);
  assert.equal(decrypt('one.two'), null);
  assert.equal(decrypt('a.b.c.d'), null);
});

test('decrypt returns null when the ciphertext is tampered with', () => {
  const [iv, tag, data] = encrypt('tamper-me').split('.');
  const tampered = `${iv}.${tag}.${Buffer.from('different').toString('base64')}`;
  assert.equal(decrypt(tampered), null);
});

test('decrypt returns null when the key changes', () => {
  withEnv('TOTP_ENC_KEY', 'a'.repeat(64), () => {
    const ciphertext = encrypt('bound-to-key');
    withEnv('TOTP_ENC_KEY', 'b'.repeat(64), () => {
      assert.equal(decrypt(ciphertext), null);
    });
  });
});

test('accepts a 64-character hex TOTP_ENC_KEY', () => {
  withEnv('TOTP_ENC_KEY', '0123456789abcdef'.repeat(4), () => {
    const ciphertext = encrypt('hex-key-value');
    assert.equal(decrypt(ciphertext), 'hex-key-value');
  });
});

test('falls back to JWT_SECRET when TOTP_ENC_KEY is not a hex key', () => {
  withEnv('TOTP_ENC_KEY', 'not-a-hex-key', () => {
    withEnv('JWT_SECRET', 'jwt-derived-key', () => {
      const ciphertext = encrypt('derived');
      assert.equal(decrypt(ciphertext), 'derived');
    });
  });
});

test('randomToken returns lowercase hex of the requested byte length', () => {
  const token = randomToken(16);
  assert.equal(token.length, 32);
  assert.match(token, /^[0-9a-f]+$/);
});

test('randomToken defaults to 32 bytes and is unique', () => {
  const first = randomToken();
  const second = randomToken();
  assert.equal(first.length, 64);
  assert.notEqual(first, second);
});
