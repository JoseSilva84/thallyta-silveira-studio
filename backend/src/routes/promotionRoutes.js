import express from 'express';
import {
  createPromotion,
  deletePromotion,
  listAdminPromotions,
  listPublicActivePromotions,
  sendPromotionWhatsapp,
  updatePromotion,
} from '../controllers/promotionController.js';
import { verifyAdmin, verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/active', listPublicActivePromotions);
router.get('/admin', verifyToken, verifyAdmin, listAdminPromotions);
router.post('/admin', verifyToken, verifyAdmin, createPromotion);
router.put('/admin/:id', verifyToken, verifyAdmin, updatePromotion);
router.delete('/admin/:id', verifyToken, verifyAdmin, deletePromotion);
router.post('/admin/:id/send-whatsapp', verifyToken, verifyAdmin, sendPromotionWhatsapp);

export default router;
