/**
 * scheduleBlockController.js
 *
 * Secure proxy for Cal.com API v2 Out of Office.
 * CAL_API_KEY stays only in the backend.
 */

const CAL_BASE = 'https://api.cal.com/v2';
const FORTALEZA_UTC_OFFSET_HOURS = 3;

function calHeaders() {
  return {
    'Content-Type': 'application/json',
    'cal-api-version': '2024-09-04',
    Authorization: `Bearer ${process.env.CAL_API_KEY}`,
  };
}

/**
 * Converts a Fortaleza local date/time to UTC ISO.
 * Example: date="2026-06-20", time="13:00" -> "2026-06-20T16:00:00.000Z"
 */
function toUtcIso(date, time = '00:00') {
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
  ).toISOString();
}

/**
 * GET /api/schedule-blocks
 * Lists all Cal.com Out of Office periods.
 */
export async function listScheduleBlocks(req, res) {
  try {
    const response = await fetch(`${CAL_BASE}/me/ooo`, {
      method: 'GET',
      headers: calHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[scheduleBlock] Cal.com listOoo error:', data);
      return res.status(response.status).json({
        error: data?.message || 'Erro ao buscar bloqueios no Cal.com.',
      });
    }

    const blocks = (data?.data ?? []).map((item) => ({
      uid: item.id,
      start: item.start,
      end: item.end,
      reason: item.notes ?? item.reason ?? '',
      createdAt: item.createdAt,
    }));

    return res.json(blocks);
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
    start = allDay ? toUtcIso(date, '00:00') : toUtcIso(date, startTime);
    end = allDay ? toUtcIso(date, '23:59') : toUtcIso(date, endTime);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  if (new Date(start) >= new Date(end)) {
    return res.status(400).json({ error: 'O horario de inicio deve ser anterior ao horario de fim.' });
  }

  const payload = { start, end };

  try {
    const response = await fetch(`${CAL_BASE}/me/ooo`, {
      method: 'POST',
      headers: calHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[scheduleBlock] Cal.com createOoo error:', data);
      return res.status(response.status).json({
        error: data?.message || 'Erro ao criar bloqueio no Cal.com.',
      });
    }

    const created = data?.data ?? data;
    return res.status(201).json({
      uid: created.id,
      start: created.start,
      end: created.end,
      reason: created.notes ?? created.reason ?? reason ?? '',
      createdAt: created.createdAt,
    });
  } catch (error) {
    console.error('[scheduleBlock] createScheduleBlock unexpected error:', error);
    return res.status(500).json({ error: 'Erro interno ao criar bloqueio.' });
  }
}

/**
 * DELETE /api/schedule-blocks/:uid
 * Removes a Cal.com Out of Office period.
 */
export async function deleteScheduleBlock(req, res) {
  const { uid } = req.params;

  if (!uid) {
    return res.status(400).json({ error: 'UID do bloqueio e obrigatorio.' });
  }

  try {
    const response = await fetch(`${CAL_BASE}/me/ooo/${uid}`, {
      method: 'DELETE',
      headers: calHeaders(),
    });

    if (response.status === 204 || response.ok) {
      return res.json({ ok: true, uid });
    }

    const data = await response.json().catch(() => ({}));
    console.error('[scheduleBlock] Cal.com deleteOoo error:', data);
    return res.status(response.status).json({
      error: data?.message || 'Erro ao remover bloqueio no Cal.com.',
    });
  } catch (error) {
    console.error('[scheduleBlock] deleteScheduleBlock unexpected error:', error);
    return res.status(500).json({ error: 'Erro interno ao remover bloqueio.' });
  }
}
