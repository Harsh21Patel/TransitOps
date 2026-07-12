const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const FuelLog = require('../models/FuelLog');
const MaintenanceLog = require('../models/MaintenanceLog');
const ApiError = require('../utils/ApiError');
const ApiFeatures = require('../utils/ApiFeatures');
const { EXPENSE_TYPES } = require('../models/Expense');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array().map((e) => ({ field: e.path, message: e.msg })));
  }
  next();
};

const expenseValidator = [
  body('type').isIn(EXPENSE_TYPES).withMessage('Invalid expense type'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a non-negative number'),
  body('vehicle').optional().isMongoId(),
  body('trip').optional().isMongoId(),
  body('date').optional().isISO8601(),
  body('description').optional().trim(),
  validate,
];

const POPULATE = [
  { path: 'vehicle', select: 'registrationNumber vehicleName' },
  { path: 'trip', select: 'tripCode source destination' },
];

// @route GET /api/expenses
const getExpenses = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(Expense.find(), req.query)
    .filter(['type', 'vehicle', 'trip'])
    .sort()
    .paginate();

  const [expenses, total] = await Promise.all([features.query.populate(POPULATE), features.countQuery]);

  res.status(200).json({
    success: true,
    data: expenses,
    pagination: { page: features.page, limit: features.limit, total, pages: Math.ceil(total / features.limit) },
  });
});

// @route GET /api/expenses/operational-cost
// Business rule: Operational Cost = total Fuel spend + total Maintenance spend
// (+ optionally logged misc/toll/parking expenses), over an optional date range.
const getOperationalCost = asyncHandler(async (req, res) => {
  const dateFilter = {};
  if (req.query.from) dateFilter.$gte = new Date(req.query.from);
  if (req.query.to) dateFilter.$lte = new Date(req.query.to);
  const dateMatch = Object.keys(dateFilter).length ? { date: dateFilter } : {};

  const [fuelTotal, maintenanceTotal, expenseTotals] = await Promise.all([
    FuelLog.aggregate([{ $match: dateMatch }, { $group: { _id: null, total: { $sum: '$cost' } } }]),
    MaintenanceLog.aggregate([{ $match: dateMatch }, { $group: { _id: null, total: { $sum: '$cost' } } }]),
    Expense.aggregate([{ $match: dateMatch }, { $group: { _id: '$type', total: { $sum: '$amount' } } }]),
  ]);

  const fuel = fuelTotal[0]?.total || 0;
  const maintenance = maintenanceTotal[0]?.total || 0;
  const byType = Object.fromEntries(EXPENSE_TYPES.map((t) => [t, 0]));
  expenseTotals.forEach((e) => {
    byType[e._id] = e.total;
  });

  const operationalCost = fuel + maintenance + (byType.Toll || 0) + (byType.Parking || 0) + (byType.Misc || 0);

  res.status(200).json({
    success: true,
    data: {
      fuel,
      maintenance,
      toll: byType.Toll,
      parking: byType.Parking,
      misc: byType.Misc,
      operationalCost,
    },
  });
});

// @route GET /api/expenses/:id
const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id).populate(POPULATE);
  if (!expense) throw new ApiError(404, 'Expense not found.');
  res.status(200).json({ success: true, data: expense });
});

// @route POST /api/expenses
const createExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create({ ...req.body, createdBy: req.user._id });
  await expense.populate(POPULATE);
  res.status(201).json({ success: true, data: expense });
});

// @route PATCH /api/expenses/:id
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new ApiError(404, 'Expense not found.');
  Object.assign(expense, req.body);
  await expense.save();
  await expense.populate(POPULATE);
  res.status(200).json({ success: true, data: expense });
});

// @route DELETE /api/expenses/:id
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new ApiError(404, 'Expense not found.');
  await expense.deleteOne();
  res.status(200).json({ success: true, message: 'Expense deleted.' });
});

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getOperationalCost,
  expenseValidator,
};