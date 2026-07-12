const mongoose = require('mongoose');

const VEHICLE_STATUS = ['Available', 'On Trip', 'In Shop', 'Retired'];
const VEHICLE_TYPES = ['Truck', 'Van', 'Bus', 'Pickup', 'Trailer', 'Refrigerated Truck', 'Motorcycle'];

const vehicleSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    vehicleName: {
      type: String,
      required: [true, 'Vehicle name is required'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Model is required'],
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: VEHICLE_TYPES,
      required: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity (kg) is required'],
      min: [0, 'Capacity cannot be negative'],
    },
    acquisitionCost: {
      type: Number,
      required: true,
      min: 0,
    },
    odometer: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: VEHICLE_STATUS,
      default: 'Available',
    },
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VehicleDocument',
      },
    ],
  },
  { timestamps: true }
);

vehicleSchema.index({ status: 1 });
vehicleSchema.index({ vehicleType: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
module.exports.VEHICLE_STATUS = VEHICLE_STATUS;
module.exports.VEHICLE_TYPES = VEHICLE_TYPES;