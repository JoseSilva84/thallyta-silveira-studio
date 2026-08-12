import prisma from '../config/prisma.js';
import { confirmCalBooking, createCalBooking } from '../services/calService.js';
import { syncBookingToCalById } from '../services/calSyncService.js';
import { findServiceById } from '../data/services.js';
import { ensureBookingClientNotification, notifyBookingCreated, resendBookingClientNotification } from '../services/whatsappService.js';
import { buildPublicAgendaDays, validateBookingWindow } from '../utils/bookingHours.js';
import { randomUUID } from 'node:crypto';

const bookingInclude = {
  user: {
    select: { id: true, name: true, email: true, whatsappPhone: true, dateOfBirth: true },
  },
  payment: true,
};

const normalizeWhatsappPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;

  const withCountryCode = digits.startsWith('55') ? digits : `55${digits}`;

  if (withCountryCode.length < 12 || withCountryCode.length > 13) {
    throw new Error('Informe um WhatsApp valido com DDD.');
  }

  return withCountryCode;
};

const safeNormalizeWhatsappPhone = (value) => {
  try {
    return normalizeWhatsappPhone(value);
  } catch {
    return null;
  }
};

const attachNotificationStatus = async (bookings) => {
  const items = Array.isArray(bookings) ? bookings : [bookings].filter(Boolean);
  if (!items.length) return bookings;

  const logs = await prisma.notificationLog.findMany({
    where: {
      bookingId: { in: items.map((booking) => booking.id) },
      type: {
        in: [
          'booking_created_owner',
          'booking_created_client',
          'booking_reminder_1h_client',
          'maintenance_reminder_14d_client',
          'maintenance_reminder_21d_client',
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const logsByBooking = new Map();
  for (const log of logs) {
    if (!logsByBooking.has(log.bookingId)) logsByBooking.set(log.bookingId, {});
    const group = logsByBooking.get(log.bookingId);
    if (!group[log.type]) group[log.type] = log;
  }

  for (const booking of items) {
    booking.whatsappNotifications = logsByBooking.get(booking.id) || {};
  }

  return bookings;
};

/**
 * GET /api/bookings
 * Admin: retorna todos os agendamentos.
 * Client: retorna apenas os agendamentos do próprio usuário.
 */
export const getBookings = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const where = isAdmin
      ? {}
      : {
          OR: [
            { userId: req.user.id },
            { attendeeEmail: req.user.email },
          ],
        };

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      include: bookingInclude,
    });

    if (isAdmin) {
      const guestEmails = [...new Set(bookings
        .filter((b) => !b.user && b.attendeeEmail)
        .map((b) => b.attendeeEmail)
      )];

      const guestPhones = [...new Set(bookings
        .filter((b) => !b.user && b.attendeePhone)
        .map((b) => safeNormalizeWhatsappPhone(b.attendeePhone))
        .filter(Boolean)
      )];

      if (guestEmails.length > 0 || guestPhones.length > 0) {
        const users = await prisma.user.findMany({
          where: {
            OR: [
              ...(guestEmails.length > 0 ? [{ email: { in: guestEmails } }] : []),
              ...(guestPhones.length > 0 ? [{ whatsappPhone: { in: guestPhones } }] : [])
            ]
          },
          select: { id: true, name: true, email: true, whatsappPhone: true, dateOfBirth: true },
        });

        const usersByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
        const usersByPhone = new Map(users
          .filter(u => u.whatsappPhone)
          .map((u) => [safeNormalizeWhatsappPhone(u.whatsappPhone), u])
          .filter(([phone]) => Boolean(phone))
        );

        for (const booking of bookings) {
          if (!booking.user) {
            let matchedUser = null;
            if (booking.attendeeEmail) matchedUser = usersByEmail.get(booking.attendeeEmail.toLowerCase());
            if (!matchedUser && booking.attendeePhone) {
              matchedUser = usersByPhone.get(safeNormalizeWhatsappPhone(booking.attendeePhone));
            }
            
            if (matchedUser) {
              booking.user = matchedUser;
            }
          }
        }
      }
    }

    await attachNotificationStatus(bookings);
    res.json(bookings);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos.' });
  }
};

export const getPublicAgenda = async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 90);
    const now = new Date();
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const selectedService = req.query.serviceId ? findServiceById(req.query.serviceId) : null;
    const slotDurationMinutes = selectedService?.durationMin || 30;

    const bookings = await prisma.booking.findMany({
      where: {
        scheduledAt: {
          gte: now,
          lte: until,
        },
        status: {
          notIn: ['cancelled', 'no_show'],
        },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        service: true,
        scheduledAt: true,
        endTime: true,
        status: true,
      },
    });

    const activePaymentHolds = await prisma.bookingPayment.findMany({
      where: {
        booking: null,
        status: {
          in: ['pending', 'approved'],
        },
        scheduledAt: {
          gte: now,
          lte: until,
        },
        holdExpiresAt: {
          gt: now,
        },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        serviceName: true,
        scheduledAt: true,
        endTime: true,
        status: true,
      },
    });

    const scheduleBlocks = await prisma.scheduleBlock.findMany({
      where: {
        start: {
          lt: until,
        },
        end: {
          gt: now,
        },
      },
      orderBy: { start: 'asc' },
      select: {
        id: true,
        start: true,
        end: true,
        allDay: true,
        reason: true,
      },
    });

    const occupiedTimes = [
      ...bookings,
      ...activePaymentHolds.map((payment) => ({
        id: payment.id,
        service: payment.serviceName,
        scheduledAt: payment.scheduledAt,
        endTime: payment.endTime,
        status: 'payment_hold',
      })),
      ...scheduleBlocks.map((block) => ({
        id: block.id,
        service: block.reason || 'Bloqueio de agenda',
        scheduledAt: block.start,
        endTime: block.end,
        status: 'schedule_block',
      })),
    ];

    res.json({
      generatedAt: now.toISOString(),
      days,
      serviceId: selectedService?.id || null,
      slotDurationMinutes,
      agendaDays: buildPublicAgendaDays(occupiedTimes, days, now, slotDurationMinutes),
      bookings: bookings.map((booking) => ({
        id: booking.id,
        service: booking.service,
        scheduledAt: booking.scheduledAt,
        endTime: booking.endTime,
        status: booking.status,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar agenda publica:', error);
    res.status(500).json({ error: 'Erro ao buscar agenda.' });
  }
};

export const updateClientWhatsapp = async (req, res) => {
  try {
    const normalizedWhatsapp = normalizeWhatsappPhone(req.body.whatsappPhone);
    const userId = String(req.body.userId || '').trim();
    const bookingIds = Array.isArray(req.body.bookingIds)
      ? req.body.bookingIds.map((id) => String(id || '').trim()).filter(Boolean)
      : [];

    if (!normalizedWhatsapp) {
      return res.status(400).json({ error: 'Informe um WhatsApp valido com DDD.' });
    }

    if (!userId && bookingIds.length === 0) {
      return res.status(400).json({ error: 'Cliente sem cadastro ou agendamentos para atualizar.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updates = {};

      if (userId) {
        updates.user = await tx.user.update({
          where: { id: userId },
          data: {
            whatsappPhone: normalizedWhatsapp,
            whatsappOptIn: true,
            whatsappUpdatedAt: new Date(),
          },
          select: { id: true, name: true, email: true, whatsappPhone: true },
        });
      }

      if (bookingIds.length > 0) {
        updates.bookings = await tx.booking.updateMany({
          where: { id: { in: bookingIds } },
          data: { attendeePhone: normalizedWhatsapp },
        });
      }

      return updates;
    });

    res.json({
      message: 'WhatsApp atualizado com sucesso.',
      user: result.user || null,
      updatedBookings: result.bookings?.count || 0,
    });
  } catch (error) {
    console.error('Erro ao atualizar WhatsApp do cliente:', error);
    if (error.message?.includes('WhatsApp')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cliente nao encontrado.' });
    }
    res.status(500).json({ error: 'Erro interno ao atualizar WhatsApp do cliente.' });
  }
};

const hasScheduleConflict = async (start, end) => {
  const blocked = await prisma.scheduleBlock.findFirst({
    where: {
      start: {
        lt: end,
      },
      end: {
        gt: start,
      },
    },
    select: { id: true },
  });

  if (blocked) return true;

  const conflicting = await prisma.booking.findFirst({
    where: {
      status: {
        notIn: ['cancelled', 'no_show'],
      },
      scheduledAt: {
        lt: end,
      },
      OR: [
        {
          endTime: {
            gt: start,
          },
        },
        {
          endTime: null,
          scheduledAt: {
            gte: start,
          },
        },
      ],
    },
    select: { id: true },
  });

  return Boolean(conflicting);
};

export const createPaidBooking = async (req, res) => {
  try {
    const { paymentId, start } = req.body;

    if (!paymentId || !start) {
      return res.status(400).json({ error: 'Pagamento e horario sao obrigatorios.' });
    }

    const payment = await prisma.bookingPayment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment || payment.userId !== req.user.id) {
      return res.status(404).json({ error: 'Pagamento nao encontrado.' });
    }

    if (payment.booking) {
      return res.status(409).json({ error: 'Este pagamento ja possui agendamento.' });
    }

    if (payment.status !== 'approved' || payment.amount < payment.minimumAmount) {
      return res.status(409).json({ error: 'Pagamento ainda nao aprovado para agendamento.' });
    }

    const service = findServiceById(payment.serviceId);
    if (!service) {
      return res.status(400).json({ error: 'Servico do pagamento nao encontrado.' });
    }

    const scheduledAt = new Date(start);
    if (Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ error: 'Horario invalido.' });
    }

    const endTime = new Date(scheduledAt.getTime() + (service.durationMin || 60) * 60 * 1000);
    const scheduleValidation = validateBookingWindow(scheduledAt, endTime);

    if (!scheduleValidation.valid) {
      return res.status(400).json({ error: scheduleValidation.reason });
    }

    if (await hasScheduleConflict(scheduledAt, endTime)) {
      return res.status(409).json({ error: 'Este horario esta indisponivel ou ja possui outro agendamento.' });
    }

    if (await hasScheduleConflict(scheduledAt, endTime)) {
      return res.status(409).json({ error: 'Este horario acabou de ficar indisponivel. Escolha outro horario.' });
    }

    const servicePrice = Number.isFinite(Number(payment.servicePrice)) ? Number(payment.servicePrice) : service.price;
    const originalServicePrice = Number(payment.metadata?.originalServicePrice || service.price);
    const promotion = payment.metadata?.promotion || null;
    const notes = [
      `Servico: ${service.name}`,
      promotion ? `Promocao: ${promotion.title}` : null,
      promotion && originalServicePrice !== servicePrice ? `Valor normal: R$ ${originalServicePrice.toFixed(2)}` : null,
      `Valor: R$ ${servicePrice.toFixed(2)}`,
      `Pagamento: ${payment.paymentType === 'full' ? 'valor total' : 'entrada'}`,
      req.user.whatsappPhone ? `WhatsApp: ${req.user.whatsappPhone}` : null,
      '(Agendamento criado pelo site apos pagamento)',
    ].filter(Boolean).join('\n');

    let calBooking;
    let calConfirmation = null;
    let calConfirmationError = null;
    try {
      calBooking = await createCalBooking({
        eventTypeSlug: service.calSlug || 'servicos-gerais',
        start: scheduledAt.toISOString(),
        attendeeName: req.user.name,
        attendeeEmail: req.user.email,
        attendeePhone: req.user.whatsappPhone,
        notes,
        adminCreated: false,
        metadata: {
          bookingPaymentId: payment.id,
          serviceId: service.id,
          serviceName: service.name,
          serviceNames: service.name,
          estimatedValue: servicePrice.toFixed(2),
          promotionId: promotion?.id || '',
          promotionItemId: promotion?.itemId || '',
          attendeeWhatsapp: req.user.whatsappPhone || '',
          paymentType: payment.paymentType,
          paidAmount: payment.amount.toFixed(2),
        },
      });
      try {
        const calConfirmedBooking = await confirmCalBooking(calBooking.uid);
        calConfirmation = {
          confirmedAt: new Date().toISOString(),
          confirmedBy: req.user.id,
          status: calConfirmedBooking?.status || 'accepted',
          alreadyConfirmed: Boolean(calConfirmedBooking?.alreadyConfirmed),
          automatic: true,
        };
      } catch (calConfirmError) {
        calConfirmationError = calConfirmError.message || 'Erro desconhecido ao confirmar no Cal.com.';
        console.error('Erro ao confirmar automaticamente booking pago no Cal.com:', calConfirmError);
      }
    } catch (calError) {
      console.error('Erro ao criar booking pago no Cal.com:', calError);
      return res.status(502).json({ error: calError.message || 'Nao foi possivel reservar no calendario.' });
    }

    const booking = await prisma.booking.upsert({
      where: { calEventId: calBooking.uid },
      update: {
        userId: req.user.id,
        service: service.name,
        estimatedValue: servicePrice,
        scheduledAt,
        endTime,
        status: 'confirmed',
        notes,
        attendeeName: req.user.name,
        attendeeEmail: req.user.email,
        attendeePhone: req.user.whatsappPhone || null,
        location: 'Presencial',
        calPayload: { siteCreated: true, calBooking, calConfirmation, calConfirmationError },
        paymentId: payment.id,
      },
      create: {
        calEventId: calBooking.uid,
        userId: req.user.id,
        service: service.name,
        estimatedValue: servicePrice,
        scheduledAt,
        endTime,
        status: 'confirmed',
        notes,
        attendeeName: req.user.name,
        attendeeEmail: req.user.email,
        attendeePhone: req.user.whatsappPhone || null,
        location: 'Presencial',
        calPayload: { siteCreated: true, calBooking, calConfirmation, calConfirmationError },
        paymentId: payment.id,
      },
      include: bookingInclude,
    });

    try {
      await notifyBookingCreated(prisma, booking);
    } catch (notifyError) {
      console.error('Erro ao enviar WhatsApp do agendamento pago:', notifyError);
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error('Erro ao criar agendamento pago:', error);
    res.status(500).json({ error: error.message || 'Erro ao confirmar agendamento.' });
  }
};

/**
 * GET /api/bookings/:id
 * Detalhes de um booking específico.
 * Admin: pode ver qualquer booking.
 * Client: só vê se for dele.
 */
export const getBookingById = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: bookingInclude,
    });

    if (!booking) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    // Se não é admin, só pode ver os próprios bookings
    if (!canAccessBooking(req, booking)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    await attachNotificationStatus(booking);
    res.json(booking);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamento.' });
  }
};

const canAccessBooking = (req, booking) => {
  if (req.user.role === 'ADMIN') return true;
  return booking.userId === req.user.id || booking.attendeeEmail === req.user.email;
};

export const syncBookingToCal = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    const updated = await syncBookingToCalById(req.params.id);
    res.json(updated);
  } catch (error) {
    console.error('Erro ao sincronizar agendamento com Cal.com:', error);
    res.status(error.statusCode || 502).json({ error: error.message || 'Erro ao sincronizar com Cal.com.' });
  }
};

const cancelOnCal = async (booking) => {
  const apiKey = process.env.CAL_API_KEY;
  if (!apiKey || !booking.calEventId) return { skipped: true };

  const response = await fetch(`https://api.cal.com/v2/bookings/${booking.calEventId}/cancel`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'cal-api-version': process.env.CAL_API_VERSION || '2026-02-25',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      cancellationReason: 'Cancelado pelo cliente no site.',
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || 'Falha ao cancelar no Cal.com.');
  }

  return { skipped: false };
};

/**
 * POST /api/bookings/:id/cancel
 * Cliente: cancela apenas os prÃ³prios agendamentos futuros.
 * Admin: pode cancelar qualquer agendamento futuro.
 */
export const cancelBooking = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Agendamento nao encontrado.' });
    }

    if (!canAccessBooking(req, booking)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(409).json({ error: 'Este agendamento ja esta cancelado.' });
    }

    if (booking.scheduledAt < new Date()) {
      return res.status(400).json({ error: 'Nao e possivel cancelar um agendamento que ja passou.' });
    }

    try {
      await cancelOnCal(booking);
    } catch (error) {
      console.error('Erro ao cancelar no Cal.com:', error);
      return res.status(502).json({ error: 'Nao foi possivel cancelar no calendário. Tente novamente.' });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'cancelled',
        notes: [booking.notes, 'Cancelado pelo cliente no site.'].filter(Boolean).join('\n'),
      },
      include: bookingInclude,
    });

    res.json(updated);
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    res.status(500).json({ error: 'Erro ao cancelar agendamento.' });
  }
};

export const completeBookingService = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });

    if (!booking) {
      return res.status(404).json({ error: 'Agendamento nao encontrado.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(409).json({ error: 'Agendamento cancelado nao pode liberar fidelidade.' });
    }

    if (booking.status === 'no_show') {
      return res.status(409).json({ error: 'Agendamento marcado como falta nao pode liberar fidelidade.' });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: booking.status === 'rescheduled' ? 'rescheduled' : 'confirmed',
        serviceCompletedAt: new Date(),
        serviceCompletedBy: req.user.id,
      },
      include: bookingInclude,
    });

    res.json(updated);
  } catch (error) {
    console.error('Erro ao confirmar servico realizado:', error);
    res.status(500).json({ error: 'Erro ao confirmar servico realizado.' });
  }
};

export const markBookingNoShow = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });

    if (!booking) {
      return res.status(404).json({ error: 'Agendamento nao encontrado.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(409).json({ error: 'Agendamento cancelado nao pode ser marcado como falta.' });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'no_show',
        serviceCompletedAt: null,
        serviceCompletedBy: null,
        notes: [booking.notes, 'Faltou ao agendamento.'].filter(Boolean).join('\n'),
      },
      include: bookingInclude,
    });

    res.json(updated);
  } catch (error) {
    console.error('Erro ao marcar falta no agendamento:', error);
    res.status(500).json({ error: 'Erro ao marcar falta no agendamento.' });
  }
};

export const undoBookingServiceCompletion = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        serviceCompletedAt: null,
        serviceCompletedBy: null,
      },
      include: bookingInclude,
    });

    res.json(updated);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Agendamento nao encontrado.' });
    }
    console.error('Erro ao desfazer confirmacao do servico:', error);
    res.status(500).json({ error: 'Erro ao desfazer confirmacao do servico.' });
  }
};

export const markRemainingPaymentPaid = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { payment: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Agendamento nao encontrado.' });
    }

    const paidAt = new Date();

    if (booking.paymentId && booking.payment) {
      await prisma.bookingPayment.update({
        where: { id: booking.paymentId },
        data: {
          remainingPaidAt: paidAt,
          remainingPaidBy: req.user.id,
        },
      });
    } else {
      const total = Number(booking.estimatedValue);

      if (!Number.isFinite(total) || total <= 0) {
        return res.status(400).json({ error: 'Este agendamento nao possui valor a receber.' });
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          remainingPaidAt: paidAt,
          remainingPaidBy: req.user.id,
        },
      });
    }

    const updated = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: bookingInclude,
    });

    res.json(updated);
  } catch (error) {
    console.error('Erro ao dar baixa no restante:', error);
    res.status(500).json({ error: 'Erro ao dar baixa no restante.' });
  }
};

export const resendBookingWhatsapp = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: bookingInclude,
    });

    if (!booking) {
      return res.status(404).json({ error: 'Agendamento nao encontrado.' });
    }

    if (['cancelled', 'no_show'].includes(booking.status)) {
      return res.status(409).json({ error: 'Nao e possivel reenviar WhatsApp de agendamento cancelado ou marcado como falta.' });
    }

    const result = req.query.force === 'true'
      ? await resendBookingClientNotification(prisma, booking).then(() => ({
          sent: true,
          message: 'WhatsApp reenviado para a cliente.',
        }))
      : await ensureBookingClientNotification(prisma, booking);

    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: bookingInclude,
    });

    await attachNotificationStatus(updatedBooking);

    res.json({
      message: result.message || 'Verificacao de WhatsApp concluida.',
      sent: Boolean(result.sent),
      notificationStatus: result.status || null,
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('Erro ao reenviar WhatsApp do agendamento:', error);
    res.status(500).json({ error: error.message || 'Erro ao reenviar WhatsApp.' });
  }
};

/**
 * POST /api/bookings/admin-create
 * Admin only: creates a booking manually.
 * Creates on Cal.com + saves to DB + sends WhatsApp notification.
 */
export const createAdminBooking = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    const { attendeeName, attendeePhone, serviceId, date, time, notes, amountPaid, paymentId: existingPaymentId } = req.body;
    const attendeeEmail = String(req.body.attendeeEmail || '').trim().toLowerCase();

    if (!attendeeName?.trim() || !attendeePhone?.trim() || !serviceId || !date || !time) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatorios (nome, whatsapp, servico, data, horario).' });
    }

    let normalizedAttendeePhone = null;
    try {
      normalizedAttendeePhone = normalizeWhatsappPhone(attendeePhone);
    } catch (phoneError) {
      return res.status(400).json({ error: phoneError.message });
    }

    const service = findServiceById(serviceId);
    if (!service) {
      return res.status(400).json({ error: 'Servico nao encontrado no catalogo.' });
    }

    let existingPayment = null;
    if (existingPaymentId) {
      existingPayment = await prisma.bookingPayment.findUnique({
        where: { id: existingPaymentId },
        include: { booking: true },
      });

      if (!existingPayment) {
        return res.status(404).json({ error: 'Pagamento aprovado nao encontrado.' });
      }

      if (existingPayment.booking) {
        return res.status(409).json({ error: 'Este pagamento ja possui agendamento.' });
      }

      if (existingPayment.status !== 'approved' || existingPayment.amount < existingPayment.minimumAmount) {
        return res.status(409).json({ error: 'Este pagamento ainda nao esta aprovado para agendamento.' });
      }

      if (existingPayment.serviceId !== service.id) {
        return res.status(409).json({ error: 'O servico escolhido precisa ser o mesmo do pagamento aprovado.' });
      }
    }

    // ── Convert Fortaleza local time to UTC ────────────────────────
    const FORTALEZA_UTC_OFFSET_HOURS = 3;
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const scheduledAt = new Date(
      Date.UTC(year, month - 1, day, hour + FORTALEZA_UTC_OFFSET_HOURS, minute, 0, 0),
    );

    const durationMs = (service.durationMin || 60) * 60 * 1000;
    const endTime = new Date(scheduledAt.getTime() + durationMs);
    const scheduleValidation = validateBookingWindow(scheduledAt, endTime);

    if (!scheduleValidation.valid) {
      return res.status(400).json({ error: scheduleValidation.reason });
    }

    // ── Build notes for Cal.com (shows on calendar) ───────────────
    const calNotes = [
      `Servico: ${service.name}`,
      `Valor: R$ ${service.price.toFixed(2)}`,
      `WhatsApp: ${normalizedAttendeePhone}`,
      notes ? `Obs: ${notes}` : null,
      '(Agendamento manual pela admin)',
    ].filter(Boolean).join('\n');

    // ── Create on Cal.com ─────────────────────────────────────────
    let calBooking;
    try {
      calBooking = await createCalBooking({
        eventTypeSlug: service.calSlug || 'servicos-gerais',
        start: scheduledAt.toISOString(),
        attendeeName,
        attendeeEmail,
        attendeePhone: normalizedAttendeePhone,
        notes: calNotes,
        metadata: {
          serviceId: service.id,
          serviceName: service.name,
          estimatedValue: service.price.toFixed(2),
          attendeeWhatsapp: normalizedAttendeePhone,
          createdBy: req.user.id,
        },
      });
    } catch (calError) {
      console.error('Erro ao criar booking no Cal.com:', calError);
      return res.status(502).json({
        error: `Nao foi possivel criar o agendamento no Cal.com: ${calError.message}`,
      });
    }

    // ── Try to link to existing user ──────────────────────────────
    let userId = existingPayment?.userId || null;
    if (attendeeEmail) {
      const user = await prisma.user.findUnique({ where: { email: attendeeEmail } });
      if (user) userId = user.id;
    }
    if (!userId && normalizedAttendeePhone) {
      const user = await prisma.user.findFirst({ where: { whatsappPhone: normalizedAttendeePhone } });
      if (user) userId = user.id;
    }

    // ── Create BookingPayment if sinal was paid ───────────────────
    let paymentId = existingPayment?.id || null;
    const sinalAmount = Number.parseFloat(String(amountPaid || '0').replace(',', '.'));
    if (!existingPayment && Number.isFinite(sinalAmount) && sinalAmount > 0) {
      const payment = await prisma.bookingPayment.create({
        data: {
          userId: userId || req.user.id,
          serviceId: service.id,
          serviceName: service.name,
          servicePrice: service.price,
          paymentType: 'admin_manual',
          amount: sinalAmount,
          minimumAmount: 0,
          status: 'approved',
          externalReference: `admin-${randomUUID()}`,
          approvedAt: new Date(),
        },
      });
      paymentId = payment.id;
    }

    // ── Save booking to database ──────────────────────────────────
    const bookingData = {
      userId,
      service: service.name,
      estimatedValue: service.price,
      scheduledAt,
      endTime,
      status: 'confirmed',
      notes: notes || null,
      attendeeName: attendeeName.trim(),
      attendeeEmail: attendeeEmail?.trim() || null,
      attendeePhone: normalizedAttendeePhone,
      location: 'Presencial',
      calPayload: { adminCreated: true, createdBy: req.user.id, calBooking },
      paymentId,
    };

    let booking = await prisma.booking.upsert({
      where: { calEventId: calBooking.uid },
      update: bookingData,
      create: {
        calEventId: calBooking.uid,
        ...bookingData,
      },
      include: bookingInclude,
    });

    try {
      const calConfirmedBooking = await confirmCalBooking(booking.calEventId);
      booking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          calPayload: {
            ...(booking.calPayload || {}),
            calConfirmation: {
              confirmedAt: new Date().toISOString(),
              confirmedBy: req.user.id,
              status: calConfirmedBooking?.status || 'accepted',
              alreadyConfirmed: Boolean(calConfirmedBooking?.alreadyConfirmed),
            },
          },
        },
        include: bookingInclude,
      });
    } catch (calConfirmError) {
      console.error('Erro ao confirmar automaticamente agendamento admin no Cal.com:', calConfirmError);
    }

    console.log(`✅ Admin booking criado: ${booking.id} (Cal UID: ${calBooking.uid}) para ${attendeeName}`);

    if (existingPayment) {
      await prisma.bookingPayment.update({
        where: { id: existingPayment.id },
        data: {
          metadata: {
            ...(existingPayment.metadata || {}),
            adminResolution: {
              status: 'resolved',
              type: 'booking_created',
              bookingId: booking.id,
              resolvedAt: new Date().toISOString(),
              resolvedBy: req.user.id,
            },
          },
        },
      });
    }

    // ── Send WhatsApp notifications ───────────────────────────────
    try {
      await notifyBookingCreated(prisma, booking);
    } catch (whatsappError) {
      console.error('Erro ao enviar WhatsApp (admin booking):', whatsappError);
      // Don't fail the request — booking is already created
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error('Erro ao criar agendamento manual:', error);
    res.status(500).json({ error: error.message || 'Erro interno ao criar agendamento.' });
  }
};

/**
 * DELETE /api/bookings/clients/:email
 * Admin only: exclui um cliente e todos os dados relacionados.
 */
export const deleteClient = async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: 'Email do cliente é obrigatório.' });
    }

    // 1. Buscar o User (pode não existir se o booking foi feito como visitante)
    const user = await prisma.user.findUnique({ where: { email } });
    const userId = user?.id;

    // 2. Buscar todos os bookings do cliente
    const orConditions = [{ attendeeEmail: email }];
    if (userId) orConditions.push({ userId });

    const bookings = await prisma.booking.findMany({
      where: { OR: orConditions },
      select: { id: true, paymentId: true },
    });

    if (!user && bookings.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const bookingIds = bookings.map((b) => b.id);

    // 3. Deletar tudo em transação
    const result = await prisma.$transaction(async (tx) => {
      // NotificationLogs dos bookings
      const deletedNotifications = bookingIds.length
        ? await tx.notificationLog.deleteMany({ where: { bookingId: { in: bookingIds } } })
        : { count: 0 };

      // BirthdayRewards do user
      const deletedRewards = userId
        ? await tx.birthdayReward.deleteMany({ where: { userId } })
        : { count: 0 };

      // Desassociar payments dos bookings (para evitar FK constraint)
      if (bookingIds.length) {
        await tx.booking.updateMany({
          where: { id: { in: bookingIds } },
          data: { paymentId: null },
        });
      }

      // BookingPayments do user
      const deletedPayments = userId
        ? await tx.bookingPayment.deleteMany({ where: { userId } })
        : { count: 0 };

      // Bookings
      const deletedBookings = bookingIds.length
        ? await tx.booking.deleteMany({ where: { id: { in: bookingIds } } })
        : { count: 0 };

      // FinanceExpenses criadas pelo user
      const deletedExpenses = userId
        ? await tx.financeExpense.deleteMany({ where: { createdById: userId } })
        : { count: 0 };

      // O próprio User
      const deletedUser = userId
        ? await tx.user.delete({ where: { id: userId } }).then(() => 1)
        : 0;

      return {
        user: deletedUser,
        bookings: deletedBookings.count,
        payments: deletedPayments.count,
        notifications: deletedNotifications.count,
        rewards: deletedRewards.count,
        expenses: deletedExpenses.count,
      };
    });

    console.log(`🗑️ Cliente excluído: ${email}`, result);
    res.json({ message: `Cliente "${user?.name || email}" excluído com sucesso.`, ...result });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({ error: 'Erro interno ao excluir cliente.' });
  }
};
