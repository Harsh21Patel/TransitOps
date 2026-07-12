const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

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

const tripValidator = [
  body('source').trim().notEmpty().withMessage('Source is required'),
  body('destination').trim().notEmpty().withMessage('Destination is required'),
  body('vehicle').isMongoId().withMessage('A valid vehicle is required'),
  body('driver').isMongoId().withMessage('A valid driver is required'),
  body('cargoWeight').isFloat({ min: 0 }).withMessage('Cargo weight must be a non-negative number'),
  body('distance').isFloat({ min: 0 }).withMessage('Distance must be a non-negative number'),
  validate,
];

const tripUpdateValidator = [
  body('source').optional().trim().notEmpty(),
  body('destination').optional().trim().notEmpty(),
  body('vehicle').optional().isMongoId(),
  body('driver').optional().isMongoId(),
  body('cargoWeight').optional().isFloat({ min: 0 }),
  body('distance').optional().isFloat({ min: 0 }),
  validate,
];

const cancelTripValidator = [
  body('reason').optional().trim(),
  validate,
];

module.exports = { tripValidator, tripUpdateValidator, cancelTripValidator };