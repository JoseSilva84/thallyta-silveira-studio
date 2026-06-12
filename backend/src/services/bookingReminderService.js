import prisma from '../config/prisma.js';
import { notifyUpcomingBookingReminder } from './whatsappService.js';

const DEFAULT_CHECK_INTERVAL_MINUTES = 5;
const DEFAULT_LEAD_MINUTES = 60;

const minutesToMs = (minutes) => minutes * 60 * 1000;

const getNumberEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const getReminderWindow = () => {
  const now = new Date();
  const leadMinutes = getNumberEnv('BOOKING_REMINDER_LEAD_MINUTES', DEFAULT_LEAD_MINUTES);
  const intervalMinutes = getNumberEnv('BOOKING_REMINDER_CHECK_INTERVAL_MINUTES', DEFAULT_CHECK_INTERVAL_MINUTES);
  const toleranceMinutes = Math.max(intervalMinutes, 1);

  return {
    from: new Date(now.getTime() + minutesToMs(leadMinutes - toleranceMinutes)),
    to: new Date(now.getTime() + minutesToMs(leadMinutes + toleranceMinutes)),
  };
};

export const sendDueBookingReminders = async () => {
  const { from, to } = getReminderWindow();

  const bookings = await prisma.booking.findMany({
    where: {
      scheduledAt: {
        gte: from,
        lte: to,
      },
      status: {
        in: ['confirmed', 'rescheduled'],
      },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, whatsappPhone: true },
      },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  for (const booking of bookings) {
    try {
      await notifyUpcomingBookingReminder(prisma, booking);
    } catch (error) {
      console.error(`Erro ao enviar lembrete do agendamento ${booking.id}:`, error);
    }
  }

  return bookings.length;
};

export const startBookingReminderService = () => {
  if (process.env.BOOKING_REMINDER_ENABLED !== 'true') {
    console.log('Lembretes de agendamento por WhatsApp desativados.');
    return null;
  }

  const intervalMinutes = getNumberEnv('BOOKING_REMINDER_CHECK_INTERVAL_MINUTES', DEFAULT_CHECK_INTERVAL_MINUTES);

  void sendDueBookingReminders().catch((error) => {
    console.error('Erro ao executar lembretes iniciais de agendamento:', error);
  });

  const timer = setInterval(() => {
    void sendDueBookingReminders().catch((error) => {
      console.error('Erro ao executar lembretes de agendamento:', error);
    });
  }, minutesToMs(intervalMinutes));

  if (typeof timer.unref === 'function') timer.unref();
  console.log(`Lembretes de agendamento por WhatsApp ativos a cada ${intervalMinutes} minuto(s).`);

  return timer;
};
