const mongoose = require('mongoose');

const fuelLogSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle is required'],
    },
    liters: {
      type: Number,
      required: [true, 'Liters is required'],
      min: [0.01, 'Liters must be greater than 0'],
    },
    fuelPrice: {
      type: Number,
      required: [true, 'Fuel price per liter is required'],
      min: 0,
    },
    cost: {
      type: Number, // liters * fuelPrice, computed on save
      min: 0,
    },
    odometerAtFillUp: {
      type: Number,
      min: 0,
    },
    distanceSinceLastFillUp: {
      type: Number, // used to compute efficiency (distance / liters), optional
      min: 0,
    },
    efficiency: {
      type: Number, // km per liter, computed when distance is provided
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

fuelLogSchema.index({ vehicle: 1 });
fuelLogSchema.index({ date: -1 });

fuelLogSchema.pre('save', function computeDerivedFields(next) {
  this.cost = Number((this.liters * this.fuelPrice).toFixed(2));
  if (this.distanceSinceLastFillUp && this.liters) {
    this.efficiency = Number((this.distanceSinceLastFillUp / this.liters).toFixed(2));
  }
  next();
});

module.exports = mongoose.model('FuelLog', fuelLogSchema);