import express from 'express';
import { cancelBooking, getBookings, getBookingById } from '../controllers/bookingController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ambas as rotas exigem autenticação — a lógica de admin/client está no controller
router.get('/', verifyToken, getBookings);
router.get('/:id', verifyToken, getBookingById);
router.post('/:id/cancel', verifyToken, cancelBooking);

export default router;
