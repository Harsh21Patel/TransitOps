const asyncHandler = require('express-async-handler');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const ApiError = require('../utils/ApiError');
const ApiFeatures = require('../utils/ApiFeatures');

// @route GET /api/drivers
const getDrivers = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(Driver.find(), req.query)
    .search(['name', 'licenseNumber', 'contact'])
    .filter(['status', 'category'])
    .sort()
    .paginate();

  const [drivers, total] = await Promise.all([features.query, features.countQuery]);

  // Dynamically calculate trip completion rates for the retrieved drivers
  const driverIds = drivers.map(d => d._id);
  const tripStats = await Trip.aggregate([
    { $match: { driver: { $in: driverIds } } },
    {
      $group: {
        _id: '$driver',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } }
      }
    }
  ]);

  const statsMap = Object.fromEntries(tripStats.map(s => [String(s._id), s]));

  const driversWithStats = drivers.map(d => {
    const s = statsMap[String(d._id)];
    const tripCompletionRate = s && s.total > 0 ? Math.round((s.completed / s.total) * 100) : 100;
    return {
      ...d.toObject({ virtuals: true }),
      tripCompletionRate
    };
  });

  res.status(200).json({
    success: true,
    data: driversWithStats,
    pagination: { page: features.page, limit: features.limit, total, pages: Math.ceil(total / features.limit) },
  });
});

// @route GET /api/drivers/expiring-licenses?days=30
const getExpiringLicenses = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 30;
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const drivers = await Driver.find({ licenseExpiry: { $lte: cutoff } }).sort('licenseExpiry');
  res.status(200).json({ success: true, data: drivers });
});

// @route GET /api/drivers/:id
const getDriverById = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) throw new ApiError(404, 'Driver not found.');

  const completed = await Trip.countDocuments({ driver: driver._id, status: 'Completed' });
  const total = await Trip.countDocuments({ driver: driver._id });
  const tripCompletionRate = total > 0 ? Math.round((completed / total) * 100) : 100;

  res.status(200).json({
    success: true,
    data: {
      ...driver.toObject({ virtuals: true }),
      tripCompletionRate
    }
  });
});

// @route POST /api/drivers
const createDriver = asyncHandler(async (req, res) => {
  const existing = await Driver.findOne({ licenseNumber: req.body.licenseNumber?.toUpperCase() });
  if (existing) {
    throw new ApiError(409, `A driver with license number "${req.body.licenseNumber}" already exists.`);
  }
  const driver = await Driver.create(req.body);
  res.status(201).json({ success: true, data: driver });
});

// @route PATCH /api/drivers/:id
const updateDriver = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) throw new ApiError(404, 'Driver not found.');

  if (req.body.licenseNumber && req.body.licenseNumber.toUpperCase() !== driver.licenseNumber) {
    const dupe = await Driver.findOne({ licenseNumber: req.body.licenseNumber.toUpperCase() });
    if (dupe) {
      throw new ApiError(409, `A driver with license number "${req.body.licenseNumber}" already exists.`);
    }
  }

  Object.assign(driver, req.body);
  await driver.save();
  res.status(200).json({ success: true, data: driver });
});

// @route DELETE /api/drivers/:id
const deleteDriver = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) throw new ApiError(404, 'Driver not found.');

  const activeTrip = await Trip.findOne({ driver: driver._id, status: { $in: ['Draft', 'Dispatched'] } });
  if (activeTrip) {
    throw new ApiError(422, 'Cannot delete a driver with an active or draft trip. Cancel or complete it first.');
  }

  await driver.deleteOne();
  res.status(200).json({ success: true, message: 'Driver deleted.' });
});

module.exports = {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  getExpiringLicenses,
};