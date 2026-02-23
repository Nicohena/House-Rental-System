/**
 * Input Validation and Sanitization Utilities
 * Provides functions to validate and sanitize user inputs to prevent XSS and ensure data integrity
 */

/**
 * Sanitize string input to prevent XSS attacks
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized string
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  
  // Remove HTML tags and script elements
  const withoutTags = input.replace(/<\/?[^>]+(>|$)/g, '');
  
  // Encode special characters
  const sanitized = withoutTags
    .replace(/[&<>"']/g, (char) => {
      const escapeChars = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
      };
      return escapeChars[char];
    });
  
  return sanitized.trim();
};

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate phone number (Ethiopian format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone format
 */
export const isValidPhone = (phone) => {
  if (typeof phone !== 'string') return false;
  
  // Ethiopian phone format: +251 or 0 followed by 9 digits
  const phoneRegex = /^(\+251|0)?[97]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with isValid and message
 */
export const validatePassword = (password) => {
  if (typeof password !== 'string') {
    return { isValid: false, message: 'Password must be a string' };
  }

  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return {
      isValid: false,
      message: 'Password must contain uppercase, lowercase, and numbers',
    };
  }

  return { isValid: true, message: 'Password is strong' };
};

/**
 * Sanitize object by removing potentially dangerous properties
 * @param {object} obj - Object to sanitize
 * @param {array} allowedKeys - Array of allowed property keys
 * @returns {object} - Sanitized object
 */
export const sanitizeObject = (obj, allowedKeys = []) => {
  if (typeof obj !== 'object' || obj === null) return {};

  const sanitized = {};
  const keysToProcess = allowedKeys.length > 0 ? allowedKeys : Object.keys(obj);

  keysToProcess.forEach((key) => {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'string' ? sanitizeString(item) : item
        );
      } else {
        sanitized[key] = value;
      }
    }
  });

  return sanitized;
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
export const isValidUrl = (url) => {
  if (typeof url !== 'string') return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate numeric input within range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean} - True if within range
 */
export const isInRange = (value, min, max) => {
  const num = Number(value);
  if (isNaN(num)) return false;
  return num >= min && num <= max;
};

/**
 * Sanitize filename to prevent directory traversal attacks
 * @param {string} filename - Filename to sanitize
 * @returns {string} - Sanitized filename
 */
export const sanitizeFilename = (filename) => {
  if (typeof filename !== 'string') return '';
  
  // Remove path separators and control characters
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/[^\w\s.-]/g, '')
    .trim();
};

/**
 * Validate and sanitize search query
 * @param {string} query - Search query to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Sanitized query
 */
export const sanitizeSearchQuery = (query, maxLength = 100) => {
  if (typeof query !== 'string') return '';
  
  const sanitized = sanitizeString(query);
  return sanitized.substring(0, maxLength);
};

/**
 * Validate date format and range
 * @param {string|Date} date - Date to validate
 * @param {Date} minDate - Minimum allowed date
 * @param {Date} maxDate - Maximum allowed date
 * @returns {boolean} - True if valid date within range
 */
export const isValidDate = (date, minDate = null, maxDate = null) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return false;
  
  if (minDate && dateObj < minDate) return false;
  if (maxDate && dateObj > maxDate) return false;
  
  return true;
};

/**
 * Validate Ethiopian Birr amount
 * @param {number} amount - Amount to validate
 * @returns {object} - Validation result
 */
export const validateAmount = (amount) => {
  const num = Number(amount);
  
  if (isNaN(num)) {
    return { isValid: false, message: 'Amount must be a number' };
  }
  
  if (num < 0) {
    return { isValid: false, message: 'Amount cannot be negative' };
  }
  
  if (num > 1000000000) {
    return { isValid: false, message: 'Amount exceeds maximum allowed value' };
  }
  
  return { isValid: true, message: 'Valid amount' };
};
