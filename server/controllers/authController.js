const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
} = require('../utils/tokenUtils');

const issueTokensAndRespond = async (res, user, rememberMe, statusCode = 200) => {
  const accessToken = generateAccessToken(user);
  const { token: refreshToken, expiresAt } = generateRefreshToken(user, rememberMe);

  user.addRefreshToken(refreshToken, expiresAt);
  user.lastLoginAt = new Date();
  await user.save();

  setRefreshCookie(res, refreshToken, expiresAt);

  res.status(statusCode).json({
    success: true,
    data: {
      user: user.toSafeObject(),
      accessToken,
      accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    },
  });
};

// @route  POST /api/auth/register
// @access Admin only (creating additional staff accounts). First bootstrap
//         admin should be created via the seed script, not this endpoint.
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const user = await User.create({ name, email, password, role, phone });
  res.status(201).json({ success: true, data: { user: user.toSafeObject() } });
});

// @route  POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'This account has been deactivated. Contact an administrator.');
  }

  await issueTokensAndRespond(res, user, Boolean(rememberMe));
});

// @route  POST /api/auth/refresh
// Reads the httpOnly refresh cookie, validates it against the stored hash,
// rotates it (old one invalidated, new one issued), and returns a fresh
// access token. Rotation limits the blast radius if a refresh token leaks.
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    throw new ApiError(401, 'No refresh token provided.');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    clearRefreshCookie(res);
    throw new ApiError(401, 'Refresh token invalid or expired. Please log in again.');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.hasRefreshToken(token)) {
    clearRefreshCookie(res);
    throw new ApiError(401, 'Refresh token invalid or expired. Please log in again.');
  }

  user.removeRefreshToken(token); // rotate: invalidate the one just used
  await issueTokensAndRespond(res, user, true);
});

// @route  POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];

  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      const user = await User.findById(decoded.id);
      if (user) {
        user.removeRefreshToken(token);
        await user.save();
      }
    } catch (err) {
      // Token already invalid/expired — nothing to clean up server-side.
    }
  }

  clearRefreshCookie(res);
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// @route  GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user.toSafeObject() } });
});

// @route  PATCH /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect.');
  }

  user.password = newPassword;
  user.refreshTokens = []; // force re-login on all other devices
  await user.save();

  clearRefreshCookie(res);
  res.status(200).json({
    success: true,
    message: 'Password changed successfully. Please log in again.',
  });
});

module.exports = { register, login, refresh, logout, getMe, changePassword };
