import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from './config/passport.js';
import galleryRoutes from './routes/galleryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import testimonialRoutes from './routes/testimonialRoutes.js';
import scheduleBlockRoutes from './routes/scheduleBlockRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import birthdayRewardRoutes from './routes/birthdayRewardRoutes.js';
import crmRoutes from './routes/crmRoutes.js';
import prisma from './config/prisma.js';
import { startBookingReminderService } from './services/bookingReminderService.js';
import { startCalFallbackSyncService } from './services/calSyncService.js';
import { startFailedWhatsAppRetryService } from './services/whatsappService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const defaultAllowedOrigins = [
  'https://www.thallytasilveira.com.br',
  'https://thallytasilveira.com.br',
  'http://localhost:5173',
];
const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...configuredOrigins])];
const sessionSecret = process.env.JWT_SECRET
  || process.env.SESSION_SECRET
  || (process.env.NODE_ENV !== 'production' ? 'dev-session-secret' : undefined);

app.set('trust proxy', 1);

// Middlewares
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessão necessária para o fluxo OAuth do Passport
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/schedule-blocks', scheduleBlockRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/birthday-rewards', birthdayRewardRoutes);
app.use('/api/crm', crmRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  startBookingReminderService();
  startCalFallbackSyncService();
  startFailedWhatsAppRetryService(prisma);
});
