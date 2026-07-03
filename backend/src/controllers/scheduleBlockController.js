import prisma from '../config/prisma.js';

const CAL_BASE = 'https://api.cal.com/v2';
const FORTALEZA_UTC_OFFSET_HOURS = 3;

function calHeaders() {
  return {
    'Content-Type': 'application/json',
    'cal-api-version': '2024-09-04',
    Authorization: `Bearer ${process.env.CAL_API_KEY}`,
  };
}

function parseLocalDateTime(date, time = '00:00') {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);

  if (!dateMatch || !timeMatch) {
    throw new Error('Data ou horario invalido.');
  }

  const [, year, month, day] = dateMatch;
  const [, hour, minute] = timeMatch;

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) + FORTALEZA_UTC_OFFSET_HOURS,
      Number(minute),
      0,
      0,
    ),
  );
}

function parseNextLocalMidnight(date) {
  const start = parseLocalDateTime(date, '00:00');
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

function publicBlock(block) {
  return {
    uid: block.id,
    start: block.start,
    end: block.end,
    allDay: block.allDay,
    reason: block.reason || '',
    createdAt: block.createdAt,
  };
}

function publicBookingWarning(booking) {
  return {
    id: booking.id,
    scheduledAt: booking.scheduledAt,
    endTime: booking.endTime,
    clientName: booking.attendeeName || booking.user?.name || 'Cliente',
    service: booking.service || '',
  };
}

async function findBookingsInBlockPeriod(start, end) {
  return prisma.booking.findMany({
    where: {
      status: {
        notIn: ['cancelled', 'no_show'],
      },
      scheduledAt: {
        lt: end,
      },
      OR: [
        {
          endTime: {
            gt: start,
          },
        },
        {
          endTime: null,
          scheduledAt: {
            gte: start,
          },
        },
      ],
    },
    select: {
      id: true,
      service: true,
      scheduledAt: true,
      endTime: true,
      attendeeName: true,
      user: {
        select: { name: true },
      },
    },
    orderBy: { scheduledAt: 'asc' },
  });
}

async function fetchLegacyCalBlocks() {
  if (!process.env.CAL_API_KEY) return [];

  try {
    const response = await fetch(`${CAL_BASE}/me/ooo`, {
      method: 'GET',
      headers: calHeaders(),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[scheduleBlock] Cal.com legacy listOoo error:', data);
      return [];
    }

    return (data?.data ?? []).map((item) => {
      const reason = item.notes ?? item.reason ?? '';
      return {
        uid: `cal:${item.id}`,
        start: item.start,
        end: item.end,
        allDay: true,
        reason: reason && reason !== 'unspecified' ? reason : 'Bloqueio antigo do Cal.com',
        createdAt: item.createdAt,
        legacyCalBlock: true,
      };
    });
  } catch (error) {
    console.error('[scheduleBlock] Cal.com legacy listOoo unexpected error:', error);
    return [];
  }
}

/**
 * GET /api/schedule-blocks
 * Lists schedule blocks stored by the site.
 */
export async function listScheduleBlocks(req, res) {
  try {
    const now = new Date();
    const blocks = await prisma.scheduleBlock.findMany({
      where: {
        end: {
          gte: now,
        },
      },
      orderBy: { start: 'asc' },
    });

    const legacyCalBlocks = await fetchLegacyCalBlocks();

    return res.json([...blocks.map(publicBlock), ...legacyCalBlocks]);
  } catch (error) {
    console.error('[scheduleBlock] listScheduleBlocks unexpected error:', error);
    return res.status(500).json({ error: 'Erro interno ao listar bloqueios.' });
  }
}

/**
 * POST /api/schedule-blocks
 *
 * Expected body:
 *   { date: "2026-06-20", allDay: true, reason: "Compromisso pessoal" }
 *   { date: "2026-06-20", allDay: false, startTime: "13:00", endTime: "17:00", reason: "..." }
 */
export async function createScheduleBlock(req, res) {
  const { date, allDay, startTime, endTime, reason } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Campo "date" e obrigatorio.' });
  }

  if (!allDay && (!startTime || !endTime)) {
    return res.status(400).json({ error: 'Para bloqueio parcial informe startTime e endTime.' });
  }

  let start;
  let end;

  try {
    start = allDay ? parseLocalDateTime(date, '00:00') : parseLocalDateTime(date, startTime);
    end = allDay ? parseNextLocalMidnight(date) : parseLocalDateTime(date, endTime);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  if (start >= end) {
    return res.status(400).json({ error: 'O horario de inicio deve ser anterior ao horario de fim.' });
  }

  try {
    const existingBookings = await findBookingsInBlockPeriod(start, end);
    if (existingBookings.length) {
      return res.status(409).json({
        error: 'Ha reserva no periodo selecionado.',
        bookingWarnings: existingBookings.map(publicBookingWarning),
      });
    }

    const block = await prisma.scheduleBlock.create({
      data: {
        start,
        end,
        allDay: Boolean(allDay),
        reason: reason?.trim() || null,
        createdById: req.user?.id || null,
      },
    });

    return res.status(201).json(publicBlock(block));
  } catch (error) {
    console.error('[scheduleBlock] createScheduleBlock unexpected error:', error);
    return res.status(500).json({ error: 'Erro interno ao criar bloqueio.' });
  }
}

/**
 * DELETE /api/schedule-blocks/:uid
 * Removes a site schedule block.
 */
export async function deleteScheduleBlock(req, res) {
  const { uid } = req.params;

  if (!uid) {
    return res.status(400).json({ error: 'UID do bloqueio e obrigatorio.' });
  }

  try {
    if (uid.startsWith('cal:')) {
      const calUid = uid.slice(4);
      const response = await fetch(`${CAL_BASE}/me/ooo/${calUid}`, {
        method: 'DELETE',
        headers: calHeaders(),
      });

      if (response.status === 204 || response.ok) {
        return res.json({ ok: true, uid });
      }

      const data = await response.json().catch(() => ({}));
      console.error('[scheduleBlock] Cal.com legacy deleteOoo error:', data);
      return res.status(response.status).json({
        error: data?.message || 'Erro ao remover bloqueio antigo do Cal.com.',
      });
    }

    await prisma.scheduleBlock.delete({ where: { id: uid } });
    return res.json({ ok: true, uid });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Bloqueio nao encontrado.' });
    }
    console.error('[scheduleBlock] deleteScheduleBlock unexpected error:', error);
    return res.status(500).json({ error: 'Erro interno ao remover bloqueio.' });
  }
}
