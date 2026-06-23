const STUDIO_TIME_ZONE = 'America/Fortaleza';

const FIXED_SLOTS = [
  { hour: 8, minute: 0 },   // 08:00
  { hour: 10, minute: 30 }, // 10:30
  { hour: 14, minute: 30 }, // 14:30
  { hour: 16, minute: 30 }, // 16:30
  { hour: 18, minute: 30 }, // 18:30
];
const FIXED_SLOT_MINUTES = new Set(FIXED_SLOTS.map(s => s.hour * 60 + s.minute));
const OPEN_MINUTES = 8 * 60;        // 08:00
const LAST_START_MINUTES = 18 * 60 + 30; // 18:30
const SLOT_INTERVAL_MINUTES = 30;
const MIN_CLIENT_LEAD_TIME_MINUTES = 120;
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
    return { valid: false, reason: 'O atendimento comeca a partir das 08h00.' };
  }

  if (!FIXED_SLOT_MINUTES.has(startLocal.minutes)) {
    return { valid: false, reason: 'Este horario nao esta disponivel para agendamento.' };
  }

  if (startLocal.minutes > LAST_START_MINUTES) {
    return { valid: false, reason: 'O ultimo horario disponivel para iniciar atendimento e 18h30.' };
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

export const buildPublicAgendaDays = (bookings, daysCount, nowInput = new Date(), slotDurationMinutes = SLOT_INTERVAL_MINUTES) => {
  const todayKey = getStudioDateTime(nowInput).dateKey;
  const minimumClientStart = new Date(nowInput.getTime() + MIN_CLIENT_LEAD_TIME_MINUTES * 60 * 1000);
  const candidateDurationMinutes = Math.max(Number(slotDurationMinutes) || SLOT_INTERVAL_MINUTES, SLOT_INTERVAL_MINUTES);

  return Array.from({ length: daysCount }, (_, index) => {
    const dateKey = addDaysToDateKey(todayKey, index);
    const dayDate = localSlotToDate(dateKey, 12 * 60);
    const localDay = getStudioDateTime(dayDate);
    const isBusinessDay = BUSINESS_WEEKDAYS.has(localDay.weekday);
    const dayBookings = bookings.filter((booking) => getStudioDateTime(new Date(booking.scheduledAt)).dateKey === dateKey);
    const availableSlots = [];

    if (isBusinessDay) {
      for (const { hour, minute } of FIXED_SLOTS) {
        const minutes = hour * 60 + minute;
        const slotStart = localSlotToDate(dateKey, minutes);
        const slotEnd = new Date(slotStart.getTime() + candidateDurationMinutes * 60 * 1000);

        if (slotStart <= minimumClientStart) continue;
        if (!validateBookingWindow(slotStart, slotEnd).valid) continue;
        if (dayBookings.some((booking) => bookingOverlapsSlot(booking, slotStart, slotEnd))) continue;

        availableSlots.push({
          time: minutesToTime(minutes),
          start: slotStart.toISOString(),
        });
      }
    }

    return {
      date: dateKey,
      isBusinessDay,
      availableSlots,
    };
  });
};

export const businessHoursLabel = 'segunda a sexta, 08:00 às 19:00';
