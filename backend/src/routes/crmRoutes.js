import express from 'express';
import {
  dismissMyCrmProfilePrompt,
  getMyCrmProfile,
  inviteCrmClient,
  inviteMissingCrmClients,
  listAdminCrmClients,
  markCrmClientDoNotInvite,
  saveMyCrmProfile,
  sendCrmCampaign,
  updateAdminCrmProfile,
} from '../controllers/crmController.js';
import { verifyAdmin, verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/profile', verifyToken, getMyCrmProfile);
router.put('/profile', verifyToken, saveMyCrmProfile);
router.post('/profile/dismiss', verifyToken, dismissMyCrmProfilePrompt);

router.get('/admin/clients', verifyToken, verifyAdmin, listAdminCrmClients);
router.patch('/admin/clients/:userId/profile', verifyToken, verifyAdmin, updateAdminCrmProfile);
router.patch('/admin/clients/:userId/do-not-invite', verifyToken, verifyAdmin, markCrmClientDoNotInvite);
router.post('/admin/clients/:userId/invite', verifyToken, verifyAdmin, inviteCrmClient);
router.post('/admin/invite-missing', verifyToken, verifyAdmin, inviteMissingCrmClients);
router.post('/admin/campaigns/send', verifyToken, verifyAdmin, sendCrmCampaign);

export default router;
