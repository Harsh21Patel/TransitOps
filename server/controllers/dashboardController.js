const asyncHandler = require('express-async-handler');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const FuelLog = require('../models/FuelLog');
const Expense = require('../models/Expense');
const MaintenanceLog = require('../models/MaintenanceLog');

// @route GET /api/dashboard/kpis
const getKpis = asyncHandler(async (req, res) => {
  const [
    activeVehicles,
    availableVehicles,
    inMaintenanceVehicles,
    totalVehicles,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    totalDrivers,
  ] = await Promise.all([
    Vehicle.countDocuments({ status: { $in: ['On Trip', 'Available'] } }),
    Vehicle.countDocuments({ status: 'Available' }),
    Vehicle.countDocuments({ status: 'In Shop' }),
    Vehicle.countDocuments({ status: { $ne: 'Retired' } }),
    Trip.countDocuments({ status: 'Dispatched' }),
    Trip.countDocuments({ status: 'Draft' }),
    Driver.countDocuments({ status: 'On Trip' }),
    Driver.countDocuments({ status: { $ne: 'Suspended' } }),
  ]);

  const fleetUtilization = totalVehicles > 0
    ? Number(((activeTrips / totalVehicles) * 100).toFixed(1))
    : 0;

  res.status(200).json({
    success: true,
    data: {
      activeVehicles,
      availableVehicles,
      vehiclesInMaintenance: inMaintenanceVehicles,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      totalDrivers,
      fleetUtilization,
    },
  });
});

// @route GET /api/dashboard/widgets
const getWidgets = asyncHandler(async (req, res) => {
  const [recentTrips, vehicleStatusCounts, fleetStatusCounts] = await Promise.all([
    Trip.find()
      .sort('-createdAt')
      .limit(8)
      .populate('vehicle', 'registrationNumber vehicleName')
      .populate('driver', 'name'),
    Vehicle.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Vehicle.aggregate([{ $group: { _id: '$vehicleType', count: { $sum: 1 } } }]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      recentTrips,
      vehicleStatus: vehicleStatusCounts.map((v) => ({ status: v._id, count: v.count })),
      fleetStatus: fleetStatusCounts.map((v) => ({ type: v._id, count: v.count })),
    },
  });
});

// @route GET /api/dashboard/charts
const getCharts = asyncHandler(async (req, res) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const [tripsByStatus, monthlyTrips, monthlyFuelCost, monthlyMaintenanceCost] = await Promise.all([
    Trip.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Trip.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    FuelLog.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, total: { $sum: '$cost' } } },
      { $sort: { _id: 1 } },
    ]),
    MaintenanceLog.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, total: { $sum: '$cost' } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // Merge fuel + maintenance into a single area-chart-friendly series keyed by month
  const monthMap = {};
  monthlyFuelCost.forEach((m) => {
    monthMap[m._id] = { month: m._id, fuel: m.total, maintenance: 0 };
  });
  monthlyMaintenanceCost.forEach((m) => {
    if (!monthMap[m._id]) monthMap[m._id] = { month: m._id, fuel: 0, maintenance: 0 };
    monthMap[m._id].maintenance = m.total;
  });
  const operationalCostSeries = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

  res.status(200).json({
    success: true,
    data: {
      tripsByStatus: tripsByStatus.map((t) => ({ status: t._id, count: t.count })),
      monthlyTrips: monthlyTrips.map((t) => ({ month: t._id, count: t.count })),
      operationalCostSeries,
    },
  });
});

module.exports = { getKpis, getWidgets, getCharts };