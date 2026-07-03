import prisma from '../config/prisma.js';
import { notifyBirthdayReward } from './whatsappService.js';

const DEFAULT_CHECK_INTERVAL_HOURS = 24;
const DEFAULT_REWARD_AMOUNT = 0;
const STUDIO_TIME_ZONE = 'America/Fortaleza';

const hoursToMs = (hours) => hours * 60 * 60 * 1000;

const getNumberEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const getTodayParts = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO_TIME_ZONE,
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

const getStudioDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

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

const shouldSendReward = (reward) => !reward || ['failed', 'pending'].includes(reward.status);

const getMonthName = (month) => new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  timeZone: STUDIO_TIME_ZONE,
}).format(new Date(Date.UTC(2026, month - 1, 1)));

const isValidMonth = (value) => Number.isInteger(value) && value >= 1 && value <= 12;

const normalizeYearMonth = ({ year, month } = {}) => {
  const today = getStudioDateParts();
  const normalizedYear = Number.parseInt(year || today.year, 10);
  const normalizedMonth = Number.parseInt(month || today.month, 10);

  return {
    year: Number.isInteger(normalizedYear) && normalizedYear > 1900 ? normalizedYear : today.year,
    month: isValidMonth(normalizedMonth) ? normalizedMonth : today.month,
  };
};

const mapRewardStatus = (reward) => {
  if (!reward) return 'not_sent';
  if (reward.status === 'sent') return 'sent';
  if (reward.status === 'failed') return 'failed';
  if (reward.status === 'skipped') return 'skipped';
  if (reward.status === 'redeemed') return 'redeemed';
  return 'pending';
};

export const listMonthlyBirthdayRewards = async ({ year, month } = {}) => {
  const target = normalizeYearMonth({ year, month });
  const today = getStudioDateParts();

  const users = await prisma.user.findMany({
    where: {
      role: 'CLIENT',
      dateOfBirth: { not: null },
    },
    select: {
      id: true,
      name: true,
      email: true,
      dateOfBirth: true,
      whatsappPhone: true,
      birthdayRewards: {
        where: { year: target.year },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const celebrants = users
    .filter((user) => {
      const birthDate = new Date(user.dateOfBirth);
      return birthDate.getUTCMonth() + 1 === target.month;
    })
    .map((user) => {
      const reward = user.birthdayRewards[0] || null;
      const birthDate = new Date(user.dateOfBirth);
      const day = birthDate.getUTCDate();

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        whatsappPhone: user.whatsappPhone,
        dateOfBirth: user.dateOfBirth,
        birthdayDay: day,
        isToday: target.year === today.year && target.month === today.month && day === today.day,
        reward: reward ? {
          id: reward.id,
          year: reward.year,
          amount: reward.amount,
          status: reward.status,
          target: reward.target,
          sentAt: reward.sentAt,
          error: reward.error,
          createdAt: reward.createdAt,
          updatedAt: reward.updatedAt,
        } : null,
        rewardStatus: mapRewardStatus(reward),
        canSend: Boolean(user.whatsappPhone) && mapRewardStatus(reward) !== 'sent',
      };
    })
    .sort((a, b) => a.birthdayDay - b.birthdayDay || a.name.localeCompare(b.name));

  return {
    year: target.year,
    month: target.month,
    monthName: getMonthName(target.month),
    celebrants,
  };
};

export const sendManualBirthdayReward = async (userId, { year } = {}) => {
  const today = getStudioDateParts();
  const targetYear = Number.parseInt(year || today.year, 10);
  const rewardYear = Number.isInteger(targetYear) && targetYear > 1900 ? targetYear : today.year;
  const amount = getNumberEnv('BIRTHDAY_REWARD_AMOUNT', DEFAULT_REWARD_AMOUNT);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      dateOfBirth: true,
      whatsappPhone: true,
      birthdayRewards: {
        where: { year: rewardYear },
        take: 1,
      },
    },
  });

  if (!user || user.role !== 'CLIENT') {
    const error = new Error('Cliente nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  if (!user.dateOfBirth) {
    const error = new Error('Cliente sem data de nascimento cadastrada.');
    error.statusCode = 400;
    throw error;
  }

  if (!user.whatsappPhone) {
    const error = new Error('Cliente sem WhatsApp cadastrado.');
    error.statusCode = 400;
    throw error;
  }

  const existingReward = user.birthdayRewards[0];
  if (existingReward?.status === 'sent') {
    const error = new Error('Mensagem de aniversario ja enviada para este cliente neste ano.');
    error.statusCode = 409;
    throw error;
  }

  const reward = existingReward || await prisma.birthdayReward.create({
    data: {
      userId: user.id,
      year: rewardYear,
      amount,
      status: 'pending',
    },
  });

  try {
    const result = await notifyBirthdayReward(user, reward.amount);
    const updated = await prisma.birthdayReward.update({
      where: { id: reward.id },
      data: {
        status: result.skipped ? 'skipped' : 'sent',
        target: result.resolvedChatId || user.whatsappPhone,
        sentAt: result.skipped ? null : new Date(),
        error: result.skipped ? result.reason : null,
      },
    });

    return { user, reward: updated, result };
  } catch (error) {
    await prisma.birthdayReward.update({
      where: { id: reward.id },
      data: {
        status: 'failed',
        target: user.whatsappPhone,
        error: error.message?.slice(0, 1000) || 'Erro desconhecido',
      },
    });
    throw error;
  }
};

export const sendDueBirthdayRewards = async () => {
  const today = getTodayParts();
  const amount = getNumberEnv('BIRTHDAY_REWARD_AMOUNT', DEFAULT_REWARD_AMOUNT);

  const users = await prisma.user.findMany({
    where: {
      role: 'CLIENT',
      dateOfBirth: { not: null },
      whatsappPhone: { not: null },
    },
    select: {
      id: true,
      name: true,
      email: true,
      dateOfBirth: true,
      whatsappPhone: true,
      birthdayRewards: {
        where: { year: today.year },
        take: 1,
      },
    },
  });

  const birthdayUsers = users.filter((user) => isBirthdayToday(user.dateOfBirth, today));

  for (const user of birthdayUsers) {
    const existingReward = user.birthdayRewards[0];
    if (!shouldSendReward(existingReward)) continue;

    const reward = existingReward || await prisma.birthdayReward.create({
      data: {
        userId: user.id,
        year: today.year,
        amount,
        status: 'pending',
      },
    });

    try {
      const result = await notifyBirthdayReward(user, reward.amount);
      await prisma.birthdayReward.update({
        where: { id: reward.id },
        data: {
          status: result.skipped ? 'skipped' : 'sent',
          target: result.resolvedChatId || user.whatsappPhone,
          sentAt: result.skipped ? null : new Date(),
          error: result.skipped ? result.reason : null,
        },
      });
    } catch (error) {
      await prisma.birthdayReward.update({
        where: { id: reward.id },
        data: {
          status: 'failed',
          target: user.whatsappPhone,
          error: error.message?.slice(0, 1000) || 'Erro desconhecido',
        },
      });
      console.error(`Erro ao enviar aniversario para usuario ${user.id}:`, error);
    }
  }

  return birthdayUsers.length;
};

export const startBirthdayRewardService = () => {
  if (process.env.BIRTHDAY_REWARD_ENABLED !== 'true') {
    console.log('Premios de aniversario por WhatsApp desativados.');
    return null;
  }

  if (process.env.BIRTHDAY_REWARD_SEND_WHATSAPP !== 'true') {
    console.log('Premios de aniversario por WhatsApp desativados. Defina BIRTHDAY_REWARD_SEND_WHATSAPP=true para permitir envios automaticos.');
    return null;
  }

  const intervalHours = getNumberEnv('BIRTHDAY_REWARD_CHECK_INTERVAL_HOURS', DEFAULT_CHECK_INTERVAL_HOURS);

  void sendDueBirthdayRewards().catch((error) => {
    console.error('Erro ao executar premios de aniversario iniciais:', error);
  });

  const timer = setInterval(() => {
    void sendDueBirthdayRewards().catch((error) => {
      console.error('Erro ao executar premios de aniversario:', error);
    });
  }, hoursToMs(intervalHours));

  if (typeof timer.unref === 'function') timer.unref();
  console.log(`Premios de aniversario por WhatsApp ativos a cada ${intervalHours} hora(s).`);

  return timer;
};
