const Vehicle = require('../models/Vehicle');
const MaintenanceLog = require('../models/MaintenanceLog');
const ApiError = require('../utils/ApiError');

/**
 * Opens a new maintenance record and flips the vehicle to "In Shop".
 * Blocked if the vehicle is currently on a trip or already retired.
 */
const openMaintenance = async ({ vehicle: vehicleId, serviceType, cost, date, notes, vendor, createdBy }) => {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) throw new ApiError(404, 'Vehicle not found.');

  if (vehicle.status === 'On Trip') {
    throw new ApiError(422, 'Cannot open maintenance on a vehicle that is currently on a trip.');
  }
  if (vehicle.status === 'Retired') {
    throw new ApiError(422, 'Cannot open maintenance on a retired vehicle.');
  }

  const log = await MaintenanceLog.create({
    vehicle: vehicleId,
    serviceType,
    cost,
    date,
    notes,
    vendor,
    createdBy,
    status: 'Active',
  });

  vehicle.status = 'In Shop';
  await vehicle.save();

  return log;
};

/**
 * Closes an Active maintenance record. Vehicle returns to Available unless
 * it was separately marked Retired while in the shop.
 */
const closeMaintenance = async (maintenanceId) => {
  const log = await MaintenanceLog.findById(maintenanceId);
  if (!log) throw new ApiError(404, 'Maintenance record not found.');
  if (log.status !== 'Active') {
    throw new ApiError(422, 'This maintenance record is already completed.');
  }

  log.status = 'Completed';
  log.completedDate = new Date();
  await log.save();

  const vehicle = await Vehicle.findById(log.vehicle);
  if (vehicle && vehicle.status !== 'Retired') {
    vehicle.status = 'Available';
    await vehicle.save();
  }

  return log;
};

module.exports = { openMaintenance, closeMaintenance };