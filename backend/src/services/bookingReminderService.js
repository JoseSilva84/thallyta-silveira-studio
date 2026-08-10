import prisma from '../config/prisma.js';
import { notifyMaintenanceReminder, notifyUpcomingBookingReminder } from './whatsappService.js';
import { isDatabaseUnavailableError, logDatabaseUnavailableWarning } from '../utils/prismaErrors.js';

const DEFAULT_CHECK_INTERVAL_MINUTES = 5;
const DEFAULT_LEAD_MINUTES = 60;
const MAINTENANCE_REMINDER_DAYS = [14, 21];
const MAINTENANCE_SERVICE_IDS = ['gel', 'banho-gel'];
const MAINTENANCE_SERVICE_NAMES = ['alongamento em gel', 'banho em gel'];

const minutesToMs = (minutes) => minutes * 60 * 1000;

const getNumberEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const bookingRemindersEnabled = () => process.env.BOOKING_REMINDER_ENABLED === 'true';
const maintenanceRemindersEnabled = () => process.env.MAINTENANCE_REMINDER_ENABLED !== 'false';

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

const getMaintenanceReminderWindow = (daysAfterService) => {
  const now = new Date();
  const intervalMinutes = getNumberEnv('BOOKING_REMINDER_CHECK_INTERVAL_MINUTES', DEFAULT_CHECK_INTERVAL_MINUTES);
  const toleranceMinutes = Math.max(intervalMinutes, 1);
  const target = new Date(now.getTime() - minutesToMs(daysAfterService * 24 * 60));

  return {
    from: new Date(target.getTime() - minutesToMs(toleranceMinutes)),
    to: new Date(target.getTime() + minutesToMs(toleranceMinutes)),
  };
};

const normalizeServiceName = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const isMaintenanceService = (booking) => {
  const paymentServiceId = booking.payment?.serviceId;
  if (paymentServiceId && MAINTENANCE_SERVICE_IDS.includes(paymentServiceId)) return true;

  const serviceNames = normalizeServiceName(booking.service)
    .split(',')
    .map((serviceName) => serviceName.trim())
    .filter(Boolean);

  return serviceNames.some((serviceName) => MAINTENANCE_SERVICE_NAMES.includes(serviceName));
};

export const sendDueBookingReminders = async () => {
  if (!bookingRemindersEnabled()) return 0;

  const { from, to } = getReminderWindow();

  let bookings = [];
  try {
    bookings = await prisma.booking.findMany({
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
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      logDatabaseUnavailableWarning('Lembretes de agendamento', error);
      return 0;
    }
    throw error;
  }

  for (const booking of bookings) {
    try {
      await notifyUpcomingBookingReminder(prisma, booking);
    } catch (error) {
      console.error(`Erro ao enviar lembrete do agendamento ${booking.id}:`, error);
    }
  }

  return bookings.length;
};

export const sendDueMaintenanceReminders = async () => {
  if (!maintenanceRemindersEnabled()) return 0;

  let sentCandidates = 0;

  for (const daysAfterService of MAINTENANCE_REMINDER_DAYS) {
    const { from, to } = getMaintenanceReminderWindow(daysAfterService);

    let bookings = [];
    try {
      bookings = await prisma.booking.findMany({
        where: {
          serviceCompletedAt: {
            not: null,
          },
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
          payment: true,
        },
        orderBy: { scheduledAt: 'asc' },
      });
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        logDatabaseUnavailableWarning('Lembretes de manutencao', error);
        return sentCandidates;
      }
      throw error;
    }

    for (const booking of bookings.filter(isMaintenanceService)) {
      try {
        await notifyMaintenanceReminder(prisma, booking, daysAfterService);
        sentCandidates += 1;
      } catch (error) {
        console.error(`Erro ao enviar lembrete de manutencao ${daysAfterService}d do agendamento ${booking.id}:`, error);
      }
    }
  }

  return sentCandidates;
};

export const startBookingReminderService = () => {
  const runBookingReminders = bookingRemindersEnabled();
  const runMaintenanceReminders = maintenanceRemindersEnabled();

  if (!runBookingReminders && !runMaintenanceReminders) {
    console.log('Lembretes por WhatsApp desativados.');
    return null;
  }

  const intervalMinutes = getNumberEnv('BOOKING_REMINDER_CHECK_INTERVAL_MINUTES', DEFAULT_CHECK_INTERVAL_MINUTES);

  if (runBookingReminders) {
    void sendDueBookingReminders().catch((error) => {
      console.error('Erro ao executar lembretes iniciais de agendamento:', error);
    });
  } else {
    console.log('Lembretes de agendamento por WhatsApp desativados.');
  }

  if (runMaintenanceReminders) {
    void sendDueMaintenanceReminders().catch((error) => {
      console.error('Erro ao executar lembretes iniciais de manutencao:', error);
    });
  }

  const timer = setInterval(() => {
    if (runBookingReminders) {
      void sendDueBookingReminders().catch((error) => {
        console.error('Erro ao executar lembretes de agendamento:', error);
      });
    }
    if (runMaintenanceReminders) {
      void sendDueMaintenanceReminders().catch((error) => {
        console.error('Erro ao executar lembretes de manutencao:', error);
      });
    }
  }, minutesToMs(intervalMinutes));

  if (typeof timer.unref === 'function') timer.unref();
  console.log(`Lembretes por WhatsApp ativos a cada ${intervalMinutes} minuto(s).`);

  return timer;
};
