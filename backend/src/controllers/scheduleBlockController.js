/**
 * scheduleBlockController.js
 *
 * Proxy seguro para a API v2 do Cal.com — Out of Office.
 * A CAL_API_KEY fica exclusivamente no backend; o frontend nunca a vê.
 *
 * Endpoints do Cal.com utilizados:
 *   GET    https://api.cal.com/v2/me/ooo          — lista períodos de ausência
 *   POST   https://api.cal.com/v2/me/ooo          — cria um período de ausência
 *   DELETE https://api.cal.com/v2/me/ooo/:uid     — remove um período de ausência
 */

const CAL_BASE = 'https://api.cal.com/v2';
const STUDIO_TZ = 'America/Fortaleza'; // UTC-3

/** Monta os headers padrão para chamar a API do Cal.com */
function calHeaders() {
  return {
    'Content-Type': 'application/json',
    'cal-api-version': '2024-09-04',
    Authorization: `Bearer ${process.env.CAL_API_KEY}`,
  };
}

/**
 * Converte uma data local (America/Fortaleza) + horário em string ISO 8601 UTC.
 * Exemplo: date="2026-06-20", time="13:00" → "2026-06-20T16:00:00.000Z"
 */
function toUtcIso(date, time = '00:00') {
  // Monta a data/hora como se fosse no fuso do studio e converte para UTC
  const localStr = `${date}T${time}:00`;
  // Usamos Intl para obter o offset do fuso em minutos
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(localStr));

  const get = (type) => parts.find((p) => p.type === type)?.value;

  // Reconstrói em ISO a partir das partes já no fuso correto
  const reconstructed = new Date(
    `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`,
  );

  // Calcula o offset do fuso (diferença entre UTC "bruto" e local)
  const utcGuess = new Date(localStr);
  const offsetMs = utcGuess - reconstructed;
  const corrected = new Date(utcGuess.getTime() + offsetMs);

  return corrected.toISOString();
}

/**
 * GET /api/schedule-blocks
 * Lista todos os períodos de Out of Office no Cal.com.
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

    // Normaliza a resposta para o frontend
    const blocks = (data?.data ?? []).map((item) => ({
      uid: item.uid ?? item.id,
      start: item.start,
      end: item.end,
      reason: item.reason ?? item.notes ?? '',
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
 * Cria um período de Out of Office no Cal.com.
 *
 * Body esperado:
 *   { date: "2026-06-20", allDay: true, reason: "Compromisso pessoal" }
 *   { date: "2026-06-20", allDay: false, startTime: "13:00", endTime: "17:00", reason: "..." }
 */
export async function createScheduleBlock(req, res) {
  const { date, allDay, startTime, endTime, reason } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Campo "date" é obrigatório.' });
  }

  if (!allDay && (!startTime || !endTime)) {
    return res.status(400).json({ error: 'Para bloqueio parcial informe startTime e endTime.' });
  }

  // Monta início e fim em UTC
  const start = allDay ? toUtcIso(date, '00:00') : toUtcIso(date, startTime);
  const end = allDay ? toUtcIso(date, '23:59') : toUtcIso(date, endTime);

  if (new Date(start) >= new Date(end)) {
    return res.status(400).json({ error: 'O horário de início deve ser anterior ao horário de fim.' });
  }

  const payload = {
    start,
    end,
    notes: reason || 'Bloqueio de agenda',
    // reason é um enum no Cal.com — usamos "other" para manter genérico
    reason: 'other',
  };

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
      uid: created.uid ?? created.id,
      start: created.start,
      end: created.end,
      reason: created.notes ?? reason ?? '',
      createdAt: created.createdAt,
    });
  } catch (error) {
    console.error('[scheduleBlock] createScheduleBlock unexpected error:', error);
    return res.status(500).json({ error: 'Erro interno ao criar bloqueio.' });
  }
}

/**
 * DELETE /api/schedule-blocks/:uid
 * Remove um período de Out of Office do Cal.com.
 */
export async function deleteScheduleBlock(req, res) {
  const { uid } = req.params;

  if (!uid) {
    return res.status(400).json({ error: 'UID do bloqueio é obrigatório.' });
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
