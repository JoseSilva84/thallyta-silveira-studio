import prisma from '../config/prisma.js';
import { notifyBookingCreated } from '../services/whatsappService.js';
import { validateBookingWindow } from '../utils/bookingHours.js';
import { findScheduleBlockConflict } from '../utils/scheduleAvailability.js';

const getWahaAckStatus = (payload = {}) => {
  const ack = Number.isInteger(payload.ack) ? payload.ack : null;
  const ackName = payload.ackName ? String(payload.ackName).toUpperCase() : null;

  if (ackName === 'ERROR' || ack === -1) return 'failed';
  if (ackName === 'READ' || ackName === 'PLAYED' || ack >= 3) return 'read';
  if (ackName === 'DEVICE' || ack === 2) return 'delivered';
  if (ackName === 'SERVER' || ack === 1) return 'sent';
  return 'accepted';
};

const minutesToMs = (minutes) => minutes * 60 * 1000;

const getWahaAckFailureNextRetryAt = () => {
  const minutes = Number.parseInt(process.env.WHATSAPP_FAILED_ACK_RETRY_DELAY_MINUTES || '5', 10);
  const delayMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 5;
  return new Date(Date.now() + minutesToMs(delayMinutes));
};

export const handleWahaWebhook = async (req, res) => {
  try {
    const { event, payload, session } = req.body || {};

    if (event !== 'message.ack') {
      return res.status(200).json({ received: true, ignored: true });
    }

    const providerMessageId = payload?.id;
    if (!providerMessageId) {
      return res.status(200).json({ received: true, ignored: true, reason: 'message id ausente' });
    }

    const status = getWahaAckStatus(payload);
    const ackName = payload.ackName ? String(payload.ackName).toUpperCase() : null;
    const error = status === 'failed'
      ? `WAHA confirmou falha no envio (${ackName || payload.ack})`
      : null;

    const updated = await prisma.notificationLog.updateMany({
      where: { providerMessageId },
      data: {
        status,
        error,
        providerAck: Number.isInteger(payload.ack) ? payload.ack : null,
        providerAckName: ackName,
        resolvedTarget: payload.from || payload.to || undefined,
        retryCount: status === 'failed' ? { increment: 1 } : 0,
        nextRetryAt: status === 'failed' ? getWahaAckFailureNextRetryAt() : null,
        createdAt: new Date(),
      },
    });

    if (updated.count > 0) {
      console.log(`WAHA ack ${ackName || payload.ack} recebido para ${providerMessageId} (${session || 'sessao desconhecida'})`);
    } else {
      console.log(`WAHA ack recebido para mensagem sem NotificationLog: ${providerMessageId}`);
    }

    res.status(200).json({ received: true, updated: updated.count });
  } catch (error) {
    console.error('Erro ao processar webhook WAHA:', error);
    res.status(200).json({ received: true, error: error.message });
  }
};

const cancelUnauthorizedCalBooking = async (calEventId, reason = 'Agendamento cancelado automaticamente: pagamento minimo nao aprovado.') => {
  const apiKey = process.env.CAL_API_KEY;
  if (!apiKey || !calEventId) return;

  const response = await fetch(`https://api.cal.com/v2/bookings/${calEventId}/cancel`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'cal-api-version': process.env.CAL_API_VERSION || '2026-02-25',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      cancellationReason: reason,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error('Erro ao cancelar booking sem pagamento aprovado no Cal.com:', details);
  }
};

const isTruthyMetadata = (value) => value === true || value === 'true' || value === 1 || value === '1';

const extractBookingDataFromPayload = (payload, uid, paymentId = null) => {
  const metadata = payload.metadata || {};
  const attendee = payload.attendees?.[0] || {};
  const attendeeName = attendee.name || payload.responses?.name?.value || metadata.attendeeName || null;
  const attendeeEmail = attendee.email || payload.responses?.email?.value || metadata.attendeeEmail || null;
  const attendeePhone = attendee.phone || payload.responses?.phone?.value || metadata.attendeeWhatsapp || null;
  const estimatedValue = Number.parseFloat(String(metadata.estimatedValue || '').replace(',', '.'));
  const services = metadata.serviceName
    || metadata.serviceNames
    || metadata.services
    || payload.responses?.notes?.value
    || payload.description
    || 'Servico nao especificado';

  return {
    calEventId: uid,
    service: typeof services === 'string' ? services : JSON.stringify(services),
    estimatedValue: Number.isFinite(estimatedValue) ? estimatedValue : null,
    scheduledAt: new Date(payload.startTime || payload.start),
    endTime: payload.endTime || payload.end ? new Date(payload.endTime || payload.end) : null,
    status: 'confirmed',
    notes: payload.responses?.notes?.value || payload.additionalNotes || metadata.notes || null,
    attendeeName,
    attendeeEmail,
    attendeePhone,
    location: payload.location || payload.meetingUrl || 'Presencial',
    calPayload: payload,
    paymentId,
  };
};

const findUserIdByEmail = async (email) => {
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  return user?.id || null;
};

const validatePayloadSchedule = (payload) => {
  const start = payload.startTime || payload.start;
  const end = payload.endTime || payload.end;
  return validateBookingWindow(start, end);
};

const findPayloadScheduleBlock = (payload) => {
  const start = new Date(payload.startTime || payload.start);
  const end = new Date(payload.endTime || payload.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return findScheduleBlockConflict(prisma, start, end);
};

/**
 * Webhook handler para eventos do Cal.com.
 * Recebe BOOKING_CREATED, BOOKING_RESCHEDULED e BOOKING_CANCELLED.
 * Sem verificação HMAC — o Cal.com é confiável como fonte.
 */
export const handleCalWebhook = async (req, res) => {
  try {
    const { triggerEvent, payload } = req.body;

    console.log(`📩 Webhook Cal.com recebido: ${triggerEvent}`);

    if (!payload) {
      return res.status(400).json({ error: 'Payload ausente.' });
    }

    switch (triggerEvent) {
      case 'BOOKING_CREATED':
        await handleBookingCreated(payload);
        break;

      case 'BOOKING_RESCHEDULED':
        await handleBookingRescheduled(payload);
        break;

      case 'BOOKING_CANCELLED':
        await handleBookingCancelled(payload);
        break;

      default:
        console.log(`⚠️ Evento não tratado: ${triggerEvent}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Erro ao processar webhook Cal.com:', error);
    // Sempre retorna 200 para o Cal.com não reenviar infinitamente
    res.status(200).json({ received: true, error: error.message });
  }
};

/**
 * Cria um novo booking no PostgreSQL quando um agendamento é feito no Cal.com.
 */
async function handleBookingCreated(payload) {
  const uid = payload.uid || payload.bookingId?.toString() || payload.id?.toString();
  if (!uid) {
    console.error('❌ UID do booking não encontrado no payload.');
    return;
  }

  // Verifica se já existe (idempotência)
  const existing = await prisma.booking.findUnique({ where: { calEventId: uid } });
  if (existing) {
    console.log(`ℹ️ Booking ${uid} já existe. Ignorando duplicata.`);
    return;
  }

  const scheduleValidation = validatePayloadSchedule(payload);
  if (!scheduleValidation.valid) {
    console.error('Booking recebido fora do horario permitido. Cancelando/ignorando.', {
      uid,
      reason: scheduleValidation.reason,
    });
    await cancelUnauthorizedCalBooking(uid, `Agendamento cancelado automaticamente: ${scheduleValidation.reason}`);
    return;
  }

  const scheduleBlock = await findPayloadScheduleBlock(payload);
  if (scheduleBlock) {
    console.error('Booking recebido em horario bloqueado. Cancelando/ignorando.', {
      uid,
      scheduleBlockId: scheduleBlock.id,
    });
    await cancelUnauthorizedCalBooking(uid, 'Agendamento cancelado automaticamente: horario bloqueado na agenda do studio.');
    return;
  }

  if (isTruthyMetadata(payload.metadata?.adminCreated)) {
    const bookingData = extractBookingDataFromPayload(payload, uid);
    const userId = await findUserIdByEmail(bookingData.attendeeEmail);

    const booking = await prisma.booking.create({
      data: {
        ...bookingData,
        userId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, whatsappPhone: true },
        },
        payment: true,
      },
    });

    console.log(`Booking admin criado via webhook: ${booking.id} (Cal UID: ${uid}) para ${booking.attendeeName || booking.attendeeEmail || 'visitante'}`);

    try {
      await notifyBookingCreated(prisma, booking);
    } catch (error) {
      console.error('Erro ao enviar WhatsApp do agendamento admin:', error);
    }

    return;
  }

  const bookingPaymentId = payload.metadata?.bookingPaymentId;
  let bookingPayment = null;

  if (bookingPaymentId) {
    bookingPayment = await prisma.bookingPayment.findUnique({ where: { id: bookingPaymentId } });
  }

  if (!bookingPayment || bookingPayment.status !== 'approved' || bookingPayment.amount < bookingPayment.minimumAmount) {
    console.error('Booking recebido sem pagamento minimo aprovado. Cancelando/ignorando.', {
      uid,
      bookingPaymentId,
    });
    await cancelUnauthorizedCalBooking(uid);
    return;
  }

  // Extrai dados dos attendees
  const attendee = payload.attendees?.[0] || {};
  const attendeeName = attendee.name || payload.responses?.name?.value || null;
  const attendeeEmail = attendee.email || payload.responses?.email?.value || null;
  const attendeePhone = attendee.phone || payload.responses?.phone?.value || payload.metadata?.attendeeWhatsapp || null;
  const estimatedValue = Number.parseFloat(String(payload.metadata?.estimatedValue || '').replace(',', '.'));

  // Extrai serviços do metadata ou notes
  const services = payload.metadata?.serviceNames
    || payload.metadata?.services
    || payload.responses?.notes?.value
    || payload.description
    || 'Serviço não especificado';

  // Tenta associar ao User pelo email
  let userId = null;
  if (attendeeEmail) {
    const user = await prisma.user.findUnique({ where: { email: attendeeEmail } });
    if (user) {
      userId = user.id;
    }
  }

  const booking = await prisma.booking.create({
    data: {
      calEventId: uid,
      userId,
      service: typeof services === 'string' ? services : JSON.stringify(services),
      estimatedValue: Number.isFinite(estimatedValue) ? estimatedValue : null,
      scheduledAt: new Date(payload.startTime),
      endTime: payload.endTime ? new Date(payload.endTime) : null,
      status: 'confirmed',
      notes: payload.responses?.notes?.value || payload.additionalNotes || null,
      attendeeName,
      attendeeEmail,
      attendeePhone,
      location: payload.location || payload.meetingUrl || 'Presencial',
      calPayload: payload,
      paymentId: bookingPayment.id,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, whatsappPhone: true },
      },
      payment: true,
    },
  });

  console.log(`✅ Booking criado: ${booking.id} (Cal UID: ${uid}) para ${attendeeName || attendeeEmail || 'visitante'}`);

  try {
    await notifyBookingCreated(prisma, booking);
  } catch (error) {
    console.error('Erro ao enviar WhatsApp do agendamento:', error);
  }
}

/**
 * Atualiza um booking existente quando é reagendado no Cal.com.
 */
async function handleBookingRescheduled(payload) {
  // O Cal.com envia o UID do novo booking e o rescheduleUid do antigo
  const previousUid = payload.rescheduleUid || payload.previousUid;
  const newUid = payload.uid || payload.bookingId?.toString();

  if (!previousUid && !newUid) {
    console.error('❌ UIDs de reagendamento não encontrados.');
    return;
  }

  const scheduleValidation = validatePayloadSchedule(payload);
  if (!scheduleValidation.valid) {
    console.error('Reagendamento recebido fora do horario permitido. Cancelando novo horario.', {
      previousUid,
      newUid,
      reason: scheduleValidation.reason,
    });
    await cancelUnauthorizedCalBooking(newUid, `Reagendamento cancelado automaticamente: ${scheduleValidation.reason}`);
    return;
  }

  const scheduleBlock = await findPayloadScheduleBlock(payload);
  if (scheduleBlock) {
    console.error('Reagendamento recebido em horario bloqueado. Cancelando novo horario.', {
      previousUid,
      newUid,
      scheduleBlockId: scheduleBlock.id,
    });
    await cancelUnauthorizedCalBooking(newUid, 'Reagendamento cancelado automaticamente: horario bloqueado na agenda do studio.');
    return;
  }

  // Tenta encontrar o booking pelo UID antigo ou novo
  const existing = await prisma.booking.findFirst({
    where: {
      OR: [
        { calEventId: previousUid || '' },
        { calEventId: newUid || '' },
      ],
    },
  });

  if (existing) {
    await prisma.booking.update({
      where: { id: existing.id },
      data: {
        calEventId: newUid || existing.calEventId,
        scheduledAt: new Date(payload.startTime),
        endTime: payload.endTime ? new Date(payload.endTime) : null,
        status: 'rescheduled',
        calPayload: payload,
        updatedAt: new Date(),
      },
    });
    console.log(`🔄 Booking reagendado: ${existing.id}`);
  } else {
    // Se não encontrou, cria como novo
    console.log('⚠️ Booking anterior não encontrado. Criando como novo...');
    await handleBookingCreated(payload);
  }
}

/**
 * Marca um booking como cancelado quando cancelado no Cal.com.
 */
async function handleBookingCancelled(payload) {
  const uid = payload.uid || payload.bookingId?.toString() || payload.id?.toString();
  if (!uid) {
    console.error('❌ UID do booking cancelado não encontrado.');
    return;
  }

  const existing = await prisma.booking.findUnique({ where: { calEventId: uid } });

  if (existing) {
    await prisma.booking.update({
      where: { id: existing.id },
      data: {
        status: 'cancelled',
        calPayload: payload,
        updatedAt: new Date(),
      },
    });
    console.log(`❌ Booking cancelado: ${existing.id}`);
  } else {
    console.log(`⚠️ Booking ${uid} não encontrado no banco para cancelamento.`);
  }
}
