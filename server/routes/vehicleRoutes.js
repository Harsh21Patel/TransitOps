const express = require('express');
const {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehicleController');
const { protect, authorize } = require('../middlewares/auth');
const { vehicleValidator, vehicleUpdateValidator } = require('../validators/vehicleValidator');

const router = express.Router();

router.use(protect);

router.get('/', authorize('vehicles', 'read'), getVehicles);
router.get('/:id', authorize('vehicles', 'read'), getVehicleById);
router.post('/', authorize('vehicles', 'write'), vehicleValidator, createVehicle);
router.patch('/:id', authorize('vehicles', 'write'), vehicleUpdateValidator, updateVehicle);
router.delete('/:id', authorize('vehicles', 'write'), deleteVehicle);

module.exports = router;