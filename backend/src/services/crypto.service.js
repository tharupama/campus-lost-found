const crypto = require('crypto');

function getKey() {
  const raw = (process.env.TOTP_ENC_KEY || '').trim();
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return crypto
    .createHash('sha256')
    .update(process.env.JWT_SECRET || 'campus-dev-secret')
    .digest();
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decrypt(payload) {
  if (!payload) return null;
  const [ivPart, tagPart, dataPart] = String(payload).split('.');
  if (!ivPart || !tagPart || !dataPart) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivPart, 'base64'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch (err) {
    return null;
  }
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { encrypt, decrypt, randomToken };
