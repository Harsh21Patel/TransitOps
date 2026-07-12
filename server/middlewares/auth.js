const asyncHandler = require('express-async-handler');
const { verifyAccessToken } = require('../utils/tokenUtils');
const { PERMISSIONS } = require('../config/roles');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Verifies the access token from the Authorization header and attaches
 * `req.user` (the full Mongoose document, minus password) to the request.
 * No unauthenticated request should reach a controller past this point.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized. No access token provided.');
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token expired.', 'TOKEN_EXPIRED');
    }
    throw new ApiError(401, 'Not authorized. Invalid access token.');
  }

  if (decoded.tokenType !== 'access') {
    throw new ApiError(401, 'Not authorized. Wrong token type.');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, 'Not authorized. User no longer exists.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'This account has been deactivated.');
  }

  if (user.changedPasswordAfter(decoded.iat)) {
    throw new ApiError(401, 'Password was changed recently. Please log in again.');
  }

  req.user = user;
  next();
});

/**
 * Role-based access: restricts a route to an explicit list of roles.
 * Usage: router.post('/vehicles', protect, restrictTo('Admin', 'Fleet Manager'), handler)
 */
const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Not authorized.');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to perform this action.');
    }
    next();
  };
};

/**
 * Resource-based access: checks the central PERMISSIONS matrix so route
 * files stay declarative and the matrix stays the single source of truth.
 * Usage: router.get('/vehicles', protect, authorize('vehicles', 'read'), handler)
 */
const authorize = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Not authorized.');
    }
    const resourcePerms = PERMISSIONS[resource];
    if (!resourcePerms || !resourcePerms[action]) {
      throw new ApiError(500, `Unknown permission check: ${resource}.${action}`);
    }
    if (!resourcePerms[action].includes(req.user.role)) {
      throw new ApiError(
        403,
        `Your role (${req.user.role}) does not have "${action}" access to ${resource}.`
      );
    }
    next();
  };
};

module.exports = { protect, restrictTo, authorize };
