const express = require('express');
const { getKpis, getWidgets, getCharts } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();
router.use(protect);

// Dashboard KPIs available to Admin, Fleet Manager, and Dispatcher only
router.get('/kpis',    authorize('dashboard', 'read'), getKpis);
router.get('/widgets', authorize('dashboard', 'read'), getWidgets);
router.get('/charts',  authorize('dashboard', 'read'), getCharts);

module.exports = router;