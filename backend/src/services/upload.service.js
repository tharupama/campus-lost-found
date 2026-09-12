const sharp = require('sharp');
const cloudinary = require('../config/cloudinary');

async function processImage(file) {
  if (!file || !file.buffer) return null;

  const buffer = await sharp(file.buffer)
    .resize({ width: 900, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  if (process.env.CLOUDINARY_CLOUD_NAME) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'campus-lost-found', resource_type: 'image' },
        (err, result) => {
          if (err) reject(new Error(`Cloudinary upload failed: ${err.message}`));
          else resolve(result.secure_url);
        }
      );
      stream.end(buffer);
    });
  }

  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

module.exports = { processImage };