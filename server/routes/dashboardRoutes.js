const express = require('express');
const { getKpis, getWidgets, getCharts } = require('../controllers/dashboardController');
const { protect } = require('../middlewares/auth');

const router = express.Router();
router.use(protect);

// Dashboard is read-only aggregate data available to all authenticated roles.
router.get('/kpis', getKpis);
router.get('/widgets', getWidgets);
router.get('/charts', getCharts);

module.exports = router;