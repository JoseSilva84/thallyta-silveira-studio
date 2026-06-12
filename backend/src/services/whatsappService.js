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

const sendText = async ({ chatId, text }) => {
  if (!enabled()) return { skipped: true, reason: 'WHATSAPP_ENABLED=false' };

  const baseUrl = process.env.WAHA_BASE_URL?.replace(/\/$/, '');
  const apiKey = process.env.WAHA_API_KEY;
  const session = process.env.WAHA_SESSION || 'default';

  if (!baseUrl || !apiKey) {
    return { skipped: true, reason: 'WAHA_BASE_URL ou WAHA_API_KEY ausente' };
  }

  const response = await fetch(`${baseUrl}/api/sendText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({ chatId, text, session }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `WAHA retornou HTTP ${response.status}`);
  }

  return response.json().catch(() => ({ ok: true }));
};

const getBookingWhatsapp = (booking) => booking.user?.whatsappPhone || booking.attendeePhone;

const buildBookingSummaryLines = (booking) => {
  const whatsapp = booking.user?.whatsappPhone || booking.attendeePhone;

  return [
    `Cliente: ${booking.attendeeName || booking.user?.name || 'Nao informado'}`,
    `Email: ${booking.attendeeEmail || booking.user?.email || 'Nao informado'}`,
    whatsapp ? `WhatsApp: ${whatsapp}` : null,
    `Servico: ${booking.service || 'Nao informado'}`,
    `Valor: ${formatCurrency(booking.estimatedValue)}`,
    `Data/Horario: ${formatDateTime(booking.scheduledAt)}`,
    booking.endTime ? `Termina: ${formatDateTime(booking.endTime)}` : null,
    `Local: ${booking.location || 'Presencial'}`,
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
    'Até já, ${firstName}!',
    '',
    'Studio Thallyta Silveira - Servindo beleza e bem-estar com carinho.',
  ].join('\n');
};

const alreadyLogged = async (prisma, { bookingId, type, target }) => {
  const existing = await prisma.notificationLog.findUnique({
    where: {
      bookingId_type_target: { bookingId, type, target },
    },
  });
  return Boolean(existing);
};

const logNotification = async (prisma, data) => {
  await prisma.notificationLog.create({ data }).catch((error) => {
    if (error.code !== 'P2002') throw error;
  });
};

const sendOnce = async (prisma, { booking, type, target, text }) => {
  if (!target) return;
  if (await alreadyLogged(prisma, { bookingId: booking.id, type, target })) return;

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
