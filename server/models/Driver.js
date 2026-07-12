const mongoose = require('mongoose');

const DRIVER_STATUS = ['Available', 'On Trip', 'Off Duty', 'Suspended'];
const LICENSE_CATEGORIES = ['LMV', 'HMV', 'Motorcycle', 'Commercial', 'Hazmat'];

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      enum: LICENSE_CATEGORIES,
      required: true,
    },
    licenseExpiry: {
      type: Date,
      required: [true, 'License expiry date is required'],
    },
    contact: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    safetyScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: DRIVER_STATUS,
      default: 'Available',
    },
  },
  { timestamps: true }
);

driverSchema.index({ status: 1 });

// Virtual: true once the license expiry date has passed. Business rule:
// an expired license blocks dispatch regardless of `status`.
driverSchema.virtual('isLicenseExpired').get(function isLicenseExpired() {
  return this.licenseExpiry < new Date();
});

driverSchema.set('toJSON', { virtuals: true });
driverSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Driver', driverSchema);
module.exports.DRIVER_STATUS = DRIVER_STATUS;
module.exports.LICENSE_CATEGORIES = LICENSE_CATEGORIES;