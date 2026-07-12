const mongoose = require('mongoose');

const TRIP_STATUS = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

const tripSchema = new mongoose.Schema(
  {
    tripCode: {
      type: String,
      unique: true,
    },
    source: {
      type: String,
      required: [true, 'Source is required'],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle is required'],
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: [true, 'Driver is required'],
    },
    cargoWeight: {
      type: Number,
      required: [true, 'Cargo weight is required'],
      min: [0, 'Cargo weight cannot be negative'],
    },
    distance: {
      type: Number,
      required: [true, 'Distance is required'],
      min: [0, 'Distance cannot be negative'],
    },
    status: {
      type: String,
      enum: TRIP_STATUS,
      default: 'Draft',
    },
    dispatchedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

tripSchema.index({ status: 1 });
tripSchema.index({ vehicle: 1 });
tripSchema.index({ driver: 1 });
tripSchema.index({ createdAt: -1 });

// Auto-generate a human-readable trip code: TRIP-000001, TRIP-000002, ...
tripSchema.pre('save', async function generateTripCode(next) {
  if (!this.isNew || this.tripCode) return next();
  const count = await mongoose.model('Trip').countDocuments();
  this.tripCode = `TRIP-${String(count + 1).padStart(6, '0')}`;
  next();
});

module.exports = mongoose.model('Trip', tripSchema);
module.exports.TRIP_STATUS = TRIP_STATUS;