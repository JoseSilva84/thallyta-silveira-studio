import express from 'express';
import {
  createFinanceExpense,
  deleteFinanceExpense,
  listFinanceExpenses,
  updateFinanceExpense,
} from '../controllers/financeController.js';
import { verifyAdmin, verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get('/expenses', listFinanceExpenses);
router.post('/expenses', createFinanceExpense);
router.patch('/expenses/:id', updateFinanceExpense);
router.delete('/expenses/:id', deleteFinanceExpense);

export default router;
