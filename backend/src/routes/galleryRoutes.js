import express from 'express';
import multer from 'multer';
import { getImages, uploadImage, deleteImage } from '../controllers/galleryController.js';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configura o multer para armazenar o arquivo em memória temporária (buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// GET é público — a galeria é visível para todos
router.get('/', getImages);

// POST e DELETE são protegidos — apenas admin autenticado
router.post('/', verifyToken, verifyAdmin, upload.array('images', 20), uploadImage);
router.delete('/', verifyToken, verifyAdmin, deleteImage);

export default router;

