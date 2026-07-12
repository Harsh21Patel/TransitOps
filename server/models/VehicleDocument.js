const mongoose = require('mongoose');

const DOCUMENT_TYPES = ['Registration', 'Insurance', 'Permit', 'Pollution Certificate', 'Fitness Certificate', 'Other'];

const vehicleDocumentSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    documentType: {
      type: String,
      enum: DOCUMENT_TYPES,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: String,
    expiryDate: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

vehicleDocumentSchema.index({ vehicle: 1 });

module.exports = mongoose.model('VehicleDocument', vehicleDocumentSchema);
module.exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
EOF

cat > /home/claude/TransitOps/server/models/Notification.js << 'EOF'
const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'LICENSE_EXPIRING',
  'TRIP_DISPATCHED',
  'TRIP_COMPLETED',
  'TRIP_CANCELLED',
  'MAINTENANCE_DUE',
  'VEHICLE_STATUS_CHANGED',
  'GENERAL',
];

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: 'GENERAL',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedId: mongoose.Schema.Types.ObjectId,
    relatedModel: String,
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
EOF

cat > /home/claude/TransitOps/server/models/Settings.js << 'EOF'
const mongoose = require('mongoose');

// Singleton document (one row) holding depot-wide configuration.
const settingsSchema = new mongoose.Schema(
  {
    depotName: {
      type: String,
      default: 'Main Depot',
    },
    currency: {
      type: String,
      default: 'USD',
    },
    distanceUnit: {
      type: String,
      enum: ['km', 'mi'],
      default: 'km',
    },
    licenseExpiryAlertDays: {
      type: Number,
      default: 30,
    },
  },
  { timestamps: true }
);

settingsSchema.statics.getSingleton = async function getSingleton() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
