import prisma from '../config/prisma.js';
import { notifyBookingCreated } from '../services/whatsappService.js';

const cancelUnauthorizedCalBooking = async (calEventId) => {
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
      cancellationReason: 'Agendamento cancelado automaticamente: pagamento minimo nao aprovado.',
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error('Erro ao cancelar booking sem pagamento aprovado no Cal.com:', details);
  }
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
