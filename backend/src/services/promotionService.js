import prisma from '../config/prisma.js';
import { findServiceById } from '../data/services.js';

const PRODUCTION_FRONTEND_URL = 'https://www.thallytasilveira.com.br';

export const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

export const getFrontendUrl = () => {
  if (process.env.PUBLIC_FRONTEND_URL) return process.env.PUBLIC_FRONTEND_URL.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return PRODUCTION_FRONTEND_URL;
  return (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)[0]
    .replace(/\/$/, '');
};

export const buildPromotionLink = (promotionId, itemId = '') => {
  const url = new URL(getFrontendUrl());
  url.searchParams.set('promocao', promotionId);
  if (itemId) url.searchParams.set('itemPromocao', itemId);
  url.hash = 'agenda';
  return url.toString();
};

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(Number(value || 0));

export const serializePromotion = (promotion, { includeLink = true } = {}) => {
  if (!promotion) return null;
  const items = (promotion.items || [])
    .slice()
    .sort((a, b) => a.serviceName.localeCompare(b.serviceName))
    .map((item) => ({
      id: item.id,
      promotionId: item.promotionId,
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      regularPrice: item.regularPrice,
      promotionalPrice: item.promotionalPrice,
      regularPriceLabel: formatCurrency(item.regularPrice),
      promotionalPriceLabel: formatCurrency(item.promotionalPrice),
      bookingLink: includeLink ? buildPromotionLink(item.promotionId, item.id) : null,
    }));

  return {
    id: promotion.id,
    title: promotion.title,
    description: promotion.description,
    imageUrl: promotion.imageUrl || '',
    whatsappText: promotion.whatsappText || '',
    startsAt: promotion.startsAt,
    endsAt: promotion.endsAt,
    active: promotion.active,
    createdAt: promotion.createdAt,
    updatedAt: promotion.updatedAt,
    items,
    bookingLink: includeLink ? buildPromotionLink(promotion.id, items[0]?.id || '') : null,
  };
};

export const getActivePromotionWhere = (now = new Date()) => ({
  active: true,
  startsAt: { lte: now },
  endsAt: { gte: now },
});

export const findActivePromotion = async ({ promotionId, itemId, serviceId, now = new Date() } = {}) => {
  const where = {
    ...getActivePromotionWhere(now),
    ...(promotionId ? { id: promotionId } : {}),
    items: {
      some: {
        ...(itemId ? { id: itemId } : {}),
        ...(serviceId ? { serviceId } : {}),
      },
    },
  };

  const promotion = await prisma.promotion.findFirst({
    where,
    include: { items: true },
    orderBy: { startsAt: 'desc' },
  });

  if (!promotion) return null;
  const item = promotion.items.find((entry) => (
    (!itemId || entry.id === itemId)
    && (!serviceId || entry.serviceId === serviceId)
  ));

  if (!item) return null;
  return { promotion, item };
};

export const getPromotionalServicePricing = async ({ serviceId, promotionId, itemId, now = new Date() }) => {
  const service = findServiceById(serviceId);
  if (!service) return { service: null, promotion: null, item: null, servicePrice: null };

  const active = promotionId || itemId
    ? await findActivePromotion({ promotionId, itemId, serviceId, now })
    : null;

  if (!active) {
    return {
      service,
      promotion: null,
      item: null,
      servicePrice: roundMoney(service.price),
      originalServicePrice: roundMoney(service.price),
    };
  }

  return {
    service,
    promotion: active.promotion,
    item: active.item,
    servicePrice: roundMoney(active.item.promotionalPrice),
    originalServicePrice: roundMoney(service.price),
  };
};
