const STUDIO_TIME_ZONE = 'America/Fortaleza';

const OPEN_MINUTES = 9 * 60 + 30;
const LUNCH_START_MINUTES = 13 * 60;
const LUNCH_END_MINUTES = 14 * 60 + 30;
const CLOSE_MINUTES = 18 * 60;
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

  return { valid: true };
};

export const businessHoursLabel = 'segunda a sexta, 09h30 as 18h00, com pausa de 13h00 as 14h30';
