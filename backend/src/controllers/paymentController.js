import { randomUUID } from 'crypto';
import prisma from '../config/prisma.js';
import { findServiceById } from '../data/services.js';
import { createCalBooking } from '../services/calService.js';
import { notifyBookingCreated } from '../services/whatsappService.js';
import { validateBookingWindow, validateClientBookingLeadTime } from '../utils/bookingHours.js';
import { findConfirmedScheduleConflict, hasScheduleConflict } from '../utils/scheduleAvailability.js';

const MERCADO_PAGO_API = 'https://api.mercadopago.com';
const PRODUCTION_FRONTEND_URL = 'https://www.thallytasilveira.com.br';
const MINIMUM_PERCENTAGE = 0.3;
const PAYMENT_HOLD_MINUTES = 30;
const BIRTHDAY_REWARD_STATUSES = ['pending', 'sent'];

const getFrontendUrl = () => {
  if (process.env.PUBLIC_FRONTEND_URL) return process.env.PUBLIC_FRONTEND_URL.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return PRODUCTION_FRONTEND_URL;
  return (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)[0]
    .replace(/\/$/, '');
};

const getBackendUrl = () => {
  const configured = process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
  return configured ? configured.replace(/\/$/, '') : null;
};

const getSafeReturnPath = (value) => {
  if (!value || typeof value !== 'string') return '/';
  const normalized = value.trim();
  if (!normalized.startsWith('/')) return '/';
  if (normalized.startsWith('//')) return '/';
  return normalized.split('#')[0].split('?')[0] || '/';
};

const roundMoney = (value) => Math.round(value * 100) / 100;

const getCurrentStudioYear = () => Number(new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Fortaleza',
  year: 'numeric',
}).format(new Date()));

const getCurrentStudioDateParts = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());

  const get = (type) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
  };
};

const isBirthdayToday = (dateOfBirth, today) => {
  if (!dateOfBirth) return false;
  const birthDate = new Date(dateOfBirth);
  return birthDate.getUTCMonth() + 1 === today.month && birthDate.getUTCDate() === today.day;
};

const getAvailableBirthdayReward = async (userId) => {
  if (!userId) return null;
  const today = getCurrentStudioDateParts();

  const reward = await prisma.birthdayReward.findFirst({
    where: {
      userId,
      year: today.year,
      status: { in: BIRTHDAY_REWARD_STATUSES },
    },
    orderBy: { createdAt: 'asc' },
  });
  if (reward) return reward;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, dateOfBirth: true },
  });

  if (!isBirthdayToday(user?.dateOfBirth, today)) return null;

  return prisma.birthdayReward.upsert({
    where: {
      userId_year: {
        userId,
        year: today.year,
      },
    },
    update: {},
    create: {
      userId,
      year: today.year,
      amount: Number.parseFloat(process.env.BIRTHDAY_REWARD_AMOUNT || '0') || 0,
      status: 'pending',
    },
  });
};

const getBirthdayRewardDiscount = (reward, servicePrice) => {
  if (!reward) return 0;
  return roundMoney(Math.min(Number(reward.amount || 0), servicePrice));
};

const redeemBirthdayRewardFromPayment = async (bookingPayment) => {
  const rewardId = bookingPayment?.metadata?.birthdayReward?.id;
  if (!rewardId) return;

  await prisma.birthdayReward.updateMany({
    where: {
      id: rewardId,
      userId: bookingPayment.userId,
      status: { in: BIRTHDAY_REWARD_STATUSES },
    },
    data: {
      status: 'redeemed',
      error: null,
    },
  });
};

const getValidId = (value) => {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!normalized || ['null', 'undefined'].includes(normalized.toLowerCase())) return null;
  return normalized;
};

const getMercadoPagoResourceId = (value) => {
  const normalized = getValidId(value);
  if (!normalized) return null;

  const match = normalized.match(/\/(?:payments|merchant_orders)\/([^/?#]+)/);
  return getValidId(match?.[1] || normalized);
};

const getAccessToken = () => {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    const error = new Error('Mercado Pago nao configurado. Defina MP_ACCESS_TOKEN no backend.');
    error.statusCode = 500;
    throw error;
  }
  return token;
};

const mercadoPagoRequest = async (path, options = {}) => {
  const response = await fetch(`${MERCADO_PAGO_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Erro ao comunicar com Mercado Pago.');
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }
  return data;
};

const findMercadoPagoPaymentByExternalReference = async (externalReference) => {
  if (!externalReference) return null;

  const params = new URLSearchParams({
    external_reference: externalReference,
    sort: 'date_created',
    criteria: 'desc',
  });
  const data = await mercadoPagoRequest(`/v1/payments/search?${params.toString()}`);
  const results = Array.isArray(data?.results) ? data.results : [];

  return results.find((payment) => payment.status === 'approved') || results[0] || null;
};

const findMercadoPagoPaymentByPreference = async (preferenceId) => {
  if (!preferenceId) return null;

  const params = new URLSearchParams({ preference_id: preferenceId });
  const data = await mercadoPagoRequest(`/merchant_orders/search?${params.toString()}`);
  const orders = Array.isArray(data?.elements) ? data.elements : [];
  const payments = orders.flatMap((order) => (Array.isArray(order?.payments) ? order.payments : []));
  const approved = payments.find((payment) => payment.status === 'approved');
  const fallback = approved || payments[0] || null;

  if (!fallback?.id) return null;

  return mercadoPagoRequest(`/v1/payments/${fallback.id}`);
};

const isMercadoPagoPaymentApproved = (payment) => payment?.status === 'approved';

const syncBookingPaymentWithMercadoPago = async (bookingPayment, mercadoPagoPaymentId = null) => {
  if (!bookingPayment) return null;
  if (bookingPayment.status === 'approved' && bookingPayment.amount >= bookingPayment.minimumAmount) {
    return bookingPayment;
  }

  let mercadoPagoPayment = null;

  if (mercadoPagoPaymentId) {
    mercadoPagoPayment = await mercadoPagoRequest(`/v1/payments/${mercadoPagoPaymentId}`);
  } else {
    const byExternalReference = await findMercadoPagoPaymentByExternalReference(bookingPayment.externalReference);
    const byPreference = isMercadoPagoPaymentApproved(byExternalReference)
      ? null
      : await findMercadoPagoPaymentByPreference(bookingPayment.preferenceId);

    mercadoPagoPayment = isMercadoPagoPaymentApproved(byPreference)
      ? byPreference
      : byExternalReference || byPreference;
  }

  if (!mercadoPagoPayment?.id) return bookingPayment;

  return markPaymentFromMercadoPago(bookingPayment, mercadoPagoPayment);
};

const serializePayment = (payment) => ({
  id: payment.id,
  status: payment.status,
  service: {
    id: payment.serviceId,
    name: payment.serviceName,
    price: `R$ ${payment.servicePrice.toFixed(2).replace('.', ',')}`,
  },
  servicePrice: payment.servicePrice,
  paymentType: payment.paymentType,
  amount: payment.amount,
  minimumAmount: payment.minimumAmount,
  scheduledAt: payment.scheduledAt,
  endTime: payment.endTime,
  holdExpiresAt: payment.holdExpiresAt,
  approvedAt: payment.approvedAt,
  birthdayReward: payment.metadata?.birthdayReward || null,
});

const serializeOrphanBookingPayment = (payment) => ({
  id: payment.id,
  status: payment.status,
  serviceId: payment.serviceId,
  serviceName: payment.serviceName,
  servicePrice: payment.servicePrice,
  paymentType: payment.paymentType,
  amount: payment.amount,
  minimumAmount: payment.minimumAmount,
  scheduledAt: payment.scheduledAt,
  endTime: payment.endTime,
  approvedAt: payment.approvedAt,
  mercadoPagoPaymentId: payment.mercadoPagoPaymentId,
  paymentMethodId: payment.metadata?.mercadoPago?.paymentMethodId || null,
  paymentTypeId: payment.metadata?.mercadoPago?.paymentTypeId || null,
  user: payment.user ? {
    id: payment.user.id,
    name: payment.user.name,
    email: payment.user.email,
    whatsappPhone: payment.user.whatsappPhone,
  } : null,
});

const serializeBookingSummary = (booking) => {
  if (!booking) return null;

  return {
    id: booking.id,
    service: booking.service,
    estimatedValue: booking.estimatedValue,
    scheduledAt: booking.scheduledAt,
    endTime: booking.endTime,
    attendeeName: booking.attendeeName,
    attendeeEmail: booking.attendeeEmail,
    attendeePhone: booking.attendeePhone,
    status: booking.status,
    calendarFallback: Boolean(booking.calPayload?.calendarFallback),
    calendarError: booking.calPayload?.calBookingError || null,
  };
};

const getBookingInclude = {
  user: {
    select: { id: true, name: true, email: true, whatsappPhone: true },
  },
  payment: true,
};

const attachScheduleToPayment = async (payment, startInput) => {
  if (!payment || !startInput) return payment;

  const service = findServiceById(payment.serviceId);
  if (!service) return payment;

  const scheduledAt = new Date(startInput);
  if (Number.isNaN(scheduledAt.getTime())) return payment;

  const endTime = new Date(scheduledAt.getTime() + (service.durationMin || 60) * 60 * 1000);
  const currentStart = payment.scheduledAt ? new Date(payment.scheduledAt) : null;
  const currentEnd = payment.endTime ? new Date(payment.endTime) : null;

  if (
    currentStart
    && currentStart.getTime() === scheduledAt.getTime()
    && currentEnd
    && currentEnd.getTime() === endTime.getTime()
  ) {
    return payment;
  }

  const validation = validateBookingWindow(scheduledAt, endTime);

  if (!validation.valid) {
    const error = new Error(validation.reason);
    error.statusCode = 400;
    throw error;
  }

  if (await hasScheduleConflict(prisma, scheduledAt, endTime, { excludePaymentId: payment.id })) {
    const error = new Error('Este horario nao comporta a duracao desse servico porque interfere em outro agendamento. Escolha outro dia ou horario.');
    error.statusCode = 409;
    throw error;
  }

  return prisma.bookingPayment.update({
    where: { id: payment.id },
    data: {
      scheduledAt,
      endTime,
      holdExpiresAt: new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000),
      metadata: {
        ...(payment.metadata || {}),
        recoveredScheduleFromClient: true,
      },
    },
    include: { booking: true, user: true },
  });
};

const buildConfirmedBookingFromPayment = async (payment) => {
  const hydratedPayment = payment.booking
    ? payment
    : await prisma.bookingPayment.findUnique({
        where: { id: payment.id },
        include: { booking: true, user: true },
      });

  if (!hydratedPayment) return null;
  if (hydratedPayment.booking) return hydratedPayment.booking;
  if (hydratedPayment.status !== 'approved' || hydratedPayment.amount < hydratedPayment.minimumAmount) return null;

  const service = findServiceById(hydratedPayment.serviceId);
  if (!service || !hydratedPayment.scheduledAt) return null;

  const scheduledAt = new Date(hydratedPayment.scheduledAt);
  const endTime = hydratedPayment.endTime
    ? new Date(hydratedPayment.endTime)
    : new Date(scheduledAt.getTime() + (service.durationMin || 60) * 60 * 1000);

  const validation = validateBookingWindow(scheduledAt, endTime);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const bookingConflict = await findConfirmedScheduleConflict(prisma, scheduledAt, endTime);
  if (bookingConflict) {
    const error = new Error('Este horario acabou de ficar indisponivel. Escolha outro horario.');
    error.statusCode = 409;
    throw error;
  }

  const notes = [
    `Servico: ${service.name}`,
    `Valor: R$ ${service.price.toFixed(2)}`,
    hydratedPayment.metadata?.birthdayReward?.discount
      ? `Beneficio aniversario: -R$ ${Number(hydratedPayment.metadata.birthdayReward.discount).toFixed(2)}`
      : null,
    `Pagamento: ${hydratedPayment.paymentType === 'full' ? 'valor total' : 'entrada'}`,
    hydratedPayment.user?.whatsappPhone ? `WhatsApp: ${hydratedPayment.user.whatsappPhone}` : null,
    '(Agendamento criado automaticamente pelo site apos pagamento)',
  ].filter(Boolean).join('\n');

  let calBooking = null;
  let calBookingError = null;
  try {
    calBooking = await createCalBooking({
      eventTypeSlug: service.calSlug || 'servicos-gerais',
      start: scheduledAt.toISOString(),
      attendeeName: hydratedPayment.user?.name || 'Cliente',
      attendeeEmail: hydratedPayment.user?.email,
      attendeePhone: hydratedPayment.user?.whatsappPhone,
      notes,
      adminCreated: false,
      metadata: {
        bookingPaymentId: hydratedPayment.id,
        serviceId: service.id,
        serviceName: service.name,
        serviceNames: service.name,
        estimatedValue: service.price.toFixed(2),
        attendeeWhatsapp: hydratedPayment.user?.whatsappPhone || '',
        paymentType: hydratedPayment.paymentType,
        paidAmount: hydratedPayment.amount.toFixed(2),
      },
    });
  } catch (calError) {
    calBookingError = calError.message || 'Erro desconhecido ao criar no Cal.com.';
    console.error('Erro ao criar booking pago no Cal.com; salvando agendamento local:', {
      bookingPaymentId: hydratedPayment.id,
      serviceId: service.id,
      start: scheduledAt.toISOString(),
      error: calBookingError,
    });
  }

  const booking = await prisma.booking.upsert({
    where: { calEventId: calBooking?.uid || `site-payment-${hydratedPayment.id}` },
    update: {
      userId: hydratedPayment.userId,
      service: service.name,
      estimatedValue: service.price,
      scheduledAt,
      endTime,
      status: 'confirmed',
      notes,
      attendeeName: hydratedPayment.user?.name || 'Cliente',
      attendeeEmail: hydratedPayment.user?.email || null,
      attendeePhone: hydratedPayment.user?.whatsappPhone || null,
      location: 'Presencial',
      calPayload: {
        siteCreated: true,
        autoConfirmedAfterPayment: true,
        calBooking,
        calBookingError,
        calendarFallback: !calBooking,
      },
      paymentId: hydratedPayment.id,
    },
    create: {
      calEventId: calBooking?.uid || `site-payment-${hydratedPayment.id}`,
      userId: hydratedPayment.userId,
      service: service.name,
      estimatedValue: service.price,
      scheduledAt,
      endTime,
      status: 'confirmed',
      notes,
      attendeeName: hydratedPayment.user?.name || 'Cliente',
      attendeeEmail: hydratedPayment.user?.email || null,
      attendeePhone: hydratedPayment.user?.whatsappPhone || null,
      location: 'Presencial',
      calPayload: {
        siteCreated: true,
        autoConfirmedAfterPayment: true,
        calBooking,
        calBookingError,
        calendarFallback: !calBooking,
      },
      paymentId: hydratedPayment.id,
    },
    include: getBookingInclude,
  });

  try {
    await notifyBookingCreated(prisma, booking);
  } catch (notifyError) {
    console.error('Erro ao enviar WhatsApp do agendamento pago:', notifyError);
  }

  return booking;
};

export const getPendingSchedulePayment = async (req, res) => {
  try {
    const payments = await prisma.bookingPayment.findMany({
      where: {
        userId: req.user.id,
        scheduledAt: {
          not: null,
        },
        status: {
          in: ['pending', 'approved'],
        },
      },
      include: { booking: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (!payments.length) {
      return res.json({ payment: null, canSchedule: false });
    }

    let latestSynced = null;
    let lastSyncError = null;

    for (const payment of payments) {
      try {
        const synced = await syncBookingPaymentWithMercadoPago(payment);
        latestSynced ||= synced;

        const approved = synced.status === 'approved' && synced.amount >= synced.minimumAmount;
        const booking = payment.booking || (approved ? await buildConfirmedBookingFromPayment(synced) : null);

        if (booking) {
          return res.json({
            payment: serializePayment(synced),
            booking: serializeBookingSummary(booking),
            canSchedule: true,
          });
        }
      } catch (syncError) {
        lastSyncError = syncError;
        console.error('Erro ao sincronizar tentativa de pagamento pendente:', {
          bookingPaymentId: payment.id,
          preferenceId: payment.preferenceId,
          externalReference: payment.externalReference,
          error: syncError.message,
          details: syncError.details,
        });
      }
    }

    if (!latestSynced && lastSyncError) {
      return res.status(lastSyncError.statusCode || 502).json({
        error: lastSyncError.message || 'Nao foi possivel consultar o Mercado Pago.',
      });
    }

    res.json({
      payment: latestSynced ? serializePayment(latestSynced) : null,
      booking: null,
      canSchedule: false,
      message: latestSynced?.status === 'approved'
        ? 'Pagamento aprovado, mas o agendamento ainda nao foi criado.'
        : 'Pagamento ainda nao aprovado pelo Mercado Pago.',
    });
  } catch (error) {
    console.error('Erro ao buscar pagamento pendente de agendamento:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamento pendente.' });
  }
};

export const getApprovedPaymentsWithoutBooking = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    const payments = await prisma.bookingPayment.findMany({
      where: {
        booking: null,
        status: 'approved',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, whatsappPhone: true },
        },
      },
      orderBy: [
        { approvedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50,
    });

    res.json(payments
      .filter((payment) => payment.amount >= payment.minimumAmount)
      .map(serializeOrphanBookingPayment));
  } catch (error) {
    console.error('Erro ao buscar pagamentos aprovados sem agendamento:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamentos aprovados sem agendamento.' });
  }
};

const markPaymentFromMercadoPago = async (bookingPayment, mercadoPagoPayment) => {
  if (!mercadoPagoPayment?.id) return bookingPayment;

  if (mercadoPagoPayment.external_reference && mercadoPagoPayment.external_reference !== bookingPayment.externalReference) {
    const error = new Error('Pagamento nao pertence a esta reserva.');
    error.statusCode = 409;
    throw error;
  }

  const status = mercadoPagoPayment.status || 'pending';
  const updated = await prisma.bookingPayment.update({
    where: { id: bookingPayment.id },
    data: {
      status,
      mercadoPagoPaymentId: String(mercadoPagoPayment.id),
      approvedAt: status === 'approved' ? new Date() : bookingPayment.approvedAt,
      metadata: {
        ...(bookingPayment.metadata || {}),
        mercadoPago: {
          id: mercadoPagoPayment.id,
          status,
          statusDetail: mercadoPagoPayment.status_detail,
          paymentMethodId: mercadoPagoPayment.payment_method_id,
          paymentTypeId: mercadoPagoPayment.payment_type_id,
          transactionAmount: mercadoPagoPayment.transaction_amount,
        },
      },
    },
  });

  if (status === 'approved') {
    await redeemBirthdayRewardFromPayment(updated);
  }

  return updated;
};

export const getBirthdayRewardPreview = async (req, res) => {
  try {
    const service = findServiceById(req.query.serviceId);
    const reward = await getAvailableBirthdayReward(req.user.id);
    const servicePrice = service ? roundMoney(service.price) : null;
    const discount = servicePrice !== null ? getBirthdayRewardDiscount(reward, servicePrice) : Number(reward?.amount || 0);

    res.json({
      available: Boolean(reward && discount > 0),
      reward: reward ? {
        id: reward.id,
        year: reward.year,
        amount: reward.amount,
        status: reward.status,
      } : null,
      discount,
      servicePrice,
      payableServicePrice: servicePrice !== null ? roundMoney(Math.max(servicePrice - discount, 0)) : null,
    });
  } catch (error) {
    console.error('Erro ao buscar premio de aniversario:', error);
    res.status(500).json({ error: 'Erro ao buscar premio de aniversario.' });
  }
};

export const createBookingPreference = async (req, res) => {
  try {
    const { serviceId, paymentType, start, returnPath } = req.body;
    const service = findServiceById(serviceId);

    if (!service) {
      return res.status(400).json({ error: 'Servico invalido.' });
    }

    if (!['deposit', 'full'].includes(paymentType)) {
      return res.status(400).json({ error: 'Escolha entrada de 30% ou pagamento total.' });
    }

    if (!start) {
      return res.status(400).json({ error: 'Escolha o dia e horario antes de pagar.' });
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

    const now = new Date();
    const leadTimeValidation = validateClientBookingLeadTime(scheduledAt, now);

    if (!leadTimeValidation.valid) {
      return res.status(400).json({ error: leadTimeValidation.reason });
    }

    await prisma.bookingPayment.updateMany({
      where: {
        userId: req.user.id,
        booking: null,
        status: 'pending',
        holdExpiresAt: {
          gt: now,
        },
      },
      data: {
        holdExpiresAt: now,
      },
    });

    if (await hasScheduleConflict(prisma, scheduledAt, endTime, { now })) {
      return res.status(409).json({ error: 'Este horario nao comporta a duracao desse servico porque interfere em outro agendamento. Escolha outro dia ou horario.' });
    }

    const servicePrice = roundMoney(service.price);
    const birthdayReward = await getAvailableBirthdayReward(req.user.id);
    const birthdayDiscount = getBirthdayRewardDiscount(birthdayReward, servicePrice);
    const payableServicePrice = roundMoney(Math.max(servicePrice - birthdayDiscount, 0));
    const minimumAmount = roundMoney(payableServicePrice * MINIMUM_PERCENTAGE);
    const amount = paymentType === 'full' ? payableServicePrice : minimumAmount;
    const externalReference = `booking_${randomUUID()}`;
    const holdExpiresAt = new Date(now.getTime() + PAYMENT_HOLD_MINUTES * 60 * 1000);

    const bookingPayment = await prisma.bookingPayment.create({
      data: {
        userId: req.user.id,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice,
        paymentType,
        amount,
        minimumAmount,
        externalReference,
        scheduledAt,
        endTime,
        holdExpiresAt,
        metadata: {
          minimumPercentage: MINIMUM_PERCENTAGE,
          originalServicePrice: servicePrice,
          payableServicePrice,
          birthdayReward: birthdayReward && birthdayDiscount > 0 ? {
            id: birthdayReward.id,
            year: birthdayReward.year,
            amount: birthdayReward.amount,
            discount: birthdayDiscount,
          } : null,
          remainingAmount: paymentType === 'full' ? 0 : roundMoney(payableServicePrice - amount),
          holdMinutes: PAYMENT_HOLD_MINUTES,
        },
      },
    });

    if (amount <= 0) {
      const approvedPayment = await prisma.bookingPayment.update({
        where: { id: bookingPayment.id },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          metadata: {
            ...(bookingPayment.metadata || {}),
            minimumPercentage: MINIMUM_PERCENTAGE,
            originalServicePrice: servicePrice,
            payableServicePrice,
            birthdayReward: birthdayReward && birthdayDiscount > 0 ? {
              id: birthdayReward.id,
              year: birthdayReward.year,
              amount: birthdayReward.amount,
              discount: birthdayDiscount,
            } : null,
            remainingAmount: 0,
            holdMinutes: PAYMENT_HOLD_MINUTES,
            fullyCoveredByBirthdayReward: true,
          },
        },
        include: { booking: true, user: true },
      });

      await redeemBirthdayRewardFromPayment(approvedPayment);
      const booking = await buildConfirmedBookingFromPayment(approvedPayment);

      return res.status(201).json({
        payment: serializePayment(approvedPayment),
        booking: serializeBookingSummary(booking),
        canSchedule: Boolean(booking),
        message: 'Beneficio de aniversario aplicado. Agendamento confirmado sem pagamento.',
      });
    }

    const frontendUrl = getFrontendUrl();
    const safeReturnPath = getSafeReturnPath(returnPath);
    const returnUrl = `${frontendUrl}${safeReturnPath}?bookingPaymentId=${bookingPayment.id}`;
    const backendUrl = getBackendUrl();
    const preference = await mercadoPagoRequest('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            id: service.id,
            title: `${service.name} - ${paymentType === 'full' ? 'pagamento total' : 'entrada de 30%'}${birthdayDiscount > 0 ? ' com desconto aniversario' : ''}`,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: amount,
          },
        ],
        payer: {
          name: req.user.name,
          email: req.user.email,
        },
        external_reference: externalReference,
        metadata: {
          bookingPaymentId: bookingPayment.id,
          serviceId: service.id,
          paymentType,
          userId: req.user.id,
          scheduledAt: scheduledAt.toISOString(),
          birthdayRewardId: birthdayReward?.id || '',
          birthdayDiscount,
          payableServicePrice,
        },
        back_urls: {
          success: `${returnUrl}&mpStatus=success`,
          pending: `${returnUrl}&mpStatus=pending`,
          failure: `${returnUrl}&mpStatus=failure`,
        },
        auto_return: 'all',
        expires: true,
        expiration_date_to: holdExpiresAt.toISOString(),
        payment_methods: {
          excluded_payment_types: [
            { id: 'ticket' },
          ],
        },
        notification_url: backendUrl ? `${backendUrl}/api/payments/mercado-pago/webhook` : undefined,
        statement_descriptor: 'THALLYTA STUDIO',
      }),
    });

    const updated = await prisma.bookingPayment.update({
      where: { id: bookingPayment.id },
      data: {
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
      },
    });

    res.status(201).json({
      payment: serializePayment(updated),
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    });
  } catch (error) {
    console.error('Erro ao criar pagamento Mercado Pago:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao criar pagamento.' });
  }
};

export const confirmBookingPayment = async (req, res) => {
  try {
    const bookingPayment = await prisma.bookingPayment.findUnique({
      where: { id: req.params.id },
      include: { booking: true, user: true },
    });

    if (!bookingPayment || bookingPayment.userId !== req.user.id) {
      return res.status(404).json({ error: 'Pagamento nao encontrado.' });
    }

    let updated = bookingPayment;
    const mercadoPagoPaymentId = getValidId(req.query.payment_id || req.query.collection_id);
    const recoveredStart = getValidId(req.query.start);
    updated = await syncBookingPaymentWithMercadoPago(bookingPayment, mercadoPagoPaymentId);

    const approved = updated.status === 'approved' && updated.amount >= updated.minimumAmount;
    let booking = bookingPayment.booking || null;

    if (approved && !booking) {
      updated = await attachScheduleToPayment(updated, recoveredStart);
      booking = await buildConfirmedBookingFromPayment(updated);
    }

    res.json({
      payment: serializePayment(updated),
      booking: serializeBookingSummary(booking),
      canSchedule: Boolean(booking),
      message: booking
        ? 'Agendamento confirmado.'
        : updated.status === 'approved'
          ? 'Pagamento aprovado, mas o agendamento ainda nao foi criado.'
          : 'Pagamento ainda nao aprovado pelo Mercado Pago.',
    });
  } catch (error) {
    console.error('Erro ao confirmar pagamento Mercado Pago:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao confirmar pagamento.' });
  }
};

export const handleMercadoPagoWebhook = async (req, res) => {
  try {
    const type = req.query.type || req.query.topic || req.body?.type || req.body?.topic;
    const resourceId = getMercadoPagoResourceId(
      req.query.id
        || req.query['data.id']
        || req.query.resource
        || req.body?.data?.id
        || req.body?.id
        || req.body?.resource,
    );

    if (!resourceId || (type && !['payment', 'merchant_order'].includes(type))) {
      return res.status(200).json({ received: true });
    }

    let mercadoPagoPayment = null;
    let merchantOrder = null;

    if (type === 'merchant_order') {
      merchantOrder = await mercadoPagoRequest(`/merchant_orders/${resourceId}`);
      const payments = Array.isArray(merchantOrder?.payments) ? merchantOrder.payments : [];
      const payment = payments.find((item) => item.status === 'approved') || payments[0];
      if (payment?.id) {
        mercadoPagoPayment = await mercadoPagoRequest(`/v1/payments/${payment.id}`);
      }
    } else {
      mercadoPagoPayment = await mercadoPagoRequest(`/v1/payments/${resourceId}`);
    }

    const bookingPayment = await prisma.bookingPayment.findFirst({
      where: {
        OR: [
          mercadoPagoPayment?.external_reference ? { externalReference: mercadoPagoPayment.external_reference } : null,
          merchantOrder?.external_reference ? { externalReference: merchantOrder.external_reference } : null,
          merchantOrder?.preference_id ? { preferenceId: merchantOrder.preference_id } : null,
        ].filter(Boolean),
      },
    });

    if (bookingPayment && mercadoPagoPayment) {
      const updated = await markPaymentFromMercadoPago(bookingPayment, mercadoPagoPayment);
      if (updated.status === 'approved' && updated.amount >= updated.minimumAmount) {
        try {
          await buildConfirmedBookingFromPayment(updated);
        } catch (bookingError) {
          console.error('Erro ao confirmar agendamento pelo webhook Mercado Pago:', bookingError);
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro no webhook Mercado Pago:', error);
    res.status(200).json({ received: true, error: error.message });
  }
};
