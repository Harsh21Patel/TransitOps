const asyncHandler = require('express-async-handler');
const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const FuelLog = require('../models/FuelLog');
const MaintenanceLog = require('../models/MaintenanceLog');
const Expense = require('../models/Expense');
const { toCSV, streamTablePDF } = require('../utils/exportHelpers');

const dateMatch = (req) => {
  const filter = {};
  if (req.query.from) filter.$gte = new Date(req.query.from);
  if (req.query.to) filter.$lte = new Date(req.query.to);
  return Object.keys(filter).length ? filter : undefined;
};

// @route GET /api/reports/vehicle-roi
// ROI proxy = (total trip revenue-equivalent distance handled) vs acquisition cost,
// combined with total cost of ownership (fuel + maintenance) per vehicle.
const getVehicleROI = asyncHandler(async (req, res) => {
  const vehicles = await Vehicle.find().lean();
  const [fuelByVehicle, maintenanceByVehicle, tripsByVehicle] = await Promise.all([
    FuelLog.aggregate([{ $group: { _id: '$vehicle', total: { $sum: '$cost' } } }]),
    MaintenanceLog.aggregate([{ $group: { _id: '$vehicle', total: { $sum: '$cost' } } }]),
    Trip.aggregate([
      { $match: { status: 'Completed' } },
      { $group: { _id: '$vehicle', trips: { $sum: 1 }, distance: { $sum: '$distance' } } },
    ]),
  ]);

  const fuelMap = Object.fromEntries(fuelByVehicle.map((f) => [String(f._id), f.total]));
  const maintMap = Object.fromEntries(maintenanceByVehicle.map((m) => [String(m._id), m.total]));
  const tripMap = Object.fromEntries(tripsByVehicle.map((t) => [String(t._id), t]));

  const rows = vehicles.map((v) => {
    const fuel = fuelMap[String(v._id)] || 0;
    const maintenance = maintMap[String(v._id)] || 0;
    const tripData = tripMap[String(v._id)] || { trips: 0, distance: 0 };
    const totalCost = v.acquisitionCost + fuel + maintenance;
    return {
      vehicleId: v._id,
      registrationNumber: v.registrationNumber,
      vehicleName: v.vehicleName,
      acquisitionCost: v.acquisitionCost,
      fuelCost: fuel,
      maintenanceCost: maintenance,
      totalCostOfOwnership: totalCost,
      completedTrips: tripData.trips,
      totalDistanceKm: tripData.distance,
      costPerKm: tripData.distance > 0 ? Number((totalCost / tripData.distance).toFixed(2)) : null,
    };
  });

  res.status(200).json({ success: true, data: rows });
});

// @route GET /api/reports/fuel-efficiency
const getFuelEfficiency = asyncHandler(async (req, res) => {
  const match = {};
  const dm = dateMatch(req);
  if (dm) match.date = dm;

  const rows = await FuelLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$vehicle',
        totalLiters: { $sum: '$liters' },
        totalCost: { $sum: '$cost' },
        totalDistance: { $sum: '$distanceSinceLastFillUp' },
        avgEfficiency: { $avg: '$efficiency' },
      },
    },
    { $lookup: { from: 'vehicles', localField: '_id', foreignField: '_id', as: 'vehicle' } },
    { $unwind: '$vehicle' },
    {
      $project: {
        _id: 0,
        vehicleId: '$vehicle._id',
        registrationNumber: '$vehicle.registrationNumber',
        vehicleName: '$vehicle.vehicleName',
        totalLiters: 1,
        totalCost: 1,
        totalDistance: 1,
        avgEfficiency: { $round: ['$avgEfficiency', 2] },
      },
    },
    { $sort: { avgEfficiency: -1 } },
  ]);

  res.status(200).json({ success: true, data: rows });
});

// @route GET /api/reports/revenue-cost
const getRevenueCost = asyncHandler(async (req, res) => {
  const match = {};
  const dm = dateMatch(req);
  if (dm) match.date = dm;

  const [fuel, maintenance, expenses] = await Promise.all([
    FuelLog.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$cost' } } }]),
    MaintenanceLog.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$cost' } } }]),
    Expense.aggregate([{ $match: match }, { $group: { _id: '$type', total: { $sum: '$amount' } } }]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      fuel: fuel[0]?.total || 0,
      maintenance: maintenance[0]?.total || 0,
      expensesByType: expenses.map((e) => ({ type: e._id, total: e.total })),
    },
  });
});

// @route GET /api/reports/export/:reportType?format=csv|pdf
const exportReport = asyncHandler(async (req, res) => {
  const { reportType } = req.params;
  const format = req.query.format === 'pdf' ? 'pdf' : 'csv';

  let rows = [];
  let columns = [];
  let title = 'Report';

  switch (reportType) {
    case 'vehicle-roi': {
      const vehicles = await Vehicle.find().lean();
      const [fuelByVehicle, maintenanceByVehicle] = await Promise.all([
        FuelLog.aggregate([{ $group: { _id: '$vehicle', total: { $sum: '$cost' } } }]),
        MaintenanceLog.aggregate([{ $group: { _id: '$vehicle', total: { $sum: '$cost' } } }]),
      ]);
      const fuelMap = Object.fromEntries(fuelByVehicle.map((f) => [String(f._id), f.total]));
      const maintMap = Object.fromEntries(maintenanceByVehicle.map((m) => [String(m._id), m.total]));
      rows = vehicles.map((v) => ({
        registrationNumber: v.registrationNumber,
        vehicleName: v.vehicleName,
        acquisitionCost: v.acquisitionCost,
        fuelCost: fuelMap[String(v._id)] || 0,
        maintenanceCost: maintMap[String(v._id)] || 0,
      }));
      columns = [
        { key: 'registrationNumber', label: 'Registration #', width: 130 },
        { key: 'vehicleName', label: 'Vehicle', width: 160 },
        { key: 'acquisitionCost', label: 'Acquisition Cost', width: 130 },
        { key: 'fuelCost', label: 'Fuel Cost', width: 110 },
        { key: 'maintenanceCost', label: 'Maintenance Cost', width: 130 },
      ];
      title = 'Vehicle ROI Report';
      break;
    }
    case 'trips': {
      const trips = await Trip.find()
        .populate('vehicle', 'registrationNumber')
        .populate('driver', 'name')
        .sort('-createdAt')
        .limit(500)
        .lean();
      rows = trips.map((t) => ({
        tripCode: t.tripCode,
        source: t.source,
        destination: t.destination,
        vehicle: t.vehicle?.registrationNumber || '—',
        driver: t.driver?.name || '—',
        status: t.status,
        distance: t.distance,
        cargoWeight: t.cargoWeight,
      }));
      columns = [
        { key: 'tripCode', label: 'Trip Code', width: 90 },
        { key: 'source', label: 'Source', width: 110 },
        { key: 'destination', label: 'Destination', width: 110 },
        { key: 'vehicle', label: 'Vehicle', width: 110 },
        { key: 'driver', label: 'Driver', width: 110 },
        { key: 'status', label: 'Status', width: 90 },
        { key: 'distance', label: 'Distance (km)', width: 100 },
        { key: 'cargoWeight', label: 'Cargo (kg)', width: 90 },
      ];
      title = 'Trips Report';
      break;
    }
    case 'expenses': {
      const expenses = await Expense.find()
        .populate('vehicle', 'registrationNumber')
        .sort('-date')
        .limit(500)
        .lean();
      rows = expenses.map((e) => ({
        date: new Date(e.date).toLocaleDateString(),
        type: e.type,
        amount: e.amount,
        vehicle: e.vehicle?.registrationNumber || '—',
        description: e.description || '',
      }));
      columns = [
        { key: 'date', label: 'Date', width: 90 },
        { key: 'type', label: 'Type', width: 90 },
        { key: 'amount', label: 'Amount', width: 90 },
        { key: 'vehicle', label: 'Vehicle', width: 110 },
        { key: 'description', label: 'Description', width: 220 },
      ];
      title = 'Expenses Report';
      break;
    }
    default:
      res.status(400).json({ success: false, message: `Unknown report type "${reportType}".` });
      return;
  }

  if (format === 'csv') {
    const csv = toCSV(rows, columns.map((c) => c.key));
    res.header('Content-Type', 'text/csv');
    res.attachment(`${reportType}-report.csv`);
    res.send(csv);
  } else {
    res.attachment(`${reportType}-report.pdf`);
    streamTablePDF(res, {
      title,
      subtitle: `Generated ${new Date().toLocaleString()}`,
      columns,
      rows,
    });
  }
});

module.exports = { getVehicleROI, getFuelEfficiency, getRevenueCost, exportReport };