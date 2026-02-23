/**
 * Smart House Rental System - Main Server Entry Point (Production Ready)
 * 
 * Features:
 * - Express.js REST API (v1)
 * - MongoDB with Mongoose ODM
 * - JWT Authentication
 * - Socket.io for real-time chat & notifications
 * - Security: Rate limiting, Helmet, Mongo Sanitize, XSS Clean
 * - Logging: Winston & Morgan structured logging
 * - Health check with DB status
 * - Graceful shutdown and process handling
 */

require('dotenv').config();
const express = require('express'); // Restore express import
const path = require('path'); // Add path module

// ... (existing imports)



// ...


const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

// Internal imports
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { errorHandler } = require('./middlewares/errorHandler');
const setupSocketHandlers = require('./utils/socketHandlers');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const houseRoutes = require('./routes/houseRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const uploadRoutes = require('./routes/uploadRoutes'); // Import upload routes

// ============================================
// ENVIRONMENT VARIABLE VALIDATION
// ============================================
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'CHAPA_SECRET_KEY',
  'STRIPE_SECRET_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    logger.error(`❌ CRITICAL ERROR: Environment variable ${envVar} is missing!`);
    process.exit(1);
  }
});

// ============================================
// INITIALIZATION
// ============================================
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with flexible CORS for development
const allowedOrigins = process.env.CLIENT_URL 
  ? [process.env.CLIENT_URL] 
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Setup Socket.io event handlers
setupSocketHandlers(io);

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - allow multiple development ports
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) return callback(null, true);
    
    // In development, allow all localhost origins
    if (process.env.NODE_ENV !== 'production') {
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    // In production, check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting - prevent brute force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging (Morgan + Winston)
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, { 
  stream: { write: (message) => logger.http(message.trim()) } 
}));

// Make io accessible in controllers through req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ============================================
// API ROUTES
// ============================================

// Health check endpoint with DB connectivity
app.get('/api/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.status(200).json({
    success: true,
    message: 'Smart Rental System API is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dbStatus,
    environment: process.env.NODE_ENV
  });
});

// Versioned API Routes (v1)
app.use('/api/v1/upload', uploadRoutes); // Add upload routes here
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/houses', houseRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);

// Compatibility fallback for old routes (optional but helpful during transition)
app.use('/api/upload', uploadRoutes); // Register upload routes fallback
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/recommendations', recommendationRoutes);

// ============================================
// GEOCODING PROXY (avoids browser CORS with Nominatim)
// ============================================
const axios = require('axios');

app.get('/api/geocode/reverse', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ success: false, message: 'lat and lon are required' });
  }
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      { 
        headers: { 
          'User-Agent': 'SmartRentalSystem/1.0 (contact@smartrent.com)',
          'Accept-Language': 'en'
        },
        timeout: 10000
      }
    );
    res.json(response.data);
  } catch (err) {
    logger.error('Reverse geocoding proxy error:', {
      message: err.message,
      code: err.code,
      response: err.response ? {
        status: err.response.status,
        data: err.response.data
      } : 'No response from Nominatim'
    });
    const status = err.code === 'ECONNABORTED' ? 504 : 502;
    res.status(status).json({ success: false, message: err.code === 'ECONNABORTED' ? 'Geocoding request timed out. Please try again.' : 'Geocoding service unavailable' });
  }
});

app.get('/api/geocode/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ success: false, message: 'q (query) is required' });
  }
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
      { 
        headers: { 
          'User-Agent': 'SmartRentalSystem/1.0 (contact@smartrent.com)',
          'Accept-Language': 'en'
        },
        timeout: 10000
      }
    );
    res.json(response.data);
  } catch (err) {
    logger.error('Forward geocoding proxy error:', {
      message: err.message,
      code: err.code,
      response: err.response ? {
        status: err.response.status,
        data: err.response.data
      } : 'No response from Nominatim'
    });
    const status = err.code === 'ECONNABORTED' ? 504 : 502;
    res.status(status).json({ success: false, message: err.code === 'ECONNABORTED' ? 'Geocoding request timed out. Please try again.' : 'Geocoding service unavailable' });
  }
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

// ============================================
// SERVER STARTUP & GRACEFUL SHUTDOWN
// ============================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      logger.info(`📍 API Base URL: http://localhost:${PORT}/api/v1`);
      logger.info(`🔌 Socket.io: Enabled`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
const gracefulShutdown = () => {
  logger.info('🛑 Received kill signal, shutting down gracefully...');
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during MongoDB closure:', err.message);
      process.exit(1);
    }
  });

  // Force close after 10s if graceful shutdown fails
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('❌ Unhandled Promise Rejection:', err);
  if (server && server.listening) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Initialize
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { app, io };
