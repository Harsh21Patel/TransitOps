const asyncHandler = require('express-async-handler');
const Vehicle = require('../models/Vehicle');
const Trip = require('../models/Trip');
const ApiError = require('../utils/ApiError');
const ApiFeatures = require('../utils/ApiFeatures');

// @route GET /api/vehicles
const getVehicles = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(Vehicle.find(), req.query)
    .search(['registrationNumber', 'vehicleName', 'model'])
    .filter(['status', 'vehicleType'])
    .sort()
    .paginate();

  const [vehicles, total] = await Promise.all([features.query, features.countQuery]);

  res.status(200).json({
    success: true,
    data: vehicles,
    pagination: { page: features.page, limit: features.limit, total, pages: Math.ceil(total / features.limit) },
  });
});

// @route GET /api/vehicles/:id
const getVehicleById = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id).populate('documents');
  if (!vehicle) throw new ApiError(404, 'Vehicle not found.');
  res.status(200).json({ success: true, data: vehicle });
});

// @route POST /api/vehicles
const createVehicle = asyncHandler(async (req, res) => {
  const existing = await Vehicle.findOne({ registrationNumber: req.body.registrationNumber?.toUpperCase() });
  if (existing) {
    throw new ApiError(409, `A vehicle with registration number "${req.body.registrationNumber}" already exists.`);
  }
  const vehicle = await Vehicle.create(req.body);
  res.status(201).json({ success: true, data: vehicle });
});

// @route PATCH /api/vehicles/:id
const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) throw new ApiError(404, 'Vehicle not found.');

  if (req.body.registrationNumber && req.body.registrationNumber.toUpperCase() !== vehicle.registrationNumber) {
    const dupe = await Vehicle.findOne({ registrationNumber: req.body.registrationNumber.toUpperCase() });
    if (dupe) {
      throw new ApiError(409, `A vehicle with registration number "${req.body.registrationNumber}" already exists.`);
    }
  }

  // Manual status changes to/from Retired are allowed here directly; transitions
  // driven by trip dispatch or maintenance go through their respective services.
  Object.assign(vehicle, req.body);
  await vehicle.save();
  res.status(200).json({ success: true, data: vehicle });
});

// @route DELETE /api/vehicles/:id
const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) throw new ApiError(404, 'Vehicle not found.');

  const activeTrip = await Trip.findOne({ vehicle: vehicle._id, status: { $in: ['Draft', 'Dispatched'] } });
  if (activeTrip) {
    throw new ApiError(422, 'Cannot delete a vehicle with an active or draft trip. Cancel or complete it first.');
  }

  await vehicle.deleteOne();
  res.status(200).json({ success: true, message: 'Vehicle deleted.' });
});

module.exports = { getVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle };