const express = require('express');
const {
  getFuelLogs,
  getFuelLogById,
  createFuelLog,
  updateFuelLog,
  deleteFuelLog,
  fuelLogValidator,
} = require('../controllers/fuelLogController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();
router.use(protect);

router.get('/', authorize('fuelLogs', 'read'), getFuelLogs);
router.get('/:id', authorize('fuelLogs', 'read'), getFuelLogById);
router.post('/', authorize('fuelLogs', 'write'), fuelLogValidator, createFuelLog);
router.patch('/:id', authorize('fuelLogs', 'write'), updateFuelLog);
router.delete('/:id', authorize('fuelLogs', 'write'), deleteFuelLog);

module.exports = router;
