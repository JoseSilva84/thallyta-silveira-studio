import express from 'express';
import passport from '../config/passport.js';
import { register, login, googleCallback, getMe, updateWhatsapp } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Cadastro e Login tradicionais
router.post('/register', register);
router.post('/login', login);

// Dados do usuário logado
router.get('/me', verifyToken, getMe);
router.patch('/me/whatsapp', verifyToken, updateWhatsapp);

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
    ? [
        (req, res, next) => {
          passport.authenticate('google', { session: false }, (error, user) => {
            if (error || !user) {
              console.error('Erro no OAuth Google:', error || 'Usuario Google ausente.');
              const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173')
                .split(',')
                .map((origin) => origin.trim())
                .filter(Boolean)[0];
              return res.redirect(`${frontendUrl}/login?error=google_failed`);
            }

            req.user = user;
            return next();
          })(req, res, next);
        },
        googleCallback,
      ]
    : [googleNotConfigured]
  )
);

export default router;
