import express from 'express';
import {
  createTestimonial,
  deleteTestimonial,
  getTestimonials,
  updateTestimonial,
} from '../controllers/testimonialController.js';
import { verifyAdmin, verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getTestimonials);
router.get('/admin', verifyToken, verifyAdmin, (req, res) => {
  req.query.all = 'true';
  return getTestimonials(req, res);
});
router.post('/', verifyToken, verifyAdmin, createTestimonial);
router.patch('/:id', verifyToken, verifyAdmin, updateTestimonial);
router.delete('/:id', verifyToken, verifyAdmin, deleteTestimonial);

export default router;
