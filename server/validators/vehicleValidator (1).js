const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const { VEHICLE_STATUS, VEHICLE_TYPES } = require('../models/Vehicle');

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

const vehicleValidator = [
  body('registrationNumber').trim().notEmpty().withMessage('Registration number is required'),
  body('vehicleName').trim().notEmpty().withMessage('Vehicle name is required'),
  body('model').trim().notEmpty().withMessage('Model is required'),
  body('vehicleType').isIn(VEHICLE_TYPES).withMessage('Invalid vehicle type'),
  body('capacity').isFloat({ min: 0 }).withMessage('Capacity must be a non-negative number'),
  body('acquisitionCost').isFloat({ min: 0 }).withMessage('Acquisition cost must be a non-negative number'),
  body('odometer').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(VEHICLE_STATUS),
  validate,
];

const vehicleUpdateValidator = [
  body('registrationNumber').optional().trim().notEmpty(),
  body('vehicleName').optional().trim().notEmpty(),
  body('model').optional().trim().notEmpty(),
  body('vehicleType').optional().isIn(VEHICLE_TYPES),
  body('capacity').optional().isFloat({ min: 0 }),
  body('acquisitionCost').optional().isFloat({ min: 0 }),
  body('odometer').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(VEHICLE_STATUS),
  validate,
];

module.exports = { vehicleValidator, vehicleUpdateValidator };