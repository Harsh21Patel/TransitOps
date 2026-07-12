const mongoose = require('mongoose');

const EXPENSE_TYPES = ['Toll', 'Parking', 'Misc', 'Maintenance'];

const expenseSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
    },
    type: {
      type: String,
      enum: EXPENSE_TYPES,
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

expenseSchema.index({ type: 1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ vehicle: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.EXPENSE_TYPES = EXPENSE_TYPES;