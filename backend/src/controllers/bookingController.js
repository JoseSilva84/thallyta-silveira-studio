import prisma from '../config/prisma.js';

/**
 * GET /api/bookings
 * Admin: retorna todos os agendamentos.
 * Client: retorna apenas os agendamentos do próprio usuário.
 */
export const getBookings = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const where = isAdmin
      ? {}
      : {
          OR: [
            { userId: req.user.id },
            { attendeeEmail: req.user.email },
          ],
        };

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, whatsappPhone: true },
        },
      },
    });

    res.json(bookings);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos.' });
  }
};

/**
 * GET /api/bookings/:id
 * Detalhes de um booking específico.
 * Admin: pode ver qualquer booking.
 * Client: só vê se for dele.
 */
export const getBookingById = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, whatsappPhone: true },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    // Se não é admin, só pode ver os próprios bookings
    if (!canAccessBooking(req, booking)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamento.' });
  }
};

const canAccessBooking = (req, booking) => {
  if (req.user.role === 'ADMIN') return true;
  return booking.userId === req.user.id || booking.attendeeEmail === req.user.email;
};

const cancelOnCal = async (booking) => {
  const apiKey = process.env.CAL_API_KEY;
  if (!apiKey || !booking.calEventId) return { skipped: true };

  const response = await fetch(`https://api.cal.com/v2/bookings/${booking.calEventId}/cancel`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'cal-api-version': process.env.CAL_API_VERSION || '2026-02-25',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      cancellationReason: 'Cancelado pelo cliente no site.',
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || 'Falha ao cancelar no Cal.com.');
  }

  return { skipped: false };
};

/**
 * POST /api/bookings/:id/cancel
 * Cliente: cancela apenas os prÃ³prios agendamentos futuros.
 * Admin: pode cancelar qualquer agendamento futuro.
 */
export const cancelBooking = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Agendamento nao encontrado.' });
    }

    if (!canAccessBooking(req, booking)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(409).json({ error: 'Este agendamento ja esta cancelado.' });
    }

    if (booking.scheduledAt < new Date()) {
      return res.status(400).json({ error: 'Nao e possivel cancelar um agendamento que ja passou.' });
    }

    try {
      await cancelOnCal(booking);
    } catch (error) {
      console.error('Erro ao cancelar no Cal.com:', error);
      return res.status(502).json({ error: 'Nao foi possivel cancelar no calendario. Tente novamente.' });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'cancelled',
        notes: [booking.notes, 'Cancelado pelo cliente no site.'].filter(Boolean).join('\n'),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    res.status(500).json({ error: 'Erro ao cancelar agendamento.' });
  }
};
