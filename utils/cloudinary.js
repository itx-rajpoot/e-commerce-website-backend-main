const cloudinary = require('cloudinary').v2;
require('dotenv').config();

if (process.env.CLOUDINARY_URL) {
  try {
    cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
  } catch (err) {
    console.warn('Cloudinary config warning:', err.message || err);
  }
}

module.exports = cloudinary;
