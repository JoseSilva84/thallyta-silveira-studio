import express from 'express';
import { getBookings, getBookingById } from '../controllers/bookingController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ambas as rotas exigem autenticação — a lógica de admin/client está no controller
router.get('/', verifyToken, getBookings);
router.get('/:id', verifyToken, getBookingById);

export default router;
