const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const FuelLog = require('../models/FuelLog');
const ApiError = require('../utils/ApiError');
const ApiFeatures = require('../utils/ApiFeatures');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array().map((e) => ({ field: e.path, message: e.msg })));
  }
  next();
};

const fuelLogValidator = [
  body('vehicle').isMongoId().withMessage('A valid vehicle ID is required'),
  body('liters').isFloat({ min: 0.01 }).withMessage('Liters must be greater than 0'),
  body('fuelPrice').isFloat({ min: 0 }).withMessage('Fuel price must be non-negative'),
  body('date').optional().isISO8601(),
  body('odometerAtFillUp').optional().isFloat({ min: 0 }),
  body('distanceSinceLastFillUp').optional().isFloat({ min: 0 }),
  validate,
];

const POPULATE = { path: 'vehicle', select: 'registrationNumber vehicleName' };

// @route GET /api/fuel-logs
const getFuelLogs = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(FuelLog.find(), req.query)
    .filter(['vehicle'])
    .sort()
    .paginate();

  const [logs, total] = await Promise.all([features.query.populate(POPULATE), features.countQuery]);

  res.status(200).json({
    success: true,
    data: logs,
    pagination: { page: features.page, limit: features.limit, total, pages: Math.ceil(total / features.limit) },
  });
});

// @route GET /api/fuel-logs/:id
const getFuelLogById = asyncHandler(async (req, res) => {
  const log = await FuelLog.findById(req.params.id).populate(POPULATE);
  if (!log) throw new ApiError(404, 'Fuel log not found.');
  res.status(200).json({ success: true, data: log });
});

// @route POST /api/fuel-logs
const createFuelLog = asyncHandler(async (req, res) => {
  const log = await FuelLog.create({ ...req.body, createdBy: req.user._id });
  await log.populate(POPULATE);
  res.status(201).json({ success: true, data: log });
});

// @route PATCH /api/fuel-logs/:id
const updateFuelLog = asyncHandler(async (req, res) => {
  const log = await FuelLog.findById(req.params.id);
  if (!log) throw new ApiError(404, 'Fuel log not found.');
  Object.assign(log, req.body);
  await log.save(); // triggers pre-save to recompute cost + efficiency
  await log.populate(POPULATE);
  res.status(200).json({ success: true, data: log });
});

// @route DELETE /api/fuel-logs/:id
const deleteFuelLog = asyncHandler(async (req, res) => {
  const log = await FuelLog.findById(req.params.id);
  if (!log) throw new ApiError(404, 'Fuel log not found.');
  await log.deleteOne();
  res.status(200).json({ success: true, message: 'Fuel log deleted.' });
});

module.exports = { getFuelLogs, getFuelLogById, createFuelLog, updateFuelLog, deleteFuelLog, fuelLogValidator };