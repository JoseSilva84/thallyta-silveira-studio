import prisma from '../config/prisma.js';
import { sendCampaignMessage, sendCrmProfileInvite } from '../services/whatsappService.js';

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

const normalizeDateOfBirth = (value) => {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const error = new Error('Informe uma data de nascimento valida.');
    error.statusCode = 400;
    throw error;
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const isSameDate =
    date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day);

  if (!isSameDate) {
    const error = new Error('Informe uma data de nascimento valida.');
    error.statusCode = 400;
    throw error;
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (date > todayUtc) {
    const error = new Error('A data de nascimento nao pode ser futura.');
    error.statusCode = 400;
    throw error;
  }

  return date;
};

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
  doNotInviteAt: profile?.doNotInviteAt || null,
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
const INVITE_COOLDOWN_DAYS = 15;

const canInviteProfile = (profile) => {
  if (profile?.completedAt || profile?.doNotInviteAt) return false;
  if (!profile?.inviteSentAt) return true;
  const elapsedMs = Date.now() - new Date(profile.inviteSentAt).getTime();
  return elapsedMs >= INVITE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
};

export const getMyCrmProfile = async (req, res) => {
  try {
    const [profile, user] = await Promise.all([
      prisma.clientCrmProfile.findUnique({
        where: { userId: req.user.id },
      }),
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { dateOfBirth: true },
      }),
    ]);

    res.json({
      profile: serializeProfile(profile),
      user: { dateOfBirth: user?.dateOfBirth || null },
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
    const hasDateOfBirthField = Object.prototype.hasOwnProperty.call(req.body, 'dateOfBirth');

    const [profile, user] = await prisma.$transaction(async (tx) => {
      const savedProfile = await tx.clientCrmProfile.upsert({
        where: { userId: req.user.id },
        update: payload,
        create: {
          userId: req.user.id,
          ...payload,
        },
      });

      const savedUser = hasDateOfBirthField
        ? await tx.user.update({
            where: { id: req.user.id },
            data: { dateOfBirth: normalizeDateOfBirth(req.body.dateOfBirth) },
            select: { dateOfBirth: true },
          })
        : await tx.user.findUnique({
            where: { id: req.user.id },
            select: { dateOfBirth: true },
          });

      return [savedProfile, savedUser];
    });

    res.json({ profile: serializeProfile(profile), user });
  } catch (error) {
    console.error('Erro ao salvar perfil CRM:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao salvar suas preferencias.' });
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

const getClientKey = (booking) => {
  if (booking.user?.id) return `user:${booking.user.id}`;
  const email = String(booking.attendeeEmail || '').trim().toLowerCase();
  if (email) return `email:${email}`;
  const phone = String(booking.attendeePhone || '').replace(/\D/g, '');
  if (phone) return `phone:${phone}`;
  return `booking:${booking.id}`;
};

const buildClientSummariesFromBookings = (bookings) => {
  const clients = new Map();

  for (const booking of bookings) {
    const key = getClientKey(booking);
    if (!clients.has(key)) {
      clients.set(key, {
        key,
        id: booking.user?.id || key,
        userId: booking.user?.id || null,
        name: booking.user?.name || booking.attendeeName || 'Cliente',
        email: booking.user?.email || booking.attendeeEmail || '',
        whatsappPhone: booking.user?.whatsappPhone || booking.attendeePhone || '',
        dateOfBirth: booking.user?.dateOfBirth || null,
        createdAt: booking.user?.createdAt || booking.createdAt,
        crmProfile: booking.user?.crmProfile || null,
        bookings: [],
      });
    }

    const client = clients.get(key);
    if (!client.userId && booking.user?.id) client.userId = booking.user.id;
    if (!client.dateOfBirth && booking.user?.dateOfBirth) client.dateOfBirth = booking.user.dateOfBirth;
    if (!client.whatsappPhone && (booking.user?.whatsappPhone || booking.attendeePhone)) {
      client.whatsappPhone = booking.user?.whatsappPhone || booking.attendeePhone;
    }
    if (!client.crmProfile && booking.user?.crmProfile) client.crmProfile = booking.user.crmProfile;
    client.bookings.push(booking);
  }

  return Array.from(clients.values());
};

const summarizeBookingClient = (client) => {
  const activeBookings = client.bookings.filter((booking) => !['cancelled', 'no_show'].includes(booking.status));
  const completedBookings = activeBookings.filter((booking) => booking.serviceCompletedAt);
  const totalRevenue = activeBookings.reduce((sum, booking) => {
    const value = Number(booking.estimatedValue);
    return Number.isFinite(value) && value > 0 ? sum + value : sum;
  }, 0);
  const lastBooking = client.bookings
    .slice()
    .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt))[0] || null;
  const daysSinceLastBooking = lastBooking
    ? Math.floor((Date.now() - new Date(lastBooking.scheduledAt).getTime()) / (24 * 60 * 60 * 1000))
    : null;

  return {
    totalBookings: client.bookings.length,
    activeBookings: activeBookings.length,
    completedBookings: completedBookings.length,
    noShowCount: client.bookings.filter((booking) => booking.status === 'no_show').length,
    cancelledCount: client.bookings.filter((booking) => booking.status === 'cancelled').length,
    totalRevenue,
    totalPaid: 0,
    averageTicket: activeBookings.length ? totalRevenue / activeBookings.length : 0,
    lastBookingAt: lastBooking?.scheduledAt || null,
    daysSinceLastBooking,
  };
};

export const listAdminCrmClients = async (_req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: { scheduledAt: 'desc' },
      select: {
        id: true,
        service: true,
        estimatedValue: true,
        scheduledAt: true,
        status: true,
        serviceCompletedAt: true,
        attendeeName: true,
        attendeeEmail: true,
        attendeePhone: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            whatsappPhone: true,
            dateOfBirth: true,
            createdAt: true,
            crmProfile: true,
          },
        },
      },
    });

    const registeredUsersWithoutBookings = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        bookings: { none: {} },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        whatsappPhone: true,
        dateOfBirth: true,
        createdAt: true,
        crmProfile: true,
        bookingPayments: {
          select: {
            amount: true,
            servicePrice: true,
            status: true,
            remainingPaidAt: true,
          },
        },
      },
    });

    const clientsFromBookings = buildClientSummariesFromBookings(bookings);
    const clientsFromUsers = registeredUsersWithoutBookings.map((user) => ({
      key: `user:${user.id}`,
      id: user.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      whatsappPhone: user.whatsappPhone,
      dateOfBirth: user.dateOfBirth,
      createdAt: user.createdAt,
      crmProfile: user.crmProfile,
      bookings: [],
      bookingPayments: user.bookingPayments,
    }));

    const clients = [...clientsFromBookings, ...clientsFromUsers]
      .map((client) => {
        const profile = serializeProfile(client.crmProfile);
        const hasCompletedProfile = Boolean(client.crmProfile?.completedAt);
        return {
          id: client.id,
          key: client.key,
          userId: client.userId,
          name: client.name,
          email: client.email,
          whatsappPhone: client.whatsappPhone,
          dateOfBirth: client.dateOfBirth,
          createdAt: client.createdAt,
          profile,
          hasCompletedProfile,
          hasDismissedPrompt: Boolean(client.crmProfile?.dismissedAt),
          hasWhatsapp: Boolean(client.whatsappPhone),
          canSendSystemInvite: Boolean(client.userId && client.whatsappPhone && !hasCompletedProfile && canInviteProfile(client.crmProfile)),
          inviteBlocked: Boolean(client.crmProfile?.doNotInviteAt),
          summary: client.bookings?.length ? summarizeBookingClient(client) : summarizeUser(client),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const missingProfile = clients.filter((client) => !client.hasCompletedProfile);

    res.json({
      inviteLink: buildInviteLink(),
      clients,
      stats: {
        total: clients.length,
        completed: clients.filter((client) => client.hasCompletedProfile).length,
        missing: missingProfile.length,
        withWhatsappMissing: missingProfile.filter((client) => client.hasWhatsapp).length,
        noSource: clients.filter((client) => !client.profile.source).length,
        noPreferences: clients.filter((client) => !client.profile.interests.length && !client.profile.preferredPeriods.length).length,
        noBirthday: clients.filter((client) => !client.dateOfBirth).length,
        doNotInvite: clients.filter((client) => client.inviteBlocked).length,
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

export const markCrmClientDoNotInvite = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, role: true },
    });

    if (!user || user.role !== 'CLIENT') {
      return res.status(404).json({ error: 'Cliente com conta nao encontrado.' });
    }

    const shouldBlock = req.body?.doNotInvite !== false;
    const profile = await prisma.clientCrmProfile.upsert({
      where: { userId: user.id },
      update: {
        doNotInviteAt: shouldBlock ? new Date() : null,
        doNotInviteById: shouldBlock ? req.user.id : null,
      },
      create: {
        userId: user.id,
        status: 'active',
        doNotInviteAt: shouldBlock ? new Date() : null,
        doNotInviteById: shouldBlock ? req.user.id : null,
      },
    });

    res.json({ profile: serializeProfile(profile) });
  } catch (error) {
    console.error('Erro ao atualizar bloqueio de convite CRM:', error);
    res.status(500).json({ error: 'Erro ao atualizar controle de convite CRM.' });
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

    if (!canInviteProfile(user.crmProfile)) {
      return res.status(409).json({ error: 'Convite bloqueado, ja enviado recentemente ou perfil preenchido.' });
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
          {
            crmProfile: {
              is: {
                completedAt: null,
                doNotInviteAt: null,
                OR: [
                  { inviteSentAt: null },
                  { inviteSentAt: { lt: new Date(Date.now() - INVITE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000) } },
                ],
              },
            },
          },
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

export const sendCrmCampaign = async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    const clientIds = Array.isArray(req.body?.clientIds) ? req.body.clientIds.map(String).filter(Boolean) : [];
    const promotional = req.body?.promotional !== false;

    if (!message || message.length < 5) {
      return res.status(400).json({ error: 'Informe uma mensagem para a campanha.' });
    }

    if (message.length > 1200) {
      return res.status(400).json({ error: 'Mensagem muito longa. Use no maximo 1200 caracteres.' });
    }

    if (!clientIds.length) {
      return res.status(400).json({ error: 'Selecione pelo menos uma cliente.' });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: clientIds.slice(0, 200) },
        role: 'CLIENT',
        whatsappPhone: { not: null },
      },
      select: {
        id: true,
        name: true,
        whatsappPhone: true,
        crmProfile: true,
      },
      orderBy: { name: 'asc' },
    });

    const results = [];

    for (const user of users) {
      if (user.crmProfile?.doNotInviteAt) {
        results.push({ userId: user.id, name: user.name, ok: false, skipped: true, message: 'nao insistir' });
        continue;
      }

      if (promotional && user.crmProfile?.allowPromotions === false) {
        results.push({ userId: user.id, name: user.name, ok: false, skipped: true, message: 'nao aceita promocoes' });
        continue;
      }

      try {
        const firstName = String(user.name || '').trim().split(/\s+/)[0] || 'cliente';
        const personalizedText = message
          .replace(/\{nome\}/gi, user.name || firstName)
          .replace(/\{primeiro_nome\}/gi, firstName);
        const result = await sendCampaignMessage(user, personalizedText);
        results.push({
          userId: user.id,
          name: user.name,
          ok: !result.skipped,
          skipped: Boolean(result.skipped),
          message: result.reason || 'enviado',
        });
      } catch (error) {
        results.push({ userId: user.id, name: user.name, ok: false, message: error.message || 'erro' });
      }
    }

    res.json({
      total: users.length,
      sent: results.filter((item) => item.ok).length,
      skipped: results.filter((item) => item.skipped).length,
      failed: results.filter((item) => !item.ok && !item.skipped).length,
      results,
    });
  } catch (error) {
    console.error('Erro ao enviar campanha CRM:', error);
    res.status(500).json({ error: 'Erro ao enviar campanha CRM.' });
  }
};
