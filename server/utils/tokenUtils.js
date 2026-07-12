const jwt = require('jsonwebtoken');
const ms = require('./ms');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, tokenType: 'access' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
};

const generateRefreshToken = (user, rememberMe = false) => {
  const expiresIn = rememberMe
    ? process.env.JWT_REFRESH_EXPIRES_IN_REMEMBER || '30d'
    : process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  const token = jwt.sign(
    { id: user._id, tokenType: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn }
  );

  const expiresAt = new Date(Date.now() + ms(expiresIn));
  return { token, expiresAt };
};

const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_ACCESS_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);

const REFRESH_COOKIE_NAME = 'transitops_rt';

const setRefreshCookie = (res, token, expiresAt) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/api/auth',
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
};
