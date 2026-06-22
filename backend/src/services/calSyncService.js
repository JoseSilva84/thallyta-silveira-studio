import prisma from '../config/prisma.js';
import { findServiceById, services } from '../data/services.js';
import { createCalBooking } from './calService.js';

const DEFAULT_SYNC_INTERVAL_MINUTES = 2;
const DEFAULT_SYNC_LIMIT = 10;

const minutesToMs = (minutes) => minutes * 60 * 1000;

const getNumberEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const bookingInclude = {
  user: {
    select: { id: true, name: true, email: true, whatsappPhone: true },
  },
  payment: true,
};

const findServiceForBooking = (booking) => {
  if (booking.payment?.serviceId) return findServiceById(booking.payment.serviceId);
  const bookingServiceName = (booking.service || '').split(',')[0]?.trim().toLowerCase();
  return services.find((service) => service.name.toLowerCase() === bookingServiceName) || null;
};

const bookingHasCalFallback = (booking) => Boolean(
  booking.calPayload?.calendarFallback
  || String(booking.calEventId || '').startsWith('site-payment-'),
);

export const syncBookingToCalById = async (bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingInclude,
  });

  if (!booking) {
    const error = new Error('Agendamento nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  if (booking.status === 'cancelled' || booking.status === 'no_show') {
    const error = new Error('Este agendamento nao deve ser enviado ao Cal.com.');
    error.statusCode = 409;
    throw error;
  }

  if (!bookingHasCalFallback(booking) && booking.calPayload?.calBooking) {
    const error = new Error('Este agendamento ja possui reserva no Cal.com.');
    error.statusCode = 409;
    throw error;
  }

  const service = findServiceForBooking(booking);
  if (!service) {
    const error = new Error('Servico do agendamento nao encontrado no catalogo.');
    error.statusCode = 400;
    throw error;
  }

  const notes = [
    `Servico: ${booking.service || service.name}`,
    booking.estimatedValue ? `Valor: R$ ${Number(booking.estimatedValue).toFixed(2)}` : null,
    booking.attendeePhone ? `WhatsApp: ${booking.attendeePhone}` : null,
    booking.notes,
    '(Agendamento reenviado ao Cal.com pelo sistema)',
  ].filter(Boolean).join('\n');

  const calBooking = await createCalBooking({
    eventTypeSlug: service.calSlug || 'servicos-gerais',
    start: new Date(booking.scheduledAt).toISOString(),
    attendeeName: booking.attendeeName || booking.user?.name || 'Cliente',
    attendeeEmail: booking.attendeeEmail || booking.user?.email,
    attendeePhone: booking.attendeePhone || booking.user?.whatsappPhone,
    notes,
    lengthInMinutes: service.durationMin || 60,
    adminCreated: true,
    metadata: {
      bookingId: booking.id,
      bookingPaymentId: booking.paymentId || '',
      serviceId: service.id,
      serviceName: service.name,
      estimatedValue: Number(booking.estimatedValue || service.price || 0).toFixed(2),
      attendeeWhatsapp: booking.attendeePhone || booking.user?.whatsappPhone || '',
      syncedFromFallback: true,
    },
  });

  return prisma.booking.update({
    where: { id: booking.id },
    data: {
      calEventId: calBooking.uid,
      calPayload: {
        ...(booking.calPayload || {}),
        calBooking,
        calBookingError: null,
        calendarFallback: false,
        syncedToCalAt: new Date().toISOString(),
      },
    },
    include: bookingInclude,
  });
};

export const syncFallbackBookingsToCal = async (bookings) => {
  const now = new Date();
  const fallbackBookings = bookings.filter((booking) =>
    booking.scheduledAt > now
    && !['cancelled', 'no_show'].includes(booking.status)
    && bookingHasCalFallback(booking),
  );

  if (!fallbackBookings.length) return bookings;

  const updatedById = new Map();

  for (const booking of fallbackBookings) {
    try {
      const updated = await syncBookingToCalById(booking.id);
      updatedById.set(updated.id, updated);
    } catch (error) {
      const calPayload = {
        ...(booking.calPayload || {}),
        calendarFallback: true,
        calBookingError: error.message || 'Erro ao sincronizar com Cal.com.',
        lastCalSyncAttemptAt: new Date().toISOString(),
      };
      await prisma.booking.update({
        where: { id: booking.id },
        data: { calPayload },
      }).catch((updateError) => {
        console.error('Erro ao registrar falha de sincronizacao com Cal.com:', {
          bookingId: booking.id,
          error: updateError.message,
        });
      });
      console.error('Sincronizacao automatica com Cal.com falhou:', {
        bookingId: booking.id,
        calEventId: booking.calEventId,
        error: error.message,
      });
    }
  }

  if (!updatedById.size) return bookings;
  return bookings.map((booking) => updatedById.get(booking.id) || booking);
};

export const syncDueFallbackBookingsToCal = async () => {
  const limit = getNumberEnv('CAL_FALLBACK_SYNC_LIMIT', DEFAULT_SYNC_LIMIT);
  const bookings = await prisma.booking.findMany({
    where: {
      scheduledAt: { gt: new Date() },
      status: { notIn: ['cancelled', 'no_show'] },
      OR: [
        {
          calEventId: {
            startsWith: 'site-payment-',
          },
        },
        {
          calPayload: {
            path: ['calendarFallback'],
            equals: true,
          },
        },
      ],
    },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
    include: bookingInclude,
  });

  await syncFallbackBookingsToCal(bookings);
  return bookings.length;
};

export const startCalFallbackSyncService = () => {
  if (process.env.CAL_FALLBACK_SYNC_ENABLED === 'false') {
    console.log('Sincronizacao de fallback com Cal.com desativada.');
    return null;
  }

  const intervalMinutes = getNumberEnv('CAL_FALLBACK_SYNC_INTERVAL_MINUTES', DEFAULT_SYNC_INTERVAL_MINUTES);

  void syncDueFallbackBookingsToCal().catch((error) => {
    console.error('Erro ao executar sincronizacao inicial com Cal.com:', error);
  });

  const timer = setInterval(() => {
    void syncDueFallbackBookingsToCal().catch((error) => {
      console.error('Erro ao executar sincronizacao com Cal.com:', error);
    });
  }, minutesToMs(intervalMinutes));

  if (typeof timer.unref === 'function') timer.unref();
  console.log(`Sincronizacao de fallback com Cal.com ativa a cada ${intervalMinutes} minuto(s).`);

  return timer;
};
