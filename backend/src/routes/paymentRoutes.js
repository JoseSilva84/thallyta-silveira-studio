import express from 'express';
import {
  confirmBookingPayment,
  createBookingPreference,
  handleMercadoPagoWebhook,
} from '../controllers/paymentController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/booking-preference', verifyToken, createBookingPreference);
router.get('/booking/:id/confirm', verifyToken, confirmBookingPayment);
router.post('/mercado-pago/webhook', handleMercadoPagoWebhook);
router.get('/mercado-pago/webhook', handleMercadoPagoWebhook);

export default router;
