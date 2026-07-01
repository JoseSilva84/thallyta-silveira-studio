const enabled = () => process.env.WHATSAPP_ENABLED === 'true';

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;
  return digits.startsWith('55') ? digits : `55${digits}`;
};

const toChatId = (phone) => {
  const normalized = normalizePhone(phone);
  return normalized ? `${normalized}@c.us` : null;
};

const getWahaConfig = () => ({
  baseUrl: process.env.WAHA_BASE_URL?.replace(/\/$/, ''),
  apiKey: process.env.WAHA_API_KEY,
  session: process.env.WAHA_SESSION || 'default',
});

const resolveChatId = async (chatId) => {
  const { baseUrl, apiKey, session } = getWahaConfig();
  const phone = String(chatId || '').replace(/@c\.us$/, '').replace(/\D/g, '');
  const url = new URL(`${baseUrl}/api/contacts/check-exists`);
  url.searchParams.set('phone', phone);
  url.searchParams.set('session', session);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Api-Key': apiKey,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `WAHA retornou HTTP ${response.status} ao validar o numero`);
  }

  const result = await response.json();
  if (!result.numberExists || !result.chatId) {
    throw new Error(`O numero ${phone} nao foi encontrado no WhatsApp`);
  }

  return result.chatId;
};

const formatDateTime = (date) => {
  if (!date) return 'Nao informado';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date));
};

const formatDate = (date) => {
  if (!date) return 'Nao informado';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    dateStyle: 'full',
  }).format(new Date(date));
};

const formatTime = (date) => {
  if (!date) return 'Nao informado';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const formatCurrency = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Nao informado';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const getPaymentSummary = (booking) => {
  const serviceValue = Number(booking.payment?.servicePrice ?? booking.estimatedValue);
  const paidValue = Number(booking.payment?.amount);
  const hasPaidValue = Number.isFinite(paidValue) && paidValue > 0;
  const remainingValue = Number.isFinite(serviceValue) && hasPaidValue
    ? Math.max(0, serviceValue - paidValue)
    : null;

  return {
    paid: hasPaidValue ? paidValue : null,
    remaining: booking.payment?.remainingPaidAt ? 0 : remainingValue,
  };
};

const sendText = async ({ chatId, text }) => {
  if (!enabled()) return { skipped: true, reason: 'WHATSAPP_ENABLED=false' };

  const { baseUrl, apiKey, session } = getWahaConfig();

  if (!baseUrl || !apiKey) {
    return { skipped: true, reason: 'WAHA_BASE_URL ou WAHA_API_KEY ausente' };
  }

  const resolvedChatId = await resolveChatId(chatId);
  if (resolvedChatId !== chatId) {
    console.log(`WhatsApp ajustado pela WAHA: ${chatId} -> ${resolvedChatId}`);
  }

  const response = await fetch(`${baseUrl}/api/sendText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({ chatId: resolvedChatId, text, session }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `WAHA retornou HTTP ${response.status}`);
  }

  const result = await response.json().catch(() => ({ ok: true }));
  console.log(`WhatsApp aceito pela WAHA para ${resolvedChatId}`);
  return { ...result, resolvedChatId };
};

const getBookingWhatsapp = (booking) => booking.user?.whatsappPhone || booking.attendeePhone;
const minutesToMs = (minutes) => minutes * 60 * 1000;
const DEFAULT_FAILED_RETRY_INTERVAL_MINUTES = 5;
const RETRYABLE_BOOKING_NOTIFICATION_TYPES = [
  'booking_created_owner',
  'booking_created_client',
  'booking_reminder_1h_client',
];

const buildBookingSummaryLines = (booking) => {
  const whatsapp = booking.user?.whatsappPhone || booking.attendeePhone;
  const payment = getPaymentSummary(booking);

  return [
    `Cliente: ${booking.attendeeName || booking.user?.name || 'Nao informado'}`,
    `Email: ${booking.attendeeEmail || booking.user?.email || 'Nao informado'}`,
    whatsapp ? `WhatsApp: ${whatsapp}` : null,
    `Servico: ${booking.service || 'Nao informado'}`,
    `Valor: ${formatCurrency(booking.estimatedValue)}`,
    payment.paid !== null ? `Pago: ${formatCurrency(payment.paid)}` : null,
    payment.remaining !== null ? `Restante: ${formatCurrency(payment.remaining)}` : null,
    `Data/Horario: ${formatDateTime(booking.scheduledAt)}`,
  ].filter(Boolean);
};

const buildOwnerBookingMessage = (booking) => {
  return [
    'Novo agendamento confirmado',
    '',
    ...buildBookingSummaryLines(booking),
  ].join('\n');
};

const buildClientBookingMessage = (booking) => {
  const firstName = (booking.attendeeName || booking.user?.name || '').split(' ')[0] || 'Tudo bem';
  return [
    `Olá, ${firstName}! Seu agendamento no Studio Thallyta Silveira foi confirmado:`,
    '',
    ...buildBookingSummaryLines(booking),
    '',
    'Se precisar reagendar ou cancelar, acesse sua área de agendamentos.',
  ].join('\n');
};

const buildClientReminderMessage = (booking) => {
  const firstName = (booking.attendeeName || booking.user?.name || '').split(' ')[0] || 'Tudo bem';

  return [
    `Olá, ${firstName}! Estamos aguardando você daqui a 1 hora no Studio Thallyta Silveira.`,
    '',
    `Dia: ${formatDate(booking.scheduledAt)}`,
    `Horário: ${formatTime(booking.scheduledAt)}`,
    `Serviço: ${booking.service || 'Não informado'}`,
    '',
    `Até já, ${firstName}!`,
    '',
    'Studio Thallyta Silveira - Servindo beleza e bem-estar com carinho.',
  ].join('\n');
};

const buildBirthdayRewardMessage = (user, amount = 0) => {
  const firstName = (user.name || '').split(' ')[0] || 'cliente';
  const rewardText = amount > 0 
    ? `Você ganhou um mimo da Studio Thallyta Silveira.\n\nPara saber mais sobre esse mimo, responda esta mensagem ou fale com a nossa equipe.`
    : `O Studio Thallyta Silveira deseja a voce um dia incrível e cheio de luz.\n\nFale conosco para agendar um horário e celebrar cuidando de voce!`;

  return [
    `Parabéns, ${firstName}!`,
    '',
    rewardText,
    '',
    'Que seu dia seja lindo, leve e cheio de carinho. Feliz aniversário!',
  ].join('\n');
};

const getExistingNotification = async (prisma, { bookingId, type, target }) => {
  const existing = await prisma.notificationLog.findUnique({
    where: {
      bookingId_type_target: { bookingId, type, target },
    },
  });
  return existing;
};

const shouldSkipNotification = (existing) => {
  return existing && ['sent', 'skipped'].includes(existing.status);
};

const logNotification = async (prisma, data) => {
  const now = new Date();

  await prisma.notificationLog.upsert({
    where: {
      bookingId_type_target: {
        bookingId: data.bookingId,
        type: data.type,
        target: data.target,
      },
    },
    create: {
      ...data,
      createdAt: now,
    },
    update: {
      status: data.status,
      error: data.error,
      createdAt: now,
    },
  }).catch((error) => {
    if (error.code !== 'P2002') throw error;
  });
};

const sendOnce = async (prisma, { booking, type, target, text }) => {
  if (!target) return;
  const existing = await getExistingNotification(prisma, { bookingId: booking.id, type, target });
  if (shouldSkipNotification(existing)) return;

  try {
    const result = await sendText({ chatId: target, text });
    await logNotification(prisma, {
      bookingId: booking.id,
      type,
      target,
      status: result.skipped ? 'skipped' : 'sent',
      error: result.skipped ? result.reason : null,
    });
  } catch (error) {
    await logNotification(prisma, {
      bookingId: booking.id,
      type,
      target,
      status: 'failed',
      error: error.message?.slice(0, 1000) || 'Erro desconhecido',
    });
    throw error;
  }
};

const getNumberEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const getRetryText = (booking, type) => {
  if (type === 'booking_created_owner') return buildOwnerBookingMessage(booking);
  if (type === 'booking_created_client') return buildClientBookingMessage(booking);
  if (type === 'booking_reminder_1h_client') return buildClientReminderMessage(booking);
  return null;
};

const canRetryFailedNotification = (booking, type, now) => {
  if (!booking || ['cancelled', 'no_show'].includes(booking.status)) return false;
  if (type === 'booking_reminder_1h_client') return booking.scheduledAt > now;
  return booking.scheduledAt >= now;
};

export const retryFailedBookingNotifications = async (prisma) => {
  const now = new Date();
  const batchSize = getNumberEnv('WHATSAPP_FAILED_RETRY_BATCH_SIZE', 25);

  const failedLogs = await prisma.notificationLog.findMany({
    where: {
      status: 'failed',
      type: { in: RETRYABLE_BOOKING_NOTIFICATION_TYPES },
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  if (!failedLogs.length) return 0;

  const bookings = await prisma.booking.findMany({
    where: {
      id: { in: [...new Set(failedLogs.map((log) => log.bookingId))] },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, whatsappPhone: true },
      },
      payment: true,
    },
  });
  const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]));

  let retried = 0;
  for (const log of failedLogs) {
    const booking = bookingsById.get(log.bookingId);
    const text = getRetryText(booking, log.type);

    if (!text || !canRetryFailedNotification(booking, log.type, now)) continue;

    try {
      await sendOnce(prisma, {
        booking,
        type: log.type,
        target: log.target,
        text,
      });
      retried += 1;
    } catch (error) {
      console.error(`Erro ao retentar WhatsApp ${log.type} do agendamento ${log.bookingId}:`, error);
    }
  }

  return retried;
};

export const startFailedWhatsAppRetryService = (prisma) => {
  if (process.env.WHATSAPP_FAILED_RETRY_ENABLED === 'false') {
    console.log('Retentativas de WhatsApp com falha desativadas.');
    return null;
  }

  if (!enabled()) {
    console.log('Retentativas de WhatsApp com falha desativadas porque WHATSAPP_ENABLED=false.');
    return null;
  }

  const intervalMinutes = getNumberEnv(
    'WHATSAPP_FAILED_RETRY_INTERVAL_MINUTES',
    DEFAULT_FAILED_RETRY_INTERVAL_MINUTES,
  );

  void retryFailedBookingNotifications(prisma).catch((error) => {
    console.error('Erro ao executar retentativas iniciais de WhatsApp:', error);
  });

  const timer = setInterval(() => {
    void retryFailedBookingNotifications(prisma).catch((error) => {
      console.error('Erro ao executar retentativas de WhatsApp:', error);
    });
  }, minutesToMs(intervalMinutes));

  if (typeof timer.unref === 'function') timer.unref();
  console.log(`Retentativas de WhatsApp com falha ativas a cada ${intervalMinutes} minuto(s).`);

  return timer;
};

export const notifyBookingCreated = async (prisma, booking) => {
  const ownerChatId = toChatId(process.env.OWNER_WHATSAPP);

  await sendOnce(prisma, {
    booking,
    type: 'booking_created_owner',
    target: ownerChatId,
    text: buildOwnerBookingMessage(booking),
  });

  if (process.env.SEND_CLIENT_WHATSAPP !== 'true') return;

  const clientPhone = getBookingWhatsapp(booking);
  const clientChatId = toChatId(clientPhone);
  if (!clientChatId) return;

  await sendOnce(prisma, {
    booking,
    type: 'booking_created_client',
    target: clientChatId,
    text: buildClientBookingMessage(booking),
  });
};

export const notifyUpcomingBookingReminder = async (prisma, booking) => {
  if (process.env.SEND_CLIENT_REMINDER_WHATSAPP !== 'true') return;

  const clientPhone = getBookingWhatsapp(booking);
  const clientChatId = toChatId(clientPhone);
  if (!clientChatId) return;

  await sendOnce(prisma, {
    booking,
    type: 'booking_reminder_1h_client',
    target: clientChatId,
    text: buildClientReminderMessage(booking),
  });
};

export const notifyBirthdayReward = async (user, amount = 0) => {
  const clientChatId = toChatId(user.whatsappPhone);
  if (!clientChatId) return { skipped: true, reason: 'Cliente sem WhatsApp' };

  return sendText({
    chatId: clientChatId,
    text: buildBirthdayRewardMessage(user, amount),
  });
};
