const asyncHandler = require('express-async-handler');
const Trip = require('../models/Trip');
const Driver = require('../models/Driver');
const ApiError = require('../utils/ApiError');
const ApiFeatures = require('../utils/ApiFeatures');
const dispatchService = require('../services/dispatchService');

const POPULATE = [
  { path: 'vehicle', select: 'registrationNumber vehicleName vehicleType capacity status' },
  { path: 'driver', select: 'name licenseNumber status licenseExpiry' },
];

const emitTripEvent = (req, event, trip) => {
  const io = req.app.get('io');
  if (io) io.emit(event, trip);
};

// @route GET /api/trips
const getTrips = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(Trip.find(), req.query)
    .search(['tripCode', 'source', 'destination'])
    .filter(['status'])
    .sort()
    .paginate();

  const [trips, total] = await Promise.all([
    features.query.populate(POPULATE),
    features.countQuery,
  ]);

  res.status(200).json({
    success: true,
    data: trips,
    pagination: { page: features.page, limit: features.limit, total, pages: Math.ceil(total / features.limit) },
  });
});

// @route GET /api/trips/board — grouped by status for the dispatch board UI
const getDispatchBoard = asyncHandler(async (req, res) => {
  const trips = await Trip.find({ status: { $in: ['Draft', 'Dispatched'] } })
    .populate(POPULATE)
    .sort('-createdAt');

  const board = {
    Draft: trips.filter((t) => t.status === 'Draft'),
    Dispatched: trips.filter((t) => t.status === 'Dispatched'),
  };

  res.status(200).json({ success: true, data: board });
});

// @route GET /api/trips/:id
const getTripById = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id).populate(POPULATE);
  if (!trip) throw new ApiError(404, 'Trip not found.');
  res.status(200).json({ success: true, data: trip });
});

// @route POST /api/trips — always created as Draft
const createTrip = asyncHandler(async (req, res) => {
  if (req.body.driver) {
    const driver = await Driver.findById(req.body.driver);
    if (!driver) throw new ApiError(404, 'Driver not found.');
    if (driver.status === 'Suspended' || driver.licenseExpiry < new Date()) {
      throw new ApiError(422, 'Cannot assign a suspended or license-expired driver to a trip.');
    }
  }

  const trip = await Trip.create({ ...req.body, status: 'Draft', createdBy: req.user._id });
  await trip.populate(POPULATE);
  emitTripEvent(req, 'trip:created', trip);
  res.status(201).json({ success: true, data: trip });
});

// @route PATCH /api/trips/:id — editing only allowed while still Draft
const updateTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) throw new ApiError(404, 'Trip not found.');
  if (trip.status !== 'Draft') {
    throw new ApiError(422, `Only Draft trips can be edited. This trip is ${trip.status}.`);
  }

  if (req.body.driver) {
    const driver = await Driver.findById(req.body.driver);
    if (!driver) throw new ApiError(404, 'Driver not found.');
    if (driver.status === 'Suspended' || driver.licenseExpiry < new Date()) {
      throw new ApiError(422, 'Cannot assign a suspended or license-expired driver to a trip.');
    }
  }

  Object.assign(trip, req.body);
  await trip.save();
  await trip.populate(POPULATE);
  res.status(200).json({ success: true, data: trip });
});

// @route DELETE /api/trips/:id — only Draft trips can be deleted outright
const deleteTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) throw new ApiError(404, 'Trip not found.');
  if (trip.status !== 'Draft') {
    throw new ApiError(422, 'Only Draft trips can be deleted. Cancel a dispatched trip instead.');
  }
  await trip.deleteOne();
  res.status(200).json({ success: true, message: 'Trip deleted.' });
});

// @route POST /api/trips/:id/dispatch
const dispatch = asyncHandler(async (req, res) => {
  const trip = await dispatchService.dispatchTrip(req.params.id);
  await trip.populate(POPULATE);
  emitTripEvent(req, 'trip:dispatched', trip);
  res.status(200).json({ success: true, data: trip });
});

// @route POST /api/trips/:id/complete
const complete = asyncHandler(async (req, res) => {
  const trip = await dispatchService.completeTrip(req.params.id);
  await trip.populate(POPULATE);
  emitTripEvent(req, 'trip:completed', trip);
  res.status(200).json({ success: true, data: trip });
});

// @route POST /api/trips/:id/cancel
const cancel = asyncHandler(async (req, res) => {
  const trip = await dispatchService.cancelTrip(req.params.id, req.body.reason);
  await trip.populate(POPULATE);
  emitTripEvent(req, 'trip:cancelled', trip);
  res.status(200).json({ success: true, data: trip });
});

module.exports = {
  getTrips,
  getDispatchBoard,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  dispatch,
  complete,
  cancel,
};