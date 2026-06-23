import prisma from '../config/prisma.js';
import { notifyBirthdayReward } from './whatsappService.js';

const DEFAULT_CHECK_INTERVAL_HOURS = 24;
const DEFAULT_REWARD_AMOUNT = 30;
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

const isBirthdayToday = (dateOfBirth, today) => {
  if (!dateOfBirth) return false;
  const birthDate = new Date(dateOfBirth);
  return birthDate.getUTCMonth() + 1 === today.month && birthDate.getUTCDate() === today.day;
};

const shouldSendReward = (reward) => !reward || ['failed', 'pending'].includes(reward.status);

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
