const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ApiError } = require('../middlewares/errorHandler');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: fieldname-timestamp-random.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new ApiError('Invalid file type! Please upload images or audio files.', 400), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * @desc    Upload single or multiple images
 * @route   POST /api/upload
 * @access  Private
 */
const uploadImages = (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError('No files uploaded', 400);
  }

  const fileUrls = req.files.map(file => {
    // Construct URL based on server configuration
    // In production, this might be a full URL. For now, relative path.
    // The client will need to prepend the server URL if needed, 
    // or we return the full URL if we know the host.
    
    // Assuming relative path for simplicity, handled by client or static serve
    return `/uploads/${file.filename}`;
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
