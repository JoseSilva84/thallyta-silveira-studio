import prisma from '../config/prisma.js';
import { ensureBookingClientNotification } from '../services/whatsappService.js';

const bookingId = process.argv[2];

if (!bookingId) {
  console.error('Uso: node src/scripts/ensureClientBookingWhatsapp.js <bookingId>');
  process.exit(1);
}

try {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        select: { id: true, name: true, email: true, whatsappPhone: true },
      },
      payment: true,
    },
  });

  if (!booking) {
    console.error(`Agendamento nao encontrado: ${bookingId}`);
    process.exit(1);
  }

  if (['cancelled', 'no_show'].includes(booking.status)) {
    console.error(`Agendamento ${bookingId} esta com status ${booking.status}. Envio bloqueado.`);
    process.exit(1);
  }

  const result = await ensureBookingClientNotification(prisma, booking);
  console.log(JSON.stringify({
    bookingId,
    attendeeName: booking.attendeeName || booking.user?.name || null,
    attendeePhone: booking.attendeePhone || booking.user?.whatsappPhone || null,
    ...result,
  }, null, 2));
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
