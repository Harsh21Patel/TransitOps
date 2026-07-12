const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const ApiError = require('../utils/ApiError');

/**
 * Central enforcement point for every "Mandatory Business Rule" in the spec
 * around dispatch. Controllers call these instead of mutating documents
 * directly, so the rules can never be bypassed by a new route/UI later.
 */

const assertDispatchable = async ({ vehicleId, driverId, cargoWeight }) => {
  const [vehicle, driver] = await Promise.all([
    Vehicle.findById(vehicleId),
    Driver.findById(driverId),
  ]);

  if (!vehicle) throw new ApiError(404, 'Vehicle not found.');
  if (!driver) throw new ApiError(404, 'Driver not found.');

  if (vehicle.status === 'Retired') {
    throw new ApiError(422, 'This vehicle is retired and cannot be dispatched.');
  }
  if (vehicle.status === 'In Shop') {
    throw new ApiError(422, 'This vehicle is in maintenance and cannot be dispatched.');
  }
  if (vehicle.status === 'On Trip') {
    throw new ApiError(422, 'This vehicle is already on a trip.');
  }

  if (driver.status === 'Suspended') {
    throw new ApiError(422, 'This driver is suspended and cannot be dispatched.');
  }
  if (driver.status === 'On Trip') {
    throw new ApiError(422, 'This driver is already assigned to a trip.');
  }
  if (driver.licenseExpiry < new Date()) {
    throw new ApiError(422, "This driver's license has expired and cannot be dispatched.");
  }

  if (cargoWeight > vehicle.capacity) {
    throw new ApiError(
      422,
      `Cargo weight (${cargoWeight}kg) exceeds vehicle capacity (${vehicle.capacity}kg). Dispatch blocked.`
    );
  }

  return { vehicle, driver };
};

/**
 * Dispatches a Draft trip: validates all rules, flips vehicle/driver to
 * "On Trip", and marks the trip Dispatched. Runs best-effort without a
 * multi-document transaction (works on standalone Mongo instances too);
 * callers running against a replica set can wrap this in a session if desired.
 */
const dispatchTrip = async (tripId) => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw new ApiError(404, 'Trip not found.');
  if (trip.status !== 'Draft') {
    throw new ApiError(422, `Only Draft trips can be dispatched. This trip is ${trip.status}.`);
  }

  const { vehicle, driver } = await assertDispatchable({
    vehicleId: trip.vehicle,
    driverId: trip.driver,
    cargoWeight: trip.cargoWeight,
  });

  vehicle.status = 'On Trip';
  driver.status = 'On Trip';
  trip.status = 'Dispatched';
  trip.dispatchedAt = new Date();

  await Promise.all([vehicle.save(), driver.save(), trip.save()]);
  return trip;
};

/**
 * Completes a Dispatched trip: restores vehicle/driver to Available
 * (unless the vehicle was separately retired mid-trip, which shouldn't
 * normally happen but is guarded defensively) and marks the trip Completed.
 */
const completeTrip = async (tripId) => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw new ApiError(404, 'Trip not found.');
  if (trip.status !== 'Dispatched') {
    throw new ApiError(422, `Only Dispatched trips can be completed. This trip is ${trip.status}.`);
  }

  const [vehicle, driver] = await Promise.all([
    Vehicle.findById(trip.vehicle),
    Driver.findById(trip.driver),
  ]);

  if (vehicle && vehicle.status !== 'Retired') {
    vehicle.status = 'Available';
    await vehicle.save();
  }
  if (driver && driver.status !== 'Suspended') {
    driver.status = 'Available';
    await driver.save();
  }

  trip.status = 'Completed';
  trip.completedAt = new Date();
  await trip.save();
  return trip;
};

/**
 * Cancels a Draft or Dispatched trip, restoring vehicle/driver status if
 * they had been flipped to "On Trip".
 */
const cancelTrip = async (tripId, reason) => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw new ApiError(404, 'Trip not found.');
  if (!['Draft', 'Dispatched'].includes(trip.status)) {
    throw new ApiError(422, `Cannot cancel a trip that is already ${trip.status}.`);
  }

  if (trip.status === 'Dispatched') {
    const [vehicle, driver] = await Promise.all([
      Vehicle.findById(trip.vehicle),
      Driver.findById(trip.driver),
    ]);
    if (vehicle && vehicle.status !== 'Retired') {
      vehicle.status = 'Available';
      await vehicle.save();
    }
    if (driver && driver.status !== 'Suspended') {
      driver.status = 'Available';
      await driver.save();
    }
  }

  trip.status = 'Cancelled';
  trip.cancelledAt = new Date();
  trip.cancellationReason = reason || '';
  await trip.save();
  return trip;
};

module.exports = { assertDispatchable, dispatchTrip, completeTrip, cancelTrip };