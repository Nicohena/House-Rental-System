const multer = require('multer');
const { ApiError } = require('../middlewares/errorHandler');
const { storage } = require('../config/cloudinary');
const logger = require('../utils/logger');

// File filter
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith('image/') || 
    file.mimetype.startsWith('audio/') || 
    file.mimetype.startsWith('video/')
  ) {
    cb(null, true);
  } else {
    cb(new ApiError('Invalid file type! Please upload images, audio, or video files.', 400), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Increased to 10MB for voice messages
  }
});

/**
 * @desc    Upload single or multiple images
 * @route   POST /api/upload
 * @access  Private
 */
const uploadImages = (req, res) => {
  logger.info(`Received ${req.files ? req.files.length : 0} files for upload`);
  
  if (!req.files || req.files.length === 0) {
    logger.warn('Upload attempt with no files');
    throw new ApiError('No files uploaded', 400);
  }

  const fileUrls = req.files.map(file => {
    logger.info(`File uploaded to Cloudinary: ${file.path}`);
    return file.path;
  });

  res.status(200).json({
    success: true,
    message: 'Files uploaded successfully',
    data: fileUrls
  });
};

module.exports = {
  upload,
  uploadImages
};
