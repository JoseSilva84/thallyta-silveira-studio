import express from 'express';
import {
  cancelBooking,
  completeBookingService,
  getBookings,
  getBookingById,
  undoBookingServiceCompletion,
} from '../controllers/bookingController.js';
import { verifyAdmin, verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ambas as rotas exigem autenticação — a lógica de admin/client está no controller
router.get('/', verifyToken, getBookings);
router.get('/:id', verifyToken, getBookingById);
router.post('/:id/cancel', verifyToken, cancelBooking);
router.post('/:id/complete-service', verifyToken, verifyAdmin, completeBookingService);
router.post('/:id/undo-complete-service', verifyToken, verifyAdmin, undoBookingServiceCompletion);

export default router;
