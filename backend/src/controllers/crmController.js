import prisma from '../config/prisma.js';
import { sendCrmProfileInvite } from '../services/whatsappService.js';

const PRODUCTION_FRONTEND_URL = 'https://www.thallytasilveira.com.br';

const getFrontendUrl = () => {
  if (process.env.PUBLIC_FRONTEND_URL) return process.env.PUBLIC_FRONTEND_URL.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return PRODUCTION_FRONTEND_URL;
  return (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)[0]
    .replace(/\/$/, '');
};

const listValue = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 12);
};

const textValue = (value, max = 500) => {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, max) : null;
};

const booleanValue = (value, fallback = true) => (
  typeof value === 'boolean' ? value : fallback
);

const serializeProfile = (profile) => ({
  id: profile?.id || null,
  userId: profile?.userId || null,
  source: profile?.source || '',
  status: profile?.status || 'active',
  interests: Array.isArray(profile?.interests) ? profile.interests : [],
  preferredPeriods: Array.isArray(profile?.preferredPeriods) ? profile.preferredPeriods : [],
  contactPreference: profile?.contactPreference || '',
  tags: Array.isArray(profile?.tags) ? profile.tags : [],
  notes: profile?.notes || '',
  allowPromotions: profile?.allowPromotions !== false,
  dismissedAt: profile?.dismissedAt || null,
  completedAt: profile?.completedAt || null,
  inviteSentAt: profile?.inviteSentAt || null,
  lastInviteMessage: profile?.lastInviteMessage || '',
  createdAt: profile?.createdAt || null,
  updatedAt: profile?.updatedAt || null,
});

const buildProfilePayload = (body, { complete = false } = {}) => ({
  source: textValue(body.source, 80),
  status: textValue(body.status, 40) || 'active',
  interests: listValue(body.interests),
  preferredPeriods: listValue(body.preferredPeriods),
  contactPreference: textValue(body.contactPreference, 60),
  tags: listValue(body.tags),
  notes: textValue(body.notes, 1000),
  allowPromotions: booleanValue(body.allowPromotions, true),
  ...(complete ? { completedAt: new Date(), dismissedAt: null } : {}),
});

const profileInclude = {
  crmProfile: true,
  bookings: {
    orderBy: { scheduledAt: 'desc' },
    select: {
      id: true,
      service: true,
      estimatedValue: true,
      scheduledAt: true,
      status: true,
      serviceCompletedAt: true,
    },
  },
  bookingPayments: {
    select: {
      amount: true,
      servicePrice: true,
      status: true,
      remainingPaidAt: true,
    },
  },
};

const summarizeUser = (user) => {
  const activeBookings = user.bookings.filter((booking) => !['cancelled', 'no_show'].includes(booking.status));
  const completedBookings = activeBookings.filter((booking) => booking.serviceCompletedAt);
  const totalRevenue = activeBookings.reduce((sum, booking) => {
    const value = Number(booking.estimatedValue);
    return Number.isFinite(value) && value > 0 ? sum + value : sum;
  }, 0);
  const totalPaid = user.bookingPayments.reduce((sum, payment) => {
    const value = Number(payment.amount);
    return payment.status === 'approved' && Number.isFinite(value) ? sum + value : sum;
  }, 0);
  const lastBooking = user.bookings[0] || null;
  const now = Date.now();
  const daysSinceLastBooking = lastBooking
    ? Math.floor((now - new Date(lastBooking.scheduledAt).getTime()) / (24 * 60 * 60 * 1000))
    : null;

  return {
    totalBookings: user.bookings.length,
    activeBookings: activeBookings.length,
    completedBookings: completedBookings.length,
    noShowCount: user.bookings.filter((booking) => booking.status === 'no_show').length,
    cancelledCount: user.bookings.filter((booking) => booking.status === 'cancelled').length,
    totalRevenue,
    totalPaid,
    averageTicket: activeBookings.length ? totalRevenue / activeBookings.length : 0,
    lastBookingAt: lastBooking?.scheduledAt || null,
    daysSinceLastBooking,
  };
};

const buildInviteLink = () => `${getFrontendUrl()}/preferencias`;

export const getMyCrmProfile = async (req, res) => {
  try {
    const profile = await prisma.clientCrmProfile.findUnique({
      where: { userId: req.user.id },
    });

    res.json({
      profile: serializeProfile(profile),
      shouldPrompt: req.user.role !== 'ADMIN' && !profile?.completedAt && !profile?.dismissedAt,
    });
  } catch (error) {
    console.error('Erro ao buscar perfil CRM:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil CRM.' });
  }
};

export const saveMyCrmProfile = async (req, res) => {
  try {
    if (req.user.role === 'ADMIN') {
      return res.status(403).json({ error: 'Perfil CRM e exclusivo para clientes.' });
    }

    const payload = buildProfilePayload(req.body, { complete: true });
    const profile = await prisma.clientCrmProfile.upsert({
      where: { userId: req.user.id },
      update: payload,
      create: {
        userId: req.user.id,
        ...payload,
      },
    });

    res.json({ profile: serializeProfile(profile) });
  } catch (error) {
    console.error('Erro ao salvar perfil CRM:', error);
    res.status(500).json({ error: 'Erro ao salvar suas preferencias.' });
  }
};

export const dismissMyCrmProfilePrompt = async (req, res) => {
  try {
    if (req.user.role === 'ADMIN') return res.json({ ok: true });

    const profile = await prisma.clientCrmProfile.upsert({
      where: { userId: req.user.id },
      update: { dismissedAt: new Date() },
      create: {
        userId: req.user.id,
        status: 'active',
        dismissedAt: new Date(),
      },
    });

    res.json({ profile: serializeProfile(profile) });
  } catch (error) {
    console.error('Erro ao dispensar perfil CRM:', error);
    res.status(500).json({ error: 'Erro ao fechar convite CRM.' });
  }
};

export const listAdminCrmClients = async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        whatsappPhone: true,
        dateOfBirth: true,
        createdAt: true,
        ...profileInclude,
      },
    });

    const clients = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      whatsappPhone: user.whatsappPhone,
      dateOfBirth: user.dateOfBirth,
      createdAt: user.createdAt,
      profile: serializeProfile(user.crmProfile),
      hasCompletedProfile: Boolean(user.crmProfile?.completedAt),
      hasDismissedPrompt: Boolean(user.crmProfile?.dismissedAt),
      hasWhatsapp: Boolean(user.whatsappPhone),
      summary: summarizeUser(user),
    }));

    const missingProfile = clients.filter((client) => !client.hasCompletedProfile);

    res.json({
      inviteLink: buildInviteLink(),
      clients,
      stats: {
        total: clients.length,
        completed: clients.filter((client) => client.hasCompletedProfile).length,
        missing: missingProfile.length,
        withWhatsappMissing: missingProfile.filter((client) => client.hasWhatsapp).length,
        invited: clients.filter((client) => client.profile.inviteSentAt).length,
      },
    });
  } catch (error) {
    console.error('Erro ao listar CRM admin:', error);
    res.status(500).json({ error: 'Erro ao carregar CRM.' });
  }
};

export const updateAdminCrmProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, role: true },
    });

    if (!user || user.role !== 'CLIENT') {
      return res.status(404).json({ error: 'Cliente nao encontrado.' });
    }

    const payload = buildProfilePayload(req.body, { complete: Boolean(req.body.completedAt) });
    const profile = await prisma.clientCrmProfile.upsert({
      where: { userId: user.id },
      update: payload,
      create: {
        userId: user.id,
        ...payload,
      },
    });

    res.json({ profile: serializeProfile(profile) });
  } catch (error) {
    console.error('Erro ao atualizar perfil CRM admin:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil CRM.' });
  }
};

export const inviteCrmClient = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, name: true, email: true, role: true, whatsappPhone: true, crmProfile: true },
    });

    if (!user || user.role !== 'CLIENT') {
      return res.status(404).json({ error: 'Cliente nao encontrado.' });
    }

    if (!user.whatsappPhone) {
      return res.status(400).json({ error: 'Cliente sem WhatsApp cadastrado.' });
    }

    const link = buildInviteLink();
    const result = await sendCrmProfileInvite(user, link);
    const inviteSentAt = result.skipped ? null : new Date();
    const profile = await prisma.clientCrmProfile.upsert({
      where: { userId: user.id },
      update: {
        inviteSentAt,
        inviteSentById: req.user.id,
        lastInviteMessage: result.text || null,
      },
      create: {
        userId: user.id,
        status: 'active',
        inviteSentAt,
        inviteSentById: req.user.id,
        lastInviteMessage: result.text || null,
      },
    });

    res.json({
      message: result.skipped ? result.reason : 'Convite enviado pelo WhatsApp.',
      result,
      profile: serializeProfile(profile),
    });
  } catch (error) {
    console.error('Erro ao enviar convite CRM:', error);
    res.status(500).json({ error: error.message || 'Erro ao enviar convite CRM.' });
  }
};

export const inviteMissingCrmClients = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        whatsappPhone: { not: null },
        OR: [
          { crmProfile: { is: null } },
          { crmProfile: { is: { completedAt: null } } },
        ],
      },
      select: { id: true, name: true, email: true, role: true, whatsappPhone: true },
      orderBy: { name: 'asc' },
    });

    const limit = Math.min(Math.max(Number(req.body?.limit) || users.length, 1), 200);
    const selectedUsers = users.slice(0, limit);
    const link = buildInviteLink();
    const results = [];

    for (const user of selectedUsers) {
      try {
        const result = await sendCrmProfileInvite(user, link);
        const inviteSentAt = result.skipped ? null : new Date();
        await prisma.clientCrmProfile.upsert({
          where: { userId: user.id },
          update: {
            inviteSentAt,
            inviteSentById: req.user.id,
            lastInviteMessage: result.text || null,
          },
          create: {
            userId: user.id,
            status: 'active',
            inviteSentAt,
            inviteSentById: req.user.id,
            lastInviteMessage: result.text || null,
          },
        });
        results.push({ userId: user.id, name: user.name, ok: !result.skipped, message: result.reason || 'enviado' });
      } catch (error) {
        results.push({ userId: user.id, name: user.name, ok: false, message: error.message || 'erro' });
      }
    }

    res.json({
      total: selectedUsers.length,
      sent: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      results,
    });
  } catch (error) {
    console.error('Erro ao enviar convites CRM em massa:', error);
    res.status(500).json({ error: 'Erro ao enviar convites CRM.' });
  }
};
