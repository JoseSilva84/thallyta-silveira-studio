import prisma from '../config/prisma.js';

/**
 * GET /api/bookings
 * Admin: retorna todos os agendamentos.
 * Client: retorna apenas os agendamentos do próprio usuário.
 */
export const getBookings = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const where = isAdmin ? {} : { userId: req.user.id };

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
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
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    // Se não é admin, só pode ver os próprios bookings
    if (req.user.role !== 'ADMIN' && booking.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamento.' });
  }
};
