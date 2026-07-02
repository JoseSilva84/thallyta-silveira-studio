import express from 'express';
import { handleCalWebhook, handleWahaWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// POST /api/webhooks/cal — recebe eventos do Cal.com (sem auth JWT, é o Cal.com que envia)
router.post('/cal', handleCalWebhook);
router.post('/waha', handleWahaWebhook);

export default router;
