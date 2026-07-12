const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  refresh,
  logout,
  getMe,
  changePassword,
} = require('../controllers/authController');
const { protect, restrictTo } = require('../middlewares/auth');
const { ROLES } = require('../config/roles');
const {
  registerValidator,
  loginValidator,
  changePasswordValidator,
} = require('../validators/authValidator');

const router = express.Router();

// Stricter limiter on auth endpoints to slow down credential stuffing / brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Please try again later.' },
});

router.post('/login', authLimiter, loginValidator, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Only an existing Admin can provision new staff accounts.
router.post(
  '/register',
  protect,
  restrictTo(ROLES.ADMIN),
  registerValidator,
  register
);

router.get('/me', protect, getMe);
router.patch('/change-password', protect, changePasswordValidator, changePassword);

module.exports = router;
