const express = require('express');
const {
  getMaintenanceLogs,
  getMaintenanceById,
  createMaintenance,
  closeMaintenance,
  updateMaintenance,
  deleteMaintenance,
  maintenanceValidator,
} = require('../controllers/maintenanceController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.get('/', authorize('maintenance', 'read'), getMaintenanceLogs);
router.get('/:id', authorize('maintenance', 'read'), getMaintenanceById);
router.post('/', authorize('maintenance', 'write'), maintenanceValidator, createMaintenance);
router.post('/:id/close', authorize('maintenance', 'write'), closeMaintenance);
router.patch('/:id', authorize('maintenance', 'write'), updateMaintenance);
router.delete('/:id', authorize('maintenance', 'write'), deleteMaintenance);

module.exports = router;