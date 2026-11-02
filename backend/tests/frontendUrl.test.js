const { test } = require('node:test');
const assert = require('node:assert/strict');
const { frontendUrl, isLocalUrl, normalizeUrl } = require('../src/utils/frontendUrl');

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  FRONTEND_URL: process.env.FRONTEND_URL,
  CLIENT_URL: process.env.CLIENT_URL,
  PUBLIC_FRONTEND_URL: process.env.PUBLIC_FRONTEND_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_URL: process.env.VERCEL_URL,
};

function resetEnv() {
  for (const key of Object.keys(ORIGINAL_ENV)) {
    if (ORIGINAL_ENV[key] === undefined) delete process.env[key];
    else process.env[key] = ORIGINAL_ENV[key];
  }
}

function setEnv(values) {
  resetEnv();
  for (const key of Object.keys(ORIGINAL_ENV)) delete process.env[key];
  Object.assign(process.env, values);
}

function fakeReq({ origin, host = 'api.example.test', proto = 'https' } = {}) {
  const headers = {};
  if (origin) headers.origin = origin;
  if (host) headers.host = host;
  headers['x-forwarded-proto'] = proto;
  return { get: (key) => headers[String(key).toLowerCase()] };
}

test('normalizeUrl only accepts http(s) origins', () => {
  assert.equal(normalizeUrl('https://campus.example.com/path'), 'https://campus.example.com');
  assert.equal(normalizeUrl('javascript:alert(1)'), '');
  assert.equal(normalizeUrl('not a url'), '');
});

test('isLocalUrl detects localhost variants', () => {
  assert.equal(isLocalUrl('http://localhost:5173'), true);
  assert.equal(isLocalUrl('http://127.0.0.1:5000'), true);
  assert.equal(isLocalUrl('https://campus.example.com'), false);
});

test('frontendUrl uses the client origin so hosted links never point at the API', () => {
  setEnv({ NODE_ENV: 'production', FRONTEND_URL: 'http://localhost:5173' });
  const url = frontendUrl('/reset-password?token=abc', fakeReq(), 'https://campus.example.com');
  assert.equal(url, 'https://campus.example.com/reset-password?token=abc');
  resetEnv();
});

test('frontendUrl ignores a localhost client origin in production', () => {
  setEnv({ NODE_ENV: 'production', FRONTEND_URL: 'https://campus.example.com' });
  const url = frontendUrl('/reset-password?token=abc', fakeReq(), 'http://localhost:5173');
  assert.equal(url, 'https://campus.example.com/reset-password?token=abc');
  resetEnv();
});

test('frontendUrl prefers a public configured URL over the request host', () => {
  setEnv({ NODE_ENV: 'production', FRONTEND_URL: 'https://campus.example.com' });
  const url = frontendUrl('/reset-password?token=abc', fakeReq({ origin: 'https://evil.test' }));
  assert.equal(url, 'https://campus.example.com/reset-password?token=abc');
  resetEnv();
});

test('frontendUrl falls back to the request origin when no public URL is configured', () => {
  setEnv({ NODE_ENV: 'production', FRONTEND_URL: 'http://localhost:5173' });
  const url = frontendUrl('/reset-password?token=abc', fakeReq({ origin: 'https://campus.example.com' }));
  assert.equal(url, 'https://campus.example.com/reset-password?token=abc');
  resetEnv();
});

test('frontendUrl accepts localhost origins outside production for local development', () => {
  setEnv({ NODE_ENV: 'development', FRONTEND_URL: 'http://localhost:5173' });
  const url = frontendUrl('/reset-password?token=abc', fakeReq({ origin: 'http://localhost:5173' }));
  assert.equal(url, 'http://localhost:5173/reset-password?token=abc');
  resetEnv();
});
