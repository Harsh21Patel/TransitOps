const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const { DRIVER_STATUS, LICENSE_CATEGORIES } = require('../models/Driver');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(
      400,
      'Validation failed',
      'VALIDATION_ERROR',
      errors.array().map((e) => ({ field: e.path, message: e.msg }))
    );
  }
  next();
};

const driverValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('licenseNumber').trim().notEmpty().withMessage('License number is required'),
  body('category').isIn(LICENSE_CATEGORIES).withMessage('Invalid license category'),
  body('licenseExpiry').isISO8601().withMessage('License expiry must be a valid date'),
  body('contact').trim().notEmpty().withMessage('Contact number is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email'),
  body('safetyScore').optional().isFloat({ min: 0, max: 100 }),
  body('status').optional().isIn(DRIVER_STATUS),
  validate,
];

const driverUpdateValidator = [
  body('name').optional().trim().notEmpty(),
  body('licenseNumber').optional().trim().notEmpty(),
  body('category').optional().isIn(LICENSE_CATEGORIES),
  body('licenseExpiry').optional().isISO8601(),
  body('contact').optional().trim().notEmpty(),
  body('email').optional({ checkFalsy: true }).isEmail(),
  body('safetyScore').optional().isFloat({ min: 0, max: 100 }),
  body('status').optional().isIn(DRIVER_STATUS),
  validate,
];

module.exports = { driverValidator, driverUpdateValidator };

