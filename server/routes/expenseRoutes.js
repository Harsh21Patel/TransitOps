const express = require('express');
const {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getOperationalCost,
  expenseValidator,
} = require('../controllers/expenseController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();
router.use(protect);

router.get('/', authorize('expenses', 'read'), getExpenses);
router.get('/operational-cost', authorize('expenses', 'read'), getOperationalCost);
router.get('/:id', authorize('expenses', 'read'), getExpenseById);
router.post('/', authorize('expenses', 'write'), expenseValidator, createExpense);
router.patch('/:id', authorize('expenses', 'write'), updateExpense);
router.delete('/:id', authorize('expenses', 'write'), deleteExpense);

module.exports = router;