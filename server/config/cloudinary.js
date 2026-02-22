const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const logger = require('../utils/logger');

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CL_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CL_API_KEY || process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CL_API_SECRET || process.env.CLOUDINARY_API_SECRET
});

// Configure Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'rentals/uploads',
    allowed_formats: ['jpg', 'png', 'jpeg', 'mp3', 'wav', 'ogg', 'webm'],
    resource_type: 'auto' // Important for voice messages (audio/video)
  }
});

logger.info('☁️ Cloudinary storage configured');

module.exports = {
  cloudinary,
  storage
};
