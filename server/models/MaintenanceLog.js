const mongoose = require('mongoose');

const MAINTENANCE_STATUS = ['Active', 'Completed'];
const SERVICE_TYPES = [
  'Oil Change',
  'Tire Replacement',
  'Brake Service',
  'Engine Repair',
  'Transmission Service',
  'AC Service',
  'General Inspection',
  'Bodywork',
  'Electrical Repair',
  'Other',
];

const maintenanceLogSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle is required'],
    },
    serviceType: {
      type: String,
      enum: SERVICE_TYPES,
      required: true,
    },
    cost: {
      type: Number,
      required: [true, 'Cost is required'],
      min: 0,
    },
    date: {
      type: Date,
      required: [true, 'Service date is required'],
      default: Date.now,
    },
    completedDate: Date,
    status: {
      type: String,
      enum: MAINTENANCE_STATUS,
      default: 'Active',
    },
    notes: {
      type: String,
      trim: true,
    },
    vendor: {
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

maintenanceLogSchema.index({ vehicle: 1 });
maintenanceLogSchema.index({ status: 1 });

module.exports = mongoose.model('MaintenanceLog', maintenanceLogSchema);
module.exports.MAINTENANCE_STATUS = MAINTENANCE_STATUS;
module.exports.SERVICE_TYPES = SERVICE_TYPES;