/**
 * calService.js
 *
 * Proxy for Cal.com API v2 – booking creation.
 * Keeps CAL_API_KEY on the server side only.
 */

const CAL_BASE = 'https://api.cal.com/v2';

function calHeaders() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'cal-api-version': process.env.CAL_API_VERSION || '2026-02-25',
    Authorization: `Bearer ${process.env.CAL_API_KEY}`,
  };
}

const stringifyCalError = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const normalizePhoneNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;
  return `+${digits.startsWith('55') ? digits : `55${digits}`}`;
};

const normalizeMetadata = (metadata) => Object.fromEntries(
  Object.entries(metadata || {}).map(([key, value]) => [key, value == null ? '' : String(value)]),
);

/**
 * Creates a booking on Cal.com via the API v2.
 *
 * @param {object} opts
 * @param {string} opts.eventTypeSlug  Cal.com event-type slug (e.g. 'servicos-gerais')
 * @param {string} opts.start          ISO-8601 UTC start time
 * @param {string} opts.attendeeName   Client name
 * @param {string} opts.attendeeEmail  Client email (fallback generated if empty)
 * @param {string} [opts.notes]        Booking notes (service info, phone, etc.)
 * @param {object} [opts.metadata]     Extra metadata for the booking
 * @returns {{ uid: string, startTime: string, endTime: string|null }}
 */
export async function createCalBooking({
  eventTypeSlug,
  start,
  attendeeName,
  attendeeEmail,
  attendeePhone,
  notes,
  metadata = {},
  adminCreated = true,
  lengthInMinutes,
}) {
  const username = process.env.CAL_USERNAME;
  if (!username) throw new Error('CAL_USERNAME nao configurado no .env.');

  const phoneNumber = normalizePhoneNumber(attendeePhone);
  const body = {
    start,
    eventTypeSlug,
    username,
    attendee: {
      name: attendeeName,
      email: attendeeEmail || `manual+${Date.now()}@studio.local`,
      timeZone: 'America/Fortaleza',
      ...(phoneNumber ? { phoneNumber } : {}),
    },
    metadata: normalizeMetadata({ ...metadata, adminCreated }),
    allowConflicts: true,
    allowBookingOutOfBounds: true,
  };

  if (lengthInMinutes) {
    body.lengthInMinutes = lengthInMinutes;
  }

  console.log('[calService] Criando booking no Cal.com:', { eventTypeSlug, start, attendeeName });

  const response = await fetch(`${CAL_BASE}/bookings`, {
    method: 'POST',
    headers: calHeaders(),
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[calService] Cal.com createBooking error:', JSON.stringify(data));
    throw new Error(stringifyCalError(data?.message || data?.error || data) || `Cal.com retornou HTTP ${response.status}`);
  }

  const booking = data?.data ?? data;
  return {
    uid: booking.uid || booking.id?.toString(),
    startTime: booking.start || booking.startTime,
    endTime: booking.end || booking.endTime || null,
  };
}
