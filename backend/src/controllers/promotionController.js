import prisma from '../config/prisma.js';
import { services, findServiceById } from '../data/services.js';
import { sendCampaignMessage } from '../services/whatsappService.js';
import {
  buildPromotionLink,
  getActivePromotionWhere,
  roundMoney,
  serializePromotion,
} from '../services/promotionService.js';

const parseDate = (value, fieldName) => {
  const rawValue = String(value || '').trim();
  const normalizedValue = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawValue)
    ? `${rawValue}:00-03:00`
    : rawValue;
  const date = new Date(normalizedValue);
  if (!value || Number.isNaN(date.getTime())) {
    const error = new Error(`Informe ${fieldName} valida.`);
    error.statusCode = 400;
    throw error;
  }
  return date;
};

const parseMoney = (value, fieldName) => {
  const raw = String(value || '').trim();
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const number = Number.parseFloat(normalized);
  if (!Number.isFinite(number) || number <= 0) {
    const error = new Error(`Informe ${fieldName} valido.`);
    error.statusCode = 400;
    throw error;
  }
  return roundMoney(number);
};

const textValue = (value, max = 1200) => {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, max) : '';
};

const buildPromotionPayload = (body) => {
  const title = textValue(body.title, 120);
  const description = textValue(body.description, 1000);
  const displayStartsAt = body.displayStartsAt ? parseDate(body.displayStartsAt, 'a data inicial de exibicao') : null;
  const displayEndsAt = body.displayEndsAt ? parseDate(body.displayEndsAt, 'a data final de exibicao') : null;
  const startsAt = parseDate(body.startsAt, 'a data inicial');
  const endsAt = parseDate(body.endsAt, 'a data final');

  if (!title) {
    const error = new Error('Informe o titulo da promocao.');
    error.statusCode = 400;
    throw error;
  }

  if (!description) {
    const error = new Error('Informe o texto da promocao.');
    error.statusCode = 400;
    throw error;
  }

  if (endsAt <= startsAt) {
    const error = new Error('A data final precisa ser depois da data inicial.');
    error.statusCode = 400;
    throw error;
  }

  if (displayStartsAt && displayEndsAt && displayEndsAt <= displayStartsAt) {
    const error = new Error('A data final de exibicao precisa ser depois da data inicial de exibicao.');
    error.statusCode = 400;
    throw error;
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .map((item) => {
      const service = findServiceById(item.serviceId);
      if (!service) return null;
      return {
        serviceId: service.id,
        serviceName: service.name,
        regularPrice: roundMoney(service.price),
        promotionalPrice: parseMoney(item.promotionalPrice, `o valor promocional de ${service.name}`),
      };
    })
    .filter(Boolean);

  if (!items.length) {
    const error = new Error('Selecione pelo menos um servico para a promocao.');
    error.statusCode = 400;
    throw error;
  }

  return {
    data: {
      title,
      description,
      imageUrl: textValue(body.imageUrl, 1000) || null,
      whatsappText: textValue(body.whatsappText, 1200) || null,
      displayStartsAt,
      displayEndsAt,
      startsAt,
      endsAt,
      active: body.active !== false,
    },
    items,
  };
};

const buildDefaultWhatsappText = (promotion, itemId = '') => {
  const serialized = serializePromotion(promotion);
  const priceLines = serialized.items.map((item) => (
    `${item.serviceName}: de ${item.regularPriceLabel} por ${item.promotionalPriceLabel}`
  ));
  const link = buildPromotionLink(promotion.id, itemId);
  return [
    promotion.whatsappText || promotion.description,
    '',
    ...priceLines,
    '',
    `Agende aqui: ${link}`,
  ].join('\n');
};

export const listPublicActivePromotions = async (_req, res) => {
  try {
    const promotions = await prisma.promotion.findMany({
      where: getActivePromotionWhere(),
      include: { items: true },
      orderBy: { startsAt: 'desc' },
      take: 5,
    });

    res.json({ promotions: promotions.map((promotion) => serializePromotion(promotion)) });
  } catch (error) {
    console.error('Erro ao buscar promocoes ativas:', error);
    res.status(500).json({ error: 'Erro ao buscar promocoes.' });
  }
};

export const listAdminPromotions = async (_req, res) => {
  try {
    const promotions = await prisma.promotion.findMany({
      include: { items: true },
      orderBy: { startsAt: 'desc' },
    });

    res.json({
      services,
      promotions: promotions.map((promotion) => serializePromotion(promotion)),
    });
  } catch (error) {
    console.error('Erro ao listar promocoes:', error);
    res.status(500).json({ error: 'Erro ao carregar promocoes.' });
  }
};

export const createPromotion = async (req, res) => {
  try {
    const payload = buildPromotionPayload(req.body);
    const promotion = await prisma.promotion.create({
      data: {
        ...payload.data,
        createdById: req.user.id,
        items: { create: payload.items },
      },
      include: { items: true },
    });

    res.status(201).json({ promotion: serializePromotion(promotion) });
  } catch (error) {
    console.error('Erro ao criar promocao:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao criar promocao.' });
  }
};

export const updatePromotion = async (req, res) => {
  try {
    const payload = buildPromotionPayload(req.body);
    const promotion = await prisma.$transaction(async (tx) => {
      await tx.promotionItem.deleteMany({ where: { promotionId: req.params.id } });
      return tx.promotion.update({
        where: { id: req.params.id },
        data: {
          ...payload.data,
          items: { create: payload.items },
        },
        include: { items: true },
      });
    });

    res.json({ promotion: serializePromotion(promotion) });
  } catch (error) {
    console.error('Erro ao atualizar promocao:', error);
    const notFound = error.code === 'P2025';
    res.status(error.statusCode || (notFound ? 404 : 500)).json({ error: notFound ? 'Promocao nao encontrada.' : error.message || 'Erro ao atualizar promocao.' });
  }
};

export const deletePromotion = async (req, res) => {
  try {
    await prisma.promotion.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro ao excluir promocao:', error);
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.code === 'P2025' ? 'Promocao nao encontrada.' : 'Erro ao excluir promocao.' });
  }
};

export const sendPromotionWhatsapp = async (req, res) => {
  try {
    const promotion = await prisma.promotion.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!promotion) return res.status(404).json({ error: 'Promocao nao encontrada.' });

    const promotional = req.body?.promotional !== false;
    const itemId = String(req.body?.itemId || '').trim();
    const message = textValue(req.body?.message, 1200) || buildDefaultWhatsappText(promotion, itemId);
    const clientIds = Array.isArray(req.body?.clientIds) ? req.body.clientIds.map(String).filter(Boolean) : [];

    const users = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        whatsappPhone: { not: null },
        ...(clientIds.length ? { id: { in: clientIds.slice(0, 200) } } : {}),
      },
      select: {
        id: true,
        name: true,
        whatsappPhone: true,
        crmProfile: true,
      },
      orderBy: { name: 'asc' },
      take: clientIds.length ? undefined : 200,
    });

    const results = [];
    for (const user of users) {
      if (user.crmProfile?.doNotInviteAt) {
        results.push({ userId: user.id, name: user.name, ok: false, skipped: true, message: 'nao insistir' });
        continue;
      }
      if (promotional && user.crmProfile?.allowPromotions === false) {
        results.push({ userId: user.id, name: user.name, ok: false, skipped: true, message: 'nao aceita promocoes' });
        continue;
      }

      try {
        const firstName = String(user.name || '').trim().split(/\s+/)[0] || 'cliente';
        const personalized = message
          .replace(/\{nome\}/gi, user.name || firstName)
          .replace(/\{primeiro_nome\}/gi, firstName);
        const result = await sendCampaignMessage(user, personalized);
        results.push({ userId: user.id, name: user.name, ok: !result.skipped, skipped: Boolean(result.skipped), message: result.reason || 'enviado' });
      } catch (error) {
        results.push({ userId: user.id, name: user.name, ok: false, message: error.message || 'erro' });
      }
    }

    res.json({
      total: users.length,
      sent: results.filter((item) => item.ok).length,
      skipped: results.filter((item) => item.skipped).length,
      failed: results.filter((item) => !item.ok && !item.skipped).length,
      results,
    });
  } catch (error) {
    console.error('Erro ao enviar promocao por WhatsApp:', error);
    res.status(500).json({ error: 'Erro ao enviar promocao por WhatsApp.' });
  }
};
