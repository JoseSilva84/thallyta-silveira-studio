import express from 'express';
import {
  listBirthdayClients,
  listMonthlyBirthdays,
  sendBirthdayMessage,
  updateBirthdayClientDate,
} from '../controllers/birthdayRewardController.js';
import { verifyAdmin, verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/admin/clients', verifyToken, verifyAdmin, listBirthdayClients);
router.get('/admin/monthly', verifyToken, verifyAdmin, listMonthlyBirthdays);
router.post('/admin/:userId/send', verifyToken, verifyAdmin, sendBirthdayMessage);
router.patch('/admin/:userId/date-of-birth', verifyToken, verifyAdmin, updateBirthdayClientDate);

export default router;
