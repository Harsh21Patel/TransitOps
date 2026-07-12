const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { ALL_ROLES, ROLES } = require('../config/roles');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ALL_ROLES,
      default: ROLES.DISPATCHER,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    // Hashed refresh tokens, one per active session/device, so logout-all and
    // per-device revocation are both possible without storing raw tokens.
    refreshTokens: [
      {
        tokenHash: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        createdAt: { type: Date, default: Date.now },
        userAgent: { type: String, default: '' },
      },
    ],
    passwordChangedAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

// Hash password before save
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
  next();
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Refresh tokens are stored as SHA-256 hashes so a DB leak doesn't expose usable tokens.
userSchema.methods.addRefreshToken = function addRefreshToken(rawToken, expiresAt, userAgent = '') {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.refreshTokens.push({ tokenHash, expiresAt, userAgent });
  // Cap stored sessions to prevent unbounded growth
  if (this.refreshTokens.length > 10) {
    this.refreshTokens = this.refreshTokens.slice(-10);
  }
};

userSchema.methods.hasRefreshToken = function hasRefreshToken(rawToken) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return this.refreshTokens.some(
    (t) => t.tokenHash === tokenHash && t.expiresAt > new Date()
  );
};

userSchema.methods.removeRefreshToken = function removeRefreshToken(rawToken) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.refreshTokens = this.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
};

userSchema.methods.changedPasswordAfter = function changedPasswordAfter(jwtTimestamp) {
  if (!this.passwordChangedAt) return false;
  const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
  return jwtTimestamp < changedTimestamp;
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    avatarUrl: this.avatarUrl,
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
