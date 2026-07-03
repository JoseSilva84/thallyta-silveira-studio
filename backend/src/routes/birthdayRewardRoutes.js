import express from 'express';
import {
  listMonthlyBirthdays,
  sendBirthdayMessage,
} from '../controllers/birthdayRewardController.js';
import { verifyAdmin, verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/admin/monthly', verifyToken, verifyAdmin, listMonthlyBirthdays);
router.post('/admin/:userId/send', verifyToken, verifyAdmin, sendBirthdayMessage);

export default router;
