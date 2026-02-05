/**
 * Global Error Handler Middleware
 * 
 * Catches all errors and returns consistent error responses
 * Provides different levels of detail based on environment
 */

/**
 * Custom Error class for API errors
 * Allows setting status code and additional data
 */
class ApiError extends Error {
  constructor(message, statusCode, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error type definitions for common errors
 */
const ErrorTypes = {
  BAD_REQUEST: { statusCode: 400, message: 'Bad Request' },
  UNAUTHORIZED: { statusCode: 401, message: 'Unauthorized' },
  FORBIDDEN: { statusCode: 403, message: 'Forbidden' },
  NOT_FOUND: { statusCode: 404, message: 'Not Found' },
  CONFLICT: { statusCode: 409, message: 'Conflict' },
  VALIDATION_ERROR: { statusCode: 422, message: 'Validation Error' },
  INTERNAL_ERROR: { statusCode: 500, message: 'Internal Server Error' }
};

/**
 * Handle Mongoose CastError (invalid ObjectId)
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ApiError(message, 400);
};

/**
 * Handle Mongoose Duplicate Key Error
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const message = `${field} already exists. Please use a different ${field}.`;
  return new ApiError(message, 409);
};

/**
 * Handle Mongoose Validation Error
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(e => ({
    field: e.path,
    message: e.message
  }));
  return new ApiError('Validation failed', 422, { errors });
};

/**
 * Handle JWT Errors
 */
const handleJWTError = () => {
  return new ApiError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
  return new ApiError('Your token has expired. Please log in again.', 401);
};

/**
 * Send error response in development environment
 * Includes full error details and stack trace
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
    data: err.data
  });
};

/**
 * Send error response in production environment
 * Hides internal error details from client
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: err.data
    });
  } 
  // Programming or other unknown error: don't leak error details
  else {
    // Log error for debugging
    console.error('ERROR 💥:', err);

    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.'
    });
  }
};

/**
 * Main error handler middleware
 * Must have 4 parameters for Express to recognize it as error handler
 */
const errorHandler = (err, req, res, next) => {
  // Set default values
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Handle specific error types
  let error = { ...err };
  error.message = err.message;

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    error = handleCastError(err);
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }
  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Send appropriate response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * Async handler wrapper to catch errors in async functions
 * Eliminates need for try-catch in every controller
 * 
 * @example
 * const getUser = asyncHandler(async (req, res) => {
 *   const user = await User.findById(req.params.id);
 *   res.json(user);
 * });
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Not found handler for undefined routes
 */
const notFound = (req, res, next) => {
  const error = new ApiError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFound,
  ApiError,
  ErrorTypes
};
