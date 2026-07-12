const express = require('express');
const { getVehicleROI, getFuelEfficiency, getRevenueCost, exportReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('reports', 'read'));

router.get('/vehicle-roi', getVehicleROI);
router.get('/fuel-efficiency', getFuelEfficiency);
router.get('/revenue-cost', getRevenueCost);
router.get('/export/:reportType', exportReport);

module.exports = router;
