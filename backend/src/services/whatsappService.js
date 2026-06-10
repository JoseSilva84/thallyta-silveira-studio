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

const buildOwnerBookingMessage = (booking) => {
  const whatsapp = booking.user?.whatsappPhone || booking.attendeePhone || 'Nao informado';

  return [
    'Novo agendamento confirmado',
    '',
    `Cliente: ${booking.attendeeName || booking.user?.name || 'Nao informado'}`,
    `WhatsApp: ${whatsapp}`,
    `Email: ${booking.attendeeEmail || booking.user?.email || 'Nao informado'}`,
    `Servico: ${booking.service || 'Nao informado'}`,
    `Valor: ${formatCurrency(booking.estimatedValue)}`,
    `Data/Horario: ${formatDateTime(booking.scheduledAt)}`,
    booking.endTime ? `Termina: ${formatDateTime(booking.endTime)}` : null,
    `Local: ${booking.location || 'Presencial'}`,
  ].filter(Boolean).join('\n');
};

const buildClientBookingMessage = (booking) => {
  const firstName = (booking.attendeeName || booking.user?.name || '').split(' ')[0] || 'Tudo bem';
  return [
    `Ola, ${firstName}! Seu agendamento no Studio Thallyta Silveira foi confirmado.`,
    '',
    `Servico: ${booking.service || 'Nao informado'}`,
    `Valor: ${formatCurrency(booking.estimatedValue)}`,
    `Data/Horario: ${formatDateTime(booking.scheduledAt)}`,
    '',
    'Se precisar reagendar ou cancelar, acesse sua area de agendamentos.',
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

  const clientPhone = booking.attendeePhone || booking.user?.whatsappPhone;
  const clientChatId = toChatId(clientPhone);
  if (!clientChatId) return;

  await sendOnce(prisma, {
    booking,
    type: 'booking_created_client',
    target: clientChatId,
    text: buildClientBookingMessage(booking),
  });
};
