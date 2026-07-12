/**
 * TransitOps — Full Seed Script
 * Populates the DB with demo-ready data matching the hackathon brief's
 * Van-05 / Alex example workflow and all four user roles.
 * Usage: node seed/index.js
 * Safe to re-run (idempotent via upsert / findOneAndCreate patterns).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const MaintenanceLog = require('../models/MaintenanceLog');
const FuelLog = require('../models/FuelLog');
const Expense = require('../models/Expense');
const { ROLES } = require('../config/roles');

const log = (msg) => console.log(`[Seed] ${msg}`);

// ──────────────────────────────────────────────────────────────────────────────
// USERS (one per role)
// ──────────────────────────────────────────────────────────────────────────────
const USERS = [
  { name: 'System Administrator', email: 'admin@transitops.com',      password: 'Admin@12345',   role: ROLES.ADMIN },
  { name: 'Raven Kumar',          email: 'fleet@transitops.com',       password: 'Fleet@12345',   role: ROLES.FLEET_MANAGER },
  { name: 'Jay Dispatch',         email: 'dispatch@transitops.com',    password: 'Disp@12345',    role: ROLES.DISPATCHER },
  { name: 'Sara Safety',          email: 'safety@transitops.com',      password: 'Safe@12345',    role: ROLES.SAFETY_OFFICER },
  { name: 'Nina Finance',         email: 'finance@transitops.com',     password: 'Fin@12345',     role: ROLES.FINANCIAL_ANALYST },
];

// ──────────────────────────────────────────────────────────────────────────────
// VEHICLES
// ──────────────────────────────────────────────────────────────────────────────
const VEHICLES = [
  { registrationNumber: 'GJ01AB452', vehicleName: 'VAN-05', model: 'Tata Ace',          vehicleType: 'Van',   capacity: 500,  acquisitionCost: 620000, odometer: 74000,  status: 'Available' },
  { registrationNumber: 'GJ01AB998', vehicleName: 'TRUCK-11', model: 'Ashok Leyland',   vehicleType: 'Truck', capacity: 5000, acquisitionCost: 2450000, odometer: 182000, status: 'Available' },
  { registrationNumber: 'GJ01AB120', vehicleName: 'MINI-03', model: 'Mahindra Bolero',  vehicleType: 'Van',   capacity: 1000, acquisitionCost: 410000, odometer: 66000,  status: 'Available' },
  { registrationNumber: 'GJ01AB008', vehicleName: 'VAN-09', model: 'Force Traveller',   vehicleType: 'Van',   capacity: 750,  acquisitionCost: 590000, odometer: 241900, status: 'Retired' },
  { registrationNumber: 'GJ02CD301', vehicleName: 'TRUCK-04', model: 'TATA LPT 1109',  vehicleType: 'Truck', capacity: 8000, acquisitionCost: 1800000, odometer: 95000,  status: 'Available' },
  { registrationNumber: 'GJ03EF555', vehicleName: 'PICKUP-07', model: 'Mahindra Jeeto', vehicleType: 'Pickup', capacity: 600, acquisitionCost: 380000, odometer: 30000,  status: 'Available' },
  { registrationNumber: 'GJ04GH888', vehicleName: 'REF-02', model: 'Tata Ultra T.7',   vehicleType: 'Refrigerated Truck', capacity: 3000, acquisitionCost: 3200000, odometer: 48000, status: 'Available' },
  { registrationNumber: 'GJ05IJ111', vehicleName: 'BUS-01', model: 'Force Urbania',    vehicleType: 'Bus',   capacity: 300,  acquisitionCost: 1500000, odometer: 125000, status: 'Available' },
];

// ──────────────────────────────────────────────────────────────────────────────
// DRIVERS
// ──────────────────────────────────────────────────────────────────────────────
const today = new Date();
const future = (months) => { const d = new Date(today); d.setMonth(d.getMonth() + months); return d; };
const past   = (months) => { const d = new Date(today); d.setMonth(d.getMonth() - months); return d; };

const DRIVERS = [
  { name: 'Alex Sharma',   licenseNumber: 'DL88213', category: 'LMV', licenseExpiry: future(18), contact: '9876500001', safetyScore: 96, status: 'Available' },
  { name: 'John Mathews',  licenseNumber: 'DL44120', category: 'HMV', licenseExpiry: past(2),    contact: '9822000002', safetyScore: 81, status: 'Available' }, // expired
  { name: 'Priya Nair',    licenseNumber: 'DL77031', category: 'LMV', licenseExpiry: future(8),  contact: '9911000003', safetyScore: 99, status: 'Available' },
  { name: 'Suresh Patel',  licenseNumber: 'DL90045', category: 'HMV', licenseExpiry: future(12), contact: '9744000004', safetyScore: 88, status: 'Available' },
  { name: 'Meera Joshi',   licenseNumber: 'DL66789', category: 'LMV', licenseExpiry: future(2),  contact: '9823000005', safetyScore: 92, status: 'Off Duty' },  // expiring soon
  { name: 'Ravi Kumar',    licenseNumber: 'DL55432', category: 'HMV', licenseExpiry: future(24), contact: '9876000006', safetyScore: 78, status: 'Suspended' },
];

const run = async () => {
  await connectDB();
  log('Connected to MongoDB');

  // ── Users ──────────────────────────────────────────────────────────────────
  const createdUsers = {};
  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      createdUsers[u.role] = existing;
      log(`User already exists: ${u.email}`);
    } else {
      const user = await User.create(u);
      createdUsers[u.role] = user;
      log(`Created user: ${u.email} (${u.role})`);
    }
  }
  const adminUser = createdUsers[ROLES.ADMIN];

  // ── Vehicles ───────────────────────────────────────────────────────────────
  const vehicleMap = {}; // registrationNumber → doc
  for (const v of VEHICLES) {
    const existing = await Vehicle.findOne({ registrationNumber: v.registrationNumber });
    if (existing) {
      vehicleMap[v.registrationNumber] = existing;
      log(`Vehicle exists: ${v.registrationNumber}`);
    } else {
      const vehicle = await Vehicle.create(v);
      vehicleMap[v.registrationNumber] = vehicle;
      log(`Created vehicle: ${v.registrationNumber}`);
    }
  }

  // ── Drivers ────────────────────────────────────────────────────────────────
  const driverMap = {}; // name → doc
  for (const d of DRIVERS) {
    const existing = await Driver.findOne({ licenseNumber: d.licenseNumber });
    if (existing) {
      driverMap[d.name] = existing;
      log(`Driver exists: ${d.name}`);
    } else {
      const driver = await Driver.create(d);
      driverMap[d.name] = driver;
      log(`Created driver: ${d.name}`);
    }
  }

  // ── Maintenance Logs ───────────────────────────────────────────────────────
  // Put MINI-03 in shop (Active maintenance → vehicle becomes In Shop)
  const miniVehicle = vehicleMap['GJ01AB120'];
  const existingMaint = await MaintenanceLog.findOne({ vehicle: miniVehicle._id, status: 'Active' });
  if (!existingMaint) {
    await MaintenanceLog.create({
      vehicle: miniVehicle._id,
      serviceType: 'Oil Change',
      cost: 3500,
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      status: 'Active',
      notes: 'Scheduled oil change + filter replacement',
      vendor: 'Raju Auto Works',
      createdBy: adminUser._id,
    });
    await Vehicle.findByIdAndUpdate(miniVehicle._id, { status: 'In Shop' });
    log('Created active maintenance for MINI-03 (In Shop)');
  }

  // Completed maintenance for TRUCK-11
  const truck11 = vehicleMap['GJ01AB998'];
  const existingMaint2 = await MaintenanceLog.findOne({ vehicle: truck11._id, status: 'Completed' });
  if (!existingMaint2) {
    await MaintenanceLog.create({
      vehicle: truck11._id,
      serviceType: 'Brake Service',
      cost: 12000,
      date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      completedDate: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000),
      status: 'Completed',
      notes: 'Full brake pad replacement front & rear',
      vendor: 'National Truck Services',
      createdBy: adminUser._id,
    });
    log('Created completed maintenance for TRUCK-11');
  }

  // ── Trips ──────────────────────────────────────────────────────────────────
  // We need to create trips carefully to avoid duplicate tripCode conflicts.
  // Use findOne checks before creating.

  const van05 = vehicleMap['GJ01AB452'];
  const truck04 = vehicleMap['GJ02CD301'];
  const alex = driverMap['Alex Sharma'];
  const priya = driverMap['Priya Nair'];
  const suresh = driverMap['Suresh Patel'];

  // Trip 1: Dispatched (Van-05 + Alex → On Trip)
  const trip1Existing = await Trip.findOne({ source: 'Gandhinagar Depot', destination: 'Ahmedabad Hub', status: 'Dispatched' });
  let trip1;
  if (!trip1Existing) {
    trip1 = await Trip.create({
      source: 'Gandhinagar Depot',
      destination: 'Ahmedabad Hub',
      vehicle: van05._id,
      driver: alex._id,
      cargoWeight: 450,
      distance: 38,
      status: 'Dispatched',
      dispatchedAt: new Date(),
      createdBy: adminUser._id,
    });
    await Vehicle.findByIdAndUpdate(van05._id, { status: 'On Trip' });
    await Driver.findByIdAndUpdate(alex._id, { status: 'On Trip' });
    log('Created dispatched trip: Gandhinagar → Ahmedabad (Van-05/Alex)');
  } else {
    trip1 = trip1Existing;
  }

  // Trip 2: Draft (Truck-04 awaiting driver)
  const trip2Existing = await Trip.findOne({ source: 'Vatva Industrial Area', destination: 'Sanand Warehouse', status: 'Draft' });
  if (!trip2Existing) {
    await Trip.create({
      source: 'Vatva Industrial Area',
      destination: 'Sanand Warehouse',
      vehicle: truck04._id,
      driver: suresh._id,
      cargoWeight: 3500,
      distance: 25,
      status: 'Draft',
      createdBy: adminUser._id,
    });
    log('Created draft trip: Vatva → Sanand (Truck-04/Suresh)');
  }

  // Trip 3: Completed
  const trip3Existing = await Trip.findOne({ source: 'Mansa', destination: 'Kalol Depot', status: 'Completed' });
  if (!trip3Existing) {
    const pickup07 = vehicleMap['GJ03EF555'];
    await Trip.create({
      source: 'Mansa',
      destination: 'Kalol Depot',
      vehicle: pickup07._id,
      driver: priya._id,
      cargoWeight: 300,
      distance: 45,
      status: 'Completed',
      dispatchedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      createdBy: adminUser._id,
    });
    log('Created completed trip: Mansa → Kalol Depot (Pickup-07/Priya)');
  }

  // Trip 4: Cancelled
  const trip4Existing = await Trip.findOne({ source: 'Ahmedabad Hub', destination: 'Surat Depot', status: 'Cancelled' });
  if (!trip4Existing) {
    const truck11v = vehicleMap['GJ01AB998'];
    await Trip.create({
      source: 'Ahmedabad Hub',
      destination: 'Surat Depot',
      vehicle: truck11v._id,
      driver: suresh._id,
      cargoWeight: 4000,
      distance: 270,
      status: 'Cancelled',
      cancellationReason: 'Vehicle went to shop for brake service',
      cancelledAt: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000),
      createdBy: adminUser._id,
    });
    log('Created cancelled trip: Ahmedabad → Surat (TRUCK-11/Suresh)');
  }

  // Trip 5: Another completed trip for REF-02
  const trip5Existing = await Trip.findOne({ source: 'Rajkot Cold Storage', destination: 'Ahmedabad Distribution', status: 'Completed' });
  if (!trip5Existing) {
    const ref02 = vehicleMap['GJ04GH888'];
    await Trip.create({
      source: 'Rajkot Cold Storage',
      destination: 'Ahmedabad Distribution',
      vehicle: ref02._id,
      driver: priya._id,
      cargoWeight: 2500,
      distance: 215,
      status: 'Completed',
      dispatchedAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      completedAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
      createdBy: adminUser._id,
    });
    log('Created completed trip: Rajkot → Ahmedabad (REF-02/Priya)');
  }

  // ── Fuel Logs ──────────────────────────────────────────────────────────────
  const fuelData = [
    { vehicle: van05._id,              liters: 35,  fuelPrice: 95.5,  odometerAtFillUp: 74035, distanceSinceLastFillUp: 350, date: new Date(today.getTime() - 5  * 24 * 60 * 60 * 1000) },
    { vehicle: van05._id,              liters: 30,  fuelPrice: 96.0,  odometerAtFillUp: 73700, distanceSinceLastFillUp: 300, date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000) },
    { vehicle: truck04._id,            liters: 80,  fuelPrice: 94.0,  odometerAtFillUp: 95080, distanceSinceLastFillUp: 650, date: new Date(today.getTime() - 3  * 24 * 60 * 60 * 1000) },
    { vehicle: truck11._id,            liters: 120, fuelPrice: 93.5,  odometerAtFillUp: 182120, distanceSinceLastFillUp: 800, date: new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000) },
    { vehicle: vehicleMap['GJ03EF555']._id, liters: 25, fuelPrice: 95.0, odometerAtFillUp: 30025, distanceSinceLastFillUp: 200, date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000) },
    { vehicle: vehicleMap['GJ04GH888']._id, liters: 90, fuelPrice: 94.5, odometerAtFillUp: 48090, distanceSinceLastFillUp: 430, date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000) },
    { vehicle: vehicleMap['GJ05IJ111']._id, liters: 60, fuelPrice: 95.5, odometerAtFillUp: 125060, distanceSinceLastFillUp: 500, date: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000) },
  ];

  const existingFuelCount = await FuelLog.countDocuments();
  if (existingFuelCount === 0) {
    for (const fl of fuelData) {
      await FuelLog.create({ ...fl, createdBy: adminUser._id });
    }
    log(`Created ${fuelData.length} fuel logs`);
  } else {
    log(`Fuel logs already exist (${existingFuelCount} records), skipping`);
  }

  // ── Expenses ───────────────────────────────────────────────────────────────
  const expenseData = [
    { vehicle: van05._id,     type: 'Toll',    amount: 85,   date: new Date(today.getTime() - 5  * 24 * 60 * 60 * 1000), description: 'Ahmedabad-Gandhinagar expressway toll' },
    { vehicle: truck04._id,   type: 'Toll',    amount: 320,  date: new Date(today.getTime() - 3  * 24 * 60 * 60 * 1000), description: 'NH-48 multiple toll booths' },
    { vehicle: truck11._id,   type: 'Parking', amount: 200,  date: new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000), description: 'Overnight truck parking Surat' },
    { vehicle: van05._id,     type: 'Misc',    amount: 500,  date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), description: 'Tyre puncture repair' },
    { vehicle: vehicleMap['GJ03EF555']._id, type: 'Toll', amount: 120, date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), description: 'Kalol bypass toll' },
    { vehicle: vehicleMap['GJ04GH888']._id, type: 'Misc', amount: 1500, date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000), description: 'Refrigeration unit servicing mid-route' },
    { vehicle: truck11._id,   type: 'Maintenance', amount: 12000, date: new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000), description: 'Brake service — National Truck Services' },
  ];

  const existingExpenseCount = await Expense.countDocuments();
  if (existingExpenseCount === 0) {
    for (const exp of expenseData) {
      await Expense.create({ ...exp, createdBy: adminUser._id });
    }
    log(`Created ${expenseData.length} expenses`);
  } else {
    log(`Expenses already exist (${existingExpenseCount} records), skipping`);
  }

  log('\n✅ Seed complete! Login credentials:');
  log('  Admin:            admin@transitops.com    / Admin@12345');
  log('  Fleet Manager:    fleet@transitops.com    / Fleet@12345');
  log('  Dispatcher:       dispatch@transitops.com / Disp@12345');
  log('  Safety Officer:   safety@transitops.com   / Safe@12345');
  log('  Financial Analyst:finance@transitops.com  / Fin@12345');

  await mongoose.connection.close();
};

run().catch((err) => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});
