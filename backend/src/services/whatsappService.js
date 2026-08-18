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

const getProviderMessageId = (result) => {
  const id = result?.id || result?._data?.id;
  if (!id) return null;
  if (typeof id === 'string') return id;
  return id._serialized || id.id || null;
};

const getProviderAck = (result) => {
  const ack = result?.ack ?? result?._data?.ack;
  return Number.isInteger(ack) ? ack : null;
};

const getProviderAckName = (result) => {
  const ackName = result?.ackName || result?._data?.ackName;
  if (ackName) return String(ackName).toUpperCase();

  const ack = getProviderAck(result);
  if (ack === -1) return 'ERROR';
  if (ack === 0) return 'PENDING';
  if (ack === 1) return 'SERVER';
  if (ack === 2) return 'DEVICE';
  if (ack === 3) return 'READ';
  if (ack === 4) return 'PLAYED';
  return null;
};

const getNotificationStatusFromAck = ({ skipped, ack, ackName }) => {
  if (skipped) return 'skipped';
  if (ackName === 'ERROR' || ack === -1) return 'failed';
  if (ackName === 'READ' || ackName === 'PLAYED' || ack >= 3) return 'read';
  if (ackName === 'DEVICE' || ack === 2) return 'delivered';
  if (ackName === 'SERVER' || ack === 1) return 'sent';
  return 'accepted';
};

const getBookingWhatsapp = (booking) => booking.user?.whatsappPhone || booking.attendeePhone;
const minutesToMs = (minutes) => minutes * 60 * 1000;
const DEFAULT_FAILED_RETRY_INTERVAL_MINUTES = 5;
const DEFAULT_FAILED_RETRY_DELAYS_MINUTES = [5, 15, 30, 60];
const DEFAULT_FAILED_RETRY_MAX_ATTEMPTS = 4;
const RETRYABLE_BOOKING_NOTIFICATION_TYPES = [
  'booking_created_owner',
  'booking_created_client',
  'booking_reminder_1h_client',
  'maintenance_reminder_14d_client',
  'maintenance_reminder_21d_client',
];
const CLIENT_NOTIFICATION_TYPES = [
  'booking_created_client',
  'booking_reminder_1h_client',
  'maintenance_reminder_14d_client',
  'maintenance_reminder_21d_client',
];
const SUCCESS_NOTIFICATION_STATUSES = ['accepted', 'sent', 'delivered', 'read'];

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

const buildMaintenanceReminderMessage = (booking, daysAfterService) => {
  const firstName = (booking.attendeeName || booking.user?.name || '').split(' ')[0] || 'Tudo bem';

  return [
    `Oi, ${firstName}! Tudo bem?`,
    '',
    `Ja se passaram ${daysAfterService} dias desde o seu atendimento de ${booking.service || 'unhas em gel'} no Studio Thallyta Silveira.`,
    '',
    'Como esta a sua manutencao? Ja esta no ponto de retocar?',
    'Quer marcar sua manutencao logo para garantir o melhor horario?',
    '',
    'Responda esta mensagem que a gente te ajuda a escolher um dia.',
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

const buildClientDeliveryFailureAlertMessage = (booking, log) => {
  const notificationLabel = log.type === 'booking_reminder_1h_client'
    ? 'lembrete de agendamento'
    : log.type?.startsWith('maintenance_reminder_')
      ? 'lembrete de manutencao'
      : 'confirmacao de agendamento';

  return [
    `Falha ao enviar ${notificationLabel} para a cliente.`,
    '',
    ...buildBookingSummaryLines(booking),
    '',
    `WhatsApp tentado: ${log.target}`,
    log.resolvedTarget ? `Contato WAHA: ${log.resolvedTarget}` : null,
    `Tentativas automaticas: ${log.retryCount}`,
    log.error ? `Erro: ${log.error}` : null,
    '',
    'O WhatsApp nao confirmou a entrega. Confira o numero e, se necessario, fale manualmente com a cliente.',
  ].filter(Boolean).join('\n');
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
  return existing && [...SUCCESS_NOTIFICATION_STATUSES, 'skipped'].includes(existing.status);
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
      providerMessageId: data.providerMessageId,
      providerAck: data.providerAck,
      providerAckName: data.providerAckName,
      resolvedTarget: data.resolvedTarget,
      retryCount: data.retryCount,
      nextRetryAt: data.nextRetryAt,
      adminAlertedAt: data.adminAlertedAt,
      createdAt: now,
    },
  }).catch((error) => {
    if (error.code !== 'P2002') throw error;
  });
};

const sendOnce = async (prisma, { booking, type, target, text, force = false }) => {
  if (!target) return;
  const existing = await getExistingNotification(prisma, { bookingId: booking.id, type, target });
  if (!force && shouldSkipNotification(existing)) return;

  try {
    const result = await sendText({ chatId: target, text });
    const providerAck = getProviderAck(result);
    const providerAckName = getProviderAckName(result);
    const status = getNotificationStatusFromAck({
      skipped: result.skipped,
      ack: providerAck,
      ackName: providerAckName,
    });

    await logNotification(prisma, {
      bookingId: booking.id,
      type,
      target,
      status,
      error: result.skipped
        ? result.reason
        : status === 'failed'
          ? `WAHA retornou ack de erro (${providerAckName || providerAck})`
          : null,
      providerMessageId: getProviderMessageId(result),
      providerAck,
      providerAckName,
      resolvedTarget: result.resolvedChatId || null,
      retryCount: status === 'accepted' ? existing?.retryCount || 0 : 0,
      nextRetryAt: null,
    });
  } catch (error) {
    const retryCount = (existing?.retryCount || 0) + 1;
    await logNotification(prisma, {
      bookingId: booking.id,
      type,
      target,
      status: 'failed',
      error: error.message?.slice(0, 1000) || 'Erro desconhecido',
      retryCount,
      nextRetryAt: getNextRetryAt(retryCount),
    });
    throw error;
  }
};

const getNumberEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const getRetryDelayMinutes = (retryCount) => {
  const configured = (process.env.WHATSAPP_FAILED_RETRY_DELAYS_MINUTES || '')
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value) && value > 0);
  const delays = configured.length ? configured : DEFAULT_FAILED_RETRY_DELAYS_MINUTES;
  return delays[Math.min(Math.max(retryCount - 1, 0), delays.length - 1)];
};

const getMaxRetryAttempts = () => getNumberEnv(
  'WHATSAPP_FAILED_RETRY_MAX_ATTEMPTS',
  DEFAULT_FAILED_RETRY_MAX_ATTEMPTS,
);

const getNextRetryAt = (retryCount) => {
  if (retryCount >= getMaxRetryAttempts()) return null;
  return new Date(Date.now() + minutesToMs(getRetryDelayMinutes(retryCount)));
};

const getRetryText = (booking, type) => {
  if (type === 'booking_created_owner') return buildOwnerBookingMessage(booking);
  if (type === 'booking_created_client') return buildClientBookingMessage(booking);
  if (type === 'booking_reminder_1h_client') return buildClientReminderMessage(booking);
  if (type === 'maintenance_reminder_14d_client') return buildMaintenanceReminderMessage(booking, 14);
  if (type === 'maintenance_reminder_21d_client') return buildMaintenanceReminderMessage(booking, 21);
  return null;
};

const canRetryFailedNotification = (booking, type, now) => {
  if (!booking || ['cancelled', 'no_show'].includes(booking.status)) return false;
  if (type === 'booking_reminder_1h_client') return booking.scheduledAt > now;
  if (type?.startsWith('maintenance_reminder_')) return Boolean(booking.serviceCompletedAt);
  return booking.scheduledAt >= now;
};

const shouldAlertOwnerAboutFailure = (log) => {
  if (log.adminAlertedAt) return false;
  if (!CLIENT_NOTIFICATION_TYPES.includes(log.type)) return false;
  return (log.retryCount || 0) >= getMaxRetryAttempts();
};

const alertOwnerAboutClientNotificationFailure = async (prisma, booking, log) => {
  const ownerChatId = toChatId(process.env.OWNER_WHATSAPP);
  if (!ownerChatId) return false;

  try {
    await sendText({
      chatId: ownerChatId,
      text: buildClientDeliveryFailureAlertMessage(booking, log),
    });

    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { adminAlertedAt: new Date() },
    });
    return true;
  } catch (error) {
    console.error(`Erro ao avisar admin sobre falha de WhatsApp do agendamento ${log.bookingId}:`, error);
    return false;
  }
};

export const retryFailedBookingNotifications = async (prisma) => {
  const now = new Date();
  const batchSize = getNumberEnv('WHATSAPP_FAILED_RETRY_BATCH_SIZE', 25);

  const failedLogs = await prisma.notificationLog.findMany({
    where: {
      status: 'failed',
      type: { in: RETRYABLE_BOOKING_NOTIFICATION_TYPES },
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lte: now } },
      ],
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

    if ((log.retryCount || 0) >= getMaxRetryAttempts()) {
      if (shouldAlertOwnerAboutFailure(log)) {
        await alertOwnerAboutClientNotificationFailure(prisma, booking, log);
      }
      continue;
    }

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
      const latestLog = await prisma.notificationLog.findUnique({ where: { id: log.id } });
      if (latestLog && shouldAlertOwnerAboutFailure(latestLog)) {
        await alertOwnerAboutClientNotificationFailure(prisma, booking, latestLog);
      }
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

  const errors = [];

  try {
    await sendOnce(prisma, {
      booking,
      type: 'booking_created_owner',
      target: ownerChatId,
      text: buildOwnerBookingMessage(booking),
    });
  } catch (error) {
    errors.push(error);
    console.error(`Erro ao enviar WhatsApp booking_created_owner do agendamento ${booking.id}:`, error);
  }

  if (process.env.SEND_CLIENT_WHATSAPP !== 'true') {
    if (errors.length) throw errors[0];
    return;
  }

  const clientPhone = getBookingWhatsapp(booking);
  const clientChatId = toChatId(clientPhone);
  if (!clientChatId) {
    if (errors.length) throw errors[0];
    return;
  }

  try {
    await sendOnce(prisma, {
      booking,
      type: 'booking_created_client',
      target: clientChatId,
      text: buildClientBookingMessage(booking),
    });
  } catch (error) {
    errors.push(error);
    console.error(`Erro ao enviar WhatsApp booking_created_client do agendamento ${booking.id}:`, error);
  }

  if (errors.length) throw errors[0];
};

export const ensureBookingClientNotification = async (prisma, booking) => {
  const clientPhone = getBookingWhatsapp(booking);
  const clientChatId = toChatId(clientPhone);

  if (!clientChatId) {
    throw new Error('Cliente sem WhatsApp para enviar notificacao.');
  }

  const existing = await getExistingNotification(prisma, {
    bookingId: booking.id,
    type: 'booking_created_client',
    target: clientChatId,
  });

  if (existing && SUCCESS_NOTIFICATION_STATUSES.includes(existing.status)) {
    return {
      sent: false,
      status: existing.status,
      message: 'Resumo da cliente ja tinha sido aceito pela WAHA.',
      notification: existing,
    };
  }

  await sendOnce(prisma, {
    booking,
    type: 'booking_created_client',
    target: clientChatId,
    text: buildClientBookingMessage(booking),
    force: true,
  });

  const notification = await getExistingNotification(prisma, {
    bookingId: booking.id,
    type: 'booking_created_client',
    target: clientChatId,
  });

  return {
    sent: true,
    status: notification?.status || 'unknown',
    message: 'Resumo da cliente enviado novamente.',
    notification,
  };
};

export const resendBookingClientNotification = async (prisma, booking) => {
  const clientPhone = getBookingWhatsapp(booking);
  const clientChatId = toChatId(clientPhone);

  if (!clientChatId) {
    throw new Error('Cliente sem WhatsApp para reenviar notificacao.');
  }

  await sendOnce(prisma, {
    booking,
    type: 'booking_created_client',
    target: clientChatId,
    text: buildClientBookingMessage(booking),
    force: true,
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

export const notifyMaintenanceReminder = async (prisma, booking, daysAfterService, options = {}) => {
  if (process.env.SEND_MAINTENANCE_REMINDER_WHATSAPP === 'false') return;

  const clientPhone = getBookingWhatsapp(booking);
  const clientChatId = toChatId(clientPhone);
  if (!clientChatId) return;

  await sendOnce(prisma, {
    booking,
    type: `maintenance_reminder_${daysAfterService}d_client`,
    target: clientChatId,
    text: buildMaintenanceReminderMessage(booking, daysAfterService),
    force: Boolean(options.force),
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

export const sendCrmProfileInvite = async (user, link) => {
  const clientChatId = toChatId(user.whatsappPhone);
  if (!clientChatId) return { skipped: true, reason: 'Cliente sem WhatsApp' };

  const firstName = String(user.name || '').trim().split(/\s+/)[0] || 'cliente';
  const text = [
    `Oi, ${firstName}! Tudo bem?`,
    '',
    'Para deixar seu atendimento no Studio Thallyta Silveira ainda mais personalizado, voce pode preencher rapidinho suas preferencias.',
    '',
    `Acesse: ${link}`,
    '',
    'E opcional e leva menos de 1 minuto.',
  ].join('\n');

  const result = await sendText({ chatId: clientChatId, text });
  return { ...result, text };
};

export const sendCampaignMessage = async (user, text) => {
  const clientChatId = toChatId(user.whatsappPhone);
  if (!clientChatId) return { skipped: true, reason: 'Cliente sem WhatsApp' };

  return sendText({ chatId: clientChatId, text });
};
