const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const MaintenanceLog = require('../models/MaintenanceLog');
const ApiError = require('../utils/ApiError');
const ApiFeatures = require('../utils/ApiFeatures');
const maintenanceService = require('../services/maintenanceService');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array().map((e) => ({ field: e.path, message: e.msg })));
  }
  next();
};

const maintenanceValidator = [
  body('vehicle').isMongoId().withMessage('A valid vehicle is required'),
  body('serviceType').notEmpty().withMessage('Service type is required'),
  body('cost').isFloat({ min: 0 }).withMessage('Cost must be a non-negative number'),
  body('date').optional().isISO8601(),
  body('notes').optional().trim(),
  body('vendor').optional().trim(),
  validate,
];

const POPULATE = { path: 'vehicle', select: 'registrationNumber vehicleName status' };

// @route GET /api/maintenance
const getMaintenanceLogs = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(MaintenanceLog.find(), req.query)
    .filter(['status', 'vehicle', 'serviceType'])
    .sort()
    .paginate();

  const [logs, total] = await Promise.all([features.query.populate(POPULATE), features.countQuery]);

  res.status(200).json({
    success: true,
    data: logs,
    pagination: { page: features.page, limit: features.limit, total, pages: Math.ceil(total / features.limit) },
  });
});

// @route GET /api/maintenance/:id
const getMaintenanceById = asyncHandler(async (req, res) => {
  const log = await MaintenanceLog.findById(req.params.id).populate(POPULATE);
  if (!log) throw new ApiError(404, 'Maintenance record not found.');
  res.status(200).json({ success: true, data: log });
});

// @route POST /api/maintenance — opens a record and flips vehicle to In Shop
const createMaintenance = asyncHandler(async (req, res) => {
  const log = await maintenanceService.openMaintenance({ ...req.body, createdBy: req.user._id });
  await log.populate(POPULATE);
  res.status(201).json({ success: true, data: log });
});

// @route POST /api/maintenance/:id/close — closes record, restores vehicle status
const closeMaintenance = asyncHandler(async (req, res) => {
  const log = await maintenanceService.closeMaintenance(req.params.id);
  await log.populate(POPULATE);
  res.status(200).json({ success: true, data: log });
});

// @route PATCH /api/maintenance/:id — edit non-status fields only
const updateMaintenance = asyncHandler(async (req, res) => {
  const log = await MaintenanceLog.findById(req.params.id);
  if (!log) throw new ApiError(404, 'Maintenance record not found.');
  const { status, vehicle, ...safeFields } = req.body;
  Object.assign(log, safeFields);
  await log.save();
  await log.populate(POPULATE);
  res.status(200).json({ success: true, data: log });
});

// @route DELETE /api/maintenance/:id
const deleteMaintenance = asyncHandler(async (req, res) => {
  const log = await MaintenanceLog.findById(req.params.id);
  if (!log) throw new ApiError(404, 'Maintenance record not found.');
  if (log.status === 'Active') {
    throw new ApiError(422, 'Close this maintenance record before deleting it.');
  }
  await log.deleteOne();
  res.status(200).json({ success: true, message: 'Maintenance record deleted.' });
});

module.exports = {
  getMaintenanceLogs,
  getMaintenanceById,
  createMaintenance,
  closeMaintenance,
  updateMaintenance,
  deleteMaintenance,
  maintenanceValidator,
};