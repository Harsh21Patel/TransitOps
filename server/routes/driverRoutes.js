const express = require('express');
const {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  getExpiringLicenses,
} = require('../controllers/driverController');
const { protect, authorize } = require('../middlewares/auth');
const { driverValidator, driverUpdateValidator } = require('../validators/driverValidator');

const router = express.Router();

router.use(protect);

router.get('/', authorize('drivers', 'read'), getDrivers);
router.get('/expiring-licenses', authorize('drivers', 'read'), getExpiringLicenses);
router.get('/:id', authorize('drivers', 'read'), getDriverById);
router.post('/', authorize('drivers', 'write'), driverValidator, createDriver);
router.patch('/:id', authorize('drivers', 'write'), driverUpdateValidator, updateDriver);
router.delete('/:id', authorize('drivers', 'write'), deleteDriver);

module.exports = router;