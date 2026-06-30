import express from 'express';
import {
  confirmBookingPayment,
  createBookingPreference,
  getApprovedPaymentsWithoutBooking,
  getBirthdayRewardPreview,
  getPendingSchedulePayment,
  handleMercadoPagoWebhook,
  resolveApprovedPaymentWithoutBooking,
} from '../controllers/paymentController.js';
import { verifyAdmin, verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/booking-preference', verifyToken, createBookingPreference);
router.get('/birthday-reward-preview', verifyToken, getBirthdayRewardPreview);
router.get('/pending-schedule', verifyToken, getPendingSchedulePayment);
router.get('/admin/approved-without-booking', verifyToken, verifyAdmin, getApprovedPaymentsWithoutBooking);
router.patch('/admin/approved-without-booking/:id/resolve', verifyToken, verifyAdmin, resolveApprovedPaymentWithoutBooking);
router.get('/booking/:id/confirm', verifyToken, confirmBookingPayment);
router.post('/mercado-pago/webhook', handleMercadoPagoWebhook);
router.get('/mercado-pago/webhook', handleMercadoPagoWebhook);

export default router;
