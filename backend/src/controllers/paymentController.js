import { randomUUID } from 'crypto';
import prisma from '../config/prisma.js';
import { findServiceById } from '../data/services.js';

const MERCADO_PAGO_API = 'https://api.mercadopago.com';
const PRODUCTION_FRONTEND_URL = 'https://www.thallytasilveira.com.br';
const MINIMUM_PERCENTAGE = 0.3;

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

const roundMoney = (value) => Math.round(value * 100) / 100;

const getValidId = (value) => {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!normalized || ['null', 'undefined'].includes(normalized.toLowerCase())) return null;
  return normalized;
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
  approvedAt: payment.approvedAt,
});

export const getPendingSchedulePayment = async (req, res) => {
  try {
    const payment = await prisma.bookingPayment.findFirst({
      where: {
        userId: req.user.id,
        status: 'approved',
        booking: null,
      },
      orderBy: { approvedAt: 'desc' },
    });

    if (!payment || payment.amount < payment.minimumAmount) {
      return res.json({ payment: null, canSchedule: false });
    }

    res.json({
      payment: serializePayment(payment),
      canSchedule: true,
    });
  } catch (error) {
    console.error('Erro ao buscar pagamento pendente de agendamento:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamento pendente.' });
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
  return prisma.bookingPayment.update({
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
};

export const createBookingPreference = async (req, res) => {
  try {
    const { serviceId, paymentType } = req.body;
    const service = findServiceById(serviceId);

    if (!service) {
      return res.status(400).json({ error: 'Servico invalido.' });
    }

    if (!['deposit', 'full'].includes(paymentType)) {
      return res.status(400).json({ error: 'Escolha entrada de 30% ou pagamento total.' });
    }

    const servicePrice = roundMoney(service.price);
    const minimumAmount = roundMoney(servicePrice * MINIMUM_PERCENTAGE);
    const amount = paymentType === 'full' ? servicePrice : minimumAmount;
    const externalReference = `booking_${randomUUID()}`;

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
        metadata: {
          minimumPercentage: MINIMUM_PERCENTAGE,
          remainingAmount: paymentType === 'full' ? 0 : roundMoney(servicePrice - amount),
        },
      },
    });

    const frontendUrl = getFrontendUrl();
    const returnUrl = `${frontendUrl}/?bookingPaymentId=${bookingPayment.id}`;
    const backendUrl = getBackendUrl();
    const preference = await mercadoPagoRequest('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            id: service.id,
            title: `${service.name} - ${paymentType === 'full' ? 'pagamento total' : 'entrada de 30%'}`,
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
        },
        back_urls: {
          success: `${returnUrl}&mpStatus=success`,
          pending: `${returnUrl}&mpStatus=pending`,
          failure: `${returnUrl}&mpStatus=failure`,
        },
        auto_return: 'approved',
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
    const bookingPayment = await prisma.bookingPayment.findUnique({ where: { id: req.params.id } });

    if (!bookingPayment || bookingPayment.userId !== req.user.id) {
      return res.status(404).json({ error: 'Pagamento nao encontrado.' });
    }

    let updated = bookingPayment;
    const mercadoPagoPaymentId = getValidId(req.query.payment_id || req.query.collection_id);

    if (mercadoPagoPaymentId) {
      const mercadoPagoPayment = await mercadoPagoRequest(`/v1/payments/${mercadoPagoPaymentId}`);
      updated = await markPaymentFromMercadoPago(bookingPayment, mercadoPagoPayment);
    }

    res.json({
      payment: serializePayment(updated),
      canSchedule: updated.status === 'approved' && updated.amount >= updated.minimumAmount,
    });
  } catch (error) {
    console.error('Erro ao confirmar pagamento Mercado Pago:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao confirmar pagamento.' });
  }
};

export const handleMercadoPagoWebhook = async (req, res) => {
  try {
    const paymentId = getValidId(req.query.id || req.body?.data?.id || req.body?.id);
    const type = req.query.type || req.body?.type || req.body?.topic;

    if (!paymentId || (type && type !== 'payment')) {
      return res.status(200).json({ received: true });
    }

    const mercadoPagoPayment = await mercadoPagoRequest(`/v1/payments/${paymentId}`);
    const bookingPayment = await prisma.bookingPayment.findUnique({
      where: { externalReference: mercadoPagoPayment.external_reference },
    });

    if (bookingPayment) {
      await markPaymentFromMercadoPago(bookingPayment, mercadoPagoPayment);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro no webhook Mercado Pago:', error);
    res.status(200).json({ received: true, error: error.message });
  }
};
