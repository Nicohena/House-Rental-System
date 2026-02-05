const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { upload, uploadImages } = require('../controllers/uploadController');

// Upload endpoint
// Accepts 'images' field with multiple files
router.post('/', protect, upload.array('images', 10), uploadImages);

module.exports = router;
