const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DEFAULT_STEP = 30;
const DEFAULT_DIGITS = 6;

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input) {
  const cleaned = String(input || '')
    .toUpperCase()
    .replace(/=+$/, '')
    .replace(/[^A-Z2-7]/g, '');
  const bytes = [];
  let bits = 0;
  let value = 0;
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateSecret(size = 20) {
  return base32Encode(crypto.randomBytes(size));
}

function hotp(secret, counter, digits = DEFAULT_DIGITS) {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  let remaining = BigInt(counter);
  for (let i = 7; i >= 0; i -= 1) {
    buffer[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, '0');
}

function totp(secret, { time = Date.now(), step = DEFAULT_STEP, digits = DEFAULT_DIGITS } = {}) {
  return hotp(secret, Math.floor(time / 1000 / step), digits);
}

function verifyTotp(secret, token, { window = 1, step = DEFAULT_STEP, digits = DEFAULT_DIGITS, time = Date.now() } = {}) {
  const code = String(token || '').replace(/\D/g, '');
  if (code.length !== digits) return null;
  const counter = Math.floor(time / 1000 / step);
  for (let offset = -window; offset <= window; offset += 1) {
    const candidate = counter + offset;
    if (candidate < 0) continue;
    if (hotp(secret, candidate, digits) === code) return candidate;
  }
  return null;
}

function keyUri({ secret, label, issuer }) {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DEFAULT_DIGITS),
    period: String(DEFAULT_STEP),
  });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?${params.toString()}`;
}

module.exports = { generateSecret, hotp, totp, verifyTotp, keyUri, base32Encode, base32Decode };
