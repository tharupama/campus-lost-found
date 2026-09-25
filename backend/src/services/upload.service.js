const sharp = require('sharp');
const cloudinary = require('../config/cloudinary');

async function processImage(file) {
  if (!file || !file.buffer) return null;

  const buffer = await sharp(file.buffer)
    .resize({ width: 900, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const cloudReady =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (cloudReady) {
    try {
      const url = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'campus-lost-found', resource_type: 'image' },
          (err, result) => {
            if (err) reject(err);
            else resolve(result.secure_url);
          }
        );
        stream.end(buffer);
      });
      return url;
    } catch (err) {
      console.error(
        `Cloudinary upload failed (${err.message}). Storing image in MongoDB instead.`
      );
    }
  }

  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

function extractCloudinaryPublicId(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.startsWith('https://res.cloudinary.com/')) return null;

  const parts = url.split('/');
  const idx = parts.indexOf('upload');
  if (idx === -1 || idx === parts.length - 1) return null;

  let rest = parts.slice(idx + 1);
  if (/^v\d+$/.test(rest[0])) rest = rest.slice(1);
  if (!rest.length) return null;

  rest[rest.length - 1] = rest[rest.length - 1].replace(/\.[a-zA-Z0-9]+$/, '');
  const publicId = rest.join('/');
  return publicId || null;
}

async function destroyCloudinaryImage(url) {
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) return;

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== 'ok') {
      console.warn(`Cloudinary destroy("${publicId}") -> ${result.result}`);
    }
  } catch (err) {
    console.error(`Failed to delete Cloudinary image "${publicId}": ${err.message}`);
  }
}

module.exports = { processImage, destroyCloudinaryImage, extractCloudinaryPublicId };