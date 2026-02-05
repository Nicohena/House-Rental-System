/**
 * Role-Based Access Control Middleware
 * 
 * Controls access to routes based on user roles
 * Roles: tenant, owner, admin
 */

/**
 * Authorize specific roles
 * Factory function that returns middleware
 * @param {...string} roles - Allowed roles
 * @returns {Function} - Express middleware
 * 
 * @example
 * // Allow only admin
 * router.get('/admin-only', protect, authorize('admin'), handler);
 * 
 * // Allow owner and admin
 * router.get('/owner-data', protect, authorize('owner', 'admin'), handler);
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 * Shorthand middleware for admin-only routes
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.'
    });
  }

  next();
};

/**
 * Check if user is owner (landlord)
 * Shorthand middleware for owner-only routes
 */
const isOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Property owner access required.'
    });
  }

  next();
};

/**
 * Check if user is tenant (renter)
 * Shorthand middleware for tenant-only routes
 */
const isTenant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'tenant' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Tenant access required.'
    });
  }

  next();
};

/**
 * Check if user is verified
 * Can be combined with other role checks
 */
const isVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (!req.user.verified) {
    return res.status(403).json({
      success: false,
      message: 'Account verification required. Please verify your email.'
    });
  }

  next();
};

/**
 * Create a custom permission check
 * @param {Function} checkFn - Function that takes (req, user) and returns boolean
 * @param {string} message - Error message if check fails
 * @returns {Function} - Express middleware
 * 
 * @example
 * const canEditHouse = customPermission(
 *   (req, user) => req.house.ownerId.equals(user._id),
 *   'You can only edit your own houses'
 * );
 */
const customPermission = (checkFn, message = 'Permission denied') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    try {
      const hasPermission = checkFn(req, req.user);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

module.exports = {
  authorize,
  isAdmin,
  isOwner,
  isTenant,
  isVerified,
  customPermission
};
