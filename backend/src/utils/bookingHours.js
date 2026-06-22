const STUDIO_TIME_ZONE = 'America/Fortaleza';

const OPEN_MINUTES = 9 * 60 + 30;
const LUNCH_START_MINUTES = 13 * 60;
const LUNCH_END_MINUTES = 14 * 60 + 30;
const CLOSE_MINUTES = 18 * 60;
const SLOT_INTERVAL_MINUTES = 30;
const MIN_CLIENT_LEAD_TIME_MINUTES = 120;
const LAST_MORNING_SLOT_START = 12 * 60;
const LAST_AFTERNOON_SLOT_START = 17 * 60;
const BLOCKED_START_MINUTES = new Set([12 * 60 + 30, 17 * 60 + 30]);
const BUSINESS_WEEKDAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: STUDIO_TIME_ZONE,
  weekday: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const getPart = (parts, type) => parts.find((part) => part.type === type)?.value;

const getStudioDateTime = (date) => {
  const parts = dateTimeFormatter.formatToParts(date);
  const hour = Number(getPart(parts, 'hour'));
  const minute = Number(getPart(parts, 'minute'));

  return {
    weekday: getPart(parts, 'weekday'),
    dateKey: `${getPart(parts, 'year')}-${getPart(parts, 'month')}-${getPart(parts, 'day')}`,
    minutes: hour * 60 + minute,
  };
};

export const validateBookingWindow = (startInput, endInput) => {
  const start = startInput instanceof Date ? startInput : new Date(startInput);
  const end = endInput instanceof Date ? endInput : new Date(endInput);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return { valid: false, reason: 'Horario de agendamento invalido.' };
  }

  const startLocal = getStudioDateTime(start);
  const endLocal = getStudioDateTime(end);

  if (startLocal.dateKey !== endLocal.dateKey) {
    return { valid: false, reason: 'O agendamento precisa comecar e terminar no mesmo dia.' };
  }

  if (!BUSINESS_WEEKDAYS.has(startLocal.weekday)) {
    return { valid: false, reason: 'Agendamentos estao disponiveis apenas de segunda a sexta.' };
  }

  if (startLocal.minutes < OPEN_MINUTES) {
    return { valid: false, reason: 'O atendimento comeca a partir das 09h30.' };
  }

  if (endLocal.minutes > CLOSE_MINUTES) {
    return { valid: false, reason: 'O atendimento encerra as 18h00.' };
  }

  if (startLocal.minutes < LUNCH_END_MINUTES && endLocal.minutes > LUNCH_START_MINUTES) {
    return { valid: false, reason: 'O horario de 13h00 as 14h30 nao esta disponivel para agendamento.' };
  }

  if (BLOCKED_START_MINUTES.has(startLocal.minutes)) {
    return { valid: false, reason: 'Este horario nao esta disponivel para inicio de agendamento.' };
  }

  return { valid: true };
};

export const validateClientBookingLeadTime = (startInput, nowInput = new Date()) => {
  const start = startInput instanceof Date ? startInput : new Date(startInput);
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);

  if (Number.isNaN(start.getTime()) || Number.isNaN(now.getTime())) {
    return { valid: false, reason: 'Horario de agendamento invalido.' };
  }

  const minimumStart = new Date(now.getTime() + MIN_CLIENT_LEAD_TIME_MINUTES * 60 * 1000);

  if (start <= minimumStart) {
    return { valid: false, reason: 'Escolha um horario com pelo menos 2 horas de antecedencia.' };
  }

  return { valid: true };
};

const padTime = (value) => String(value).padStart(2, '0');

const minutesToTime = (minutes) => `${padTime(Math.floor(minutes / 60))}:${padTime(minutes % 60)}`;

const addDaysToDateKey = (dateKey, amount) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12, 0, 0, 0));
  return getStudioDateTime(date).dateKey;
};

const localSlotToDate = (dateKey, minutes) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, Math.floor(minutes / 60) + 3, minutes % 60, 0, 0));
};

const bookingOverlapsSlot = (booking, slotStart, slotEnd) => {
  const bookingStart = new Date(booking.scheduledAt);
  const bookingEnd = booking.endTime
    ? new Date(booking.endTime)
    : new Date(bookingStart.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000);

  return bookingStart < slotEnd && bookingEnd > slotStart;
};

export const buildPublicAgendaDays = (bookings, daysCount, nowInput = new Date()) => {
  const todayKey = getStudioDateTime(nowInput).dateKey;
  const minimumClientStart = new Date(nowInput.getTime() + MIN_CLIENT_LEAD_TIME_MINUTES * 60 * 1000);
  const windows = [
    [OPEN_MINUTES, LAST_MORNING_SLOT_START + SLOT_INTERVAL_MINUTES],
    [LUNCH_END_MINUTES, LAST_AFTERNOON_SLOT_START + SLOT_INTERVAL_MINUTES],
  ];

  return Array.from({ length: daysCount }, (_, index) => {
    const dateKey = addDaysToDateKey(todayKey, index);
    const dayDate = localSlotToDate(dateKey, 12 * 60);
    const localDay = getStudioDateTime(dayDate);
    const isBusinessDay = BUSINESS_WEEKDAYS.has(localDay.weekday);
    const dayBookings = bookings.filter((booking) => getStudioDateTime(new Date(booking.scheduledAt)).dateKey === dateKey);
    const availableSlots = [];

    if (isBusinessDay) {
      for (const [windowStart, windowEnd] of windows) {
        for (let minutes = windowStart; minutes + SLOT_INTERVAL_MINUTES <= windowEnd; minutes += SLOT_INTERVAL_MINUTES) {
          const slotStart = localSlotToDate(dateKey, minutes);
          const slotEnd = new Date(slotStart.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000);

          if (slotStart <= minimumClientStart) continue;
          if (dayBookings.some((booking) => bookingOverlapsSlot(booking, slotStart, slotEnd))) continue;

          availableSlots.push({
            time: minutesToTime(minutes),
            start: slotStart.toISOString(),
          });
        }
      }
    }

    return {
      date: dateKey,
      isBusinessDay,
      availableSlots,
    };
  });
};

export const businessHoursLabel = 'segunda a sexta, 09h30 as 18h00, com pausa de 13h00 as 14h30';
