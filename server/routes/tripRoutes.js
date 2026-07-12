const express = require('express');
const {
  getTrips,
  getDispatchBoard,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  dispatch,
  complete,
  cancel,
} = require('../controllers/tripController');
const { protect, authorize } = require('../middlewares/auth');
const { tripValidator, tripUpdateValidator, cancelTripValidator } = require('../validators/tripValidator');

const router = express.Router();

router.use(protect);

router.get('/', authorize('trips', 'read'), getTrips);
router.get('/board', authorize('trips', 'read'), getDispatchBoard);
router.get('/:id', authorize('trips', 'read'), getTripById);
router.post('/', authorize('trips', 'write'), tripValidator, createTrip);
router.patch('/:id', authorize('trips', 'write'), tripUpdateValidator, updateTrip);
router.delete('/:id', authorize('trips', 'write'), deleteTrip);

router.post('/:id/dispatch', authorize('trips', 'write'), dispatch);
router.post('/:id/complete', authorize('trips', 'write'), complete);
router.post('/:id/cancel', authorize('trips', 'write'), cancelTripValidator, cancel);

module.exports = router;