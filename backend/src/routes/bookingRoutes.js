import express from 'express';
import {
  cancelBooking,
  completeBookingService,
  createAdminBooking,
  createPaidBooking,
  getBookings,
  getBookingById,
  getPublicAgenda,
  markRemainingPaymentPaid,
  markBookingNoShow,
  syncBookingToCal,
  undoBookingServiceCompletion,
} from '../controllers/bookingController.js';
import { verifyAdmin, verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ambas as rotas exigem autenticação — a lógica de admin/client está no controller
router.get('/public-agenda', getPublicAgenda);
router.get('/', verifyToken, getBookings);
router.post('/paid-create', verifyToken, createPaidBooking);
router.post('/admin-create', verifyToken, verifyAdmin, createAdminBooking);
router.get('/:id', verifyToken, getBookingById);
router.post('/:id/cancel', verifyToken, cancelBooking);
router.post('/:id/complete-service', verifyToken, verifyAdmin, completeBookingService);
router.post('/:id/mark-remaining-paid', verifyToken, verifyAdmin, markRemainingPaymentPaid);
router.post('/:id/sync-cal', verifyToken, verifyAdmin, syncBookingToCal);
router.post('/:id/no-show', verifyToken, verifyAdmin, markBookingNoShow);
router.post('/:id/undo-complete-service', verifyToken, verifyAdmin, undoBookingServiceCompletion);

export default router;
