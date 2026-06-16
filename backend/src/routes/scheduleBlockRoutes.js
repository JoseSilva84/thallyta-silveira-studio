import express from 'express';
import {
  createScheduleBlock,
  deleteScheduleBlock,
  listScheduleBlocks,
} from '../controllers/scheduleBlockController.js';
import { verifyAdmin, verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Todas as rotas exigem autenticação + perfil ADMIN
router.get('/', verifyToken, verifyAdmin, listScheduleBlocks);
router.post('/', verifyToken, verifyAdmin, createScheduleBlock);
router.delete('/:uid', verifyToken, verifyAdmin, deleteScheduleBlock);

export default router;
