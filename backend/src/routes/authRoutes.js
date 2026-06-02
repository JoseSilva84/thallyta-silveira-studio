import express from 'express';
import passport from '../config/passport.js';
import { register, login, googleCallback, getMe } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Cadastro e Login tradicionais
router.post('/register', register);
router.post('/login', login);

// Dados do usuário logado
router.get('/me', verifyToken, getMe);

// OAuth Google
const googleNotConfigured = (_req, res) =>
  res.status(503).json({ error: 'Login com Google não está configurado ainda.' });

const googleEnabled = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

router.get('/google', googleEnabled
  ? passport.authenticate('google', { scope: ['profile', 'email'] })
  : googleNotConfigured
);
router.get(
  '/google/callback',
  ...(googleEnabled
    ? [passport.authenticate('google', { failureRedirect: '/login?error=google_failed', session: false }), googleCallback]
    : [googleNotConfigured]
  )
);

export default router;
