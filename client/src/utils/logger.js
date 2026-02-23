/**
 * Logger Utility
 * Provides consistent logging across the application with support for
 * different log levels and future integration with error tracking services.
 */

const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

const isDevelopment = import.meta.env.MODE === 'development';

class Logger {
  constructor() {
    this.errorTrackingEnabled = false;
    this.errorTracker = null;
  }

  /**
   * Initialize error tracking service (e.g., Sentry)
   * @param {Object} tracker - Error tracking service instance
   */
  initErrorTracking(tracker) {
    this.errorTrackingEnabled = true;
    this.errorTracker = tracker;
  }

  /**
   * Format log message with timestamp and context
   */
  _formatMessage(level, message, context) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level,
      message,
      context,
    };
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message, context = {}) {
    if (isDevelopment) {
      const formatted = this._formatMessage(LOG_LEVELS.DEBUG, message, context);
      console.debug('[DEBUG]', formatted.message, formatted.context);
    }
  }

  /**
   * Log informational messages
   */
  info(message, context = {}) {
    const formatted = this._formatMessage(LOG_LEVELS.INFO, message, context);
    if (isDevelopment) {
      console.info('[INFO]', formatted.message, formatted.context);
    }
  }

  /**
   * Log warning messages
   */
  warn(message, context = {}) {
    const formatted = this._formatMessage(LOG_LEVELS.WARN, message, context);
    console.warn('[WARN]', formatted.message, formatted.context);
    
    // Send to error tracker if available
    if (this.errorTrackingEnabled && this.errorTracker) {
      this.errorTracker.captureMessage(message, 'warning', context);
    }
  }

  /**
   * Log error messages and send to error tracking service
   */
  error(message, error = null, context = {}) {
    const formatted = this._formatMessage(LOG_LEVELS.ERROR, message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : null,
    });

    console.error('[ERROR]', formatted.message, formatted.context);

    // Send to error tracker if available
    if (this.errorTrackingEnabled && this.errorTracker) {
      if (error instanceof Error) {
        this.errorTracker.captureException(error, context);
      } else {
        this.errorTracker.captureMessage(message, 'error', context);
      }
    }
  }

  /**
   * Log API errors with request details
   */
  apiError(endpoint, error, context = {}) {
    this.error(`API Error: ${endpoint}`, error, {
      ...context,
      endpoint,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });
  }

  /**
   * Log user actions for analytics
   */
  logUserAction(action, data = {}) {
    if (isDevelopment) {
      console.log('[USER ACTION]', action, data);
    }

    // Future: Send to analytics service
    // analytics.track(action, data);
  }
}

// Export singleton instance
const logger = new Logger();

export default logger;
