const { test } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const {
  processImage,
  extractCloudinaryPublicId,
  destroyCloudinaryImage,
} = require('../src/services/upload.service');

function withoutCloudinary(fn) {
  const keys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const previous = keys.map((key) => process.env[key]);
  for (const key of keys) delete process.env[key];
  try {
    return fn();
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
}

test('processImage returns null when no file was uploaded', async () => {
  assert.equal(await processImage(null), null);
  assert.equal(await processImage({}), null);
  assert.equal(await processImage({ buffer: null }), null);
});

test('processImage compresses uploads into a JPEG data URI when Cloudinary is off', async () => {
  const input = await sharp({
    create: { width: 1200, height: 600, channels: 3, background: '#ff0000' },
  })
    .png()
    .toBuffer();

  const result = await withoutCloudinary(() => processImage({ buffer: input }));

  assert.match(result, /^data:image\/jpeg;base64,/);
  const decoded = Buffer.from(result.split(',')[1], 'base64');
  const meta = await sharp(decoded).metadata();
  assert.equal(meta.format, 'jpeg');
  assert.ok(meta.width <= 900, `expected width <= 900, got ${meta.width}`);
  assert.equal(meta.height, 450);
});

test('processImage does not upscale small images', async () => {
  const input = await sharp({
    create: { width: 200, height: 100, channels: 3, background: '#00ff00' },
  })
    .png()
    .toBuffer();

  const result = await withoutCloudinary(() => processImage({ buffer: input }));
  const meta = await sharp(Buffer.from(result.split(',')[1], 'base64')).metadata();
  assert.equal(meta.width, 200);
  assert.equal(meta.height, 100);
});

test('extractCloudinaryPublicId returns null for unusable URLs', () => {
  assert.equal(extractCloudinaryPublicId(null), null);
  assert.equal(extractCloudinaryPublicId(undefined), null);
  assert.equal(extractCloudinaryPublicId(''), null);
  assert.equal(extractCloudinaryPublicId(123), null);
  assert.equal(extractCloudinaryPublicId('https://example.com/image.jpg'), null);
  assert.equal(extractCloudinaryPublicId('https://res.cloudinary.com/demo/image/upload'), null);
});

test('extractCloudinaryPublicId strips the version and file extension', () => {
  assert.equal(
    extractCloudinaryPublicId(
      'https://res.cloudinary.com/demo/image/upload/v123/campus-lost-found/abc.jpg'
    ),
    'campus-lost-found/abc'
  );
});

test('extractCloudinaryPublicId supports nested folders and missing versions', () => {
  assert.equal(
    extractCloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/folder/sub/photo.PNG'),
    'folder/sub/photo'
  );
  assert.equal(
    extractCloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/v1/folder/sub/noext'),
    'folder/sub/noext'
  );
});

test('destroyCloudinaryImage ignores non-Cloudinary URLs without throwing', async () => {
  await assert.doesNotReject(() => destroyCloudinaryImage('data:image/jpeg;base64,abc'));
  await assert.doesNotReject(() => destroyCloudinaryImage(null));
});
