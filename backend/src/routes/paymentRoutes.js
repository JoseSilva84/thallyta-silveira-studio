import express from 'express';
import {
  confirmBookingPayment,
  createBookingPreference,
  getPendingSchedulePayment,
  handleMercadoPagoWebhook,
} from '../controllers/paymentController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/booking-preference', verifyToken, createBookingPreference);
router.get('/pending-schedule', verifyToken, getPendingSchedulePayment);
router.get('/booking/:id/confirm', verifyToken, confirmBookingPayment);
router.post('/mercado-pago/webhook', handleMercadoPagoWebhook);
router.get('/mercado-pago/webhook', handleMercadoPagoWebhook);

export default router;
