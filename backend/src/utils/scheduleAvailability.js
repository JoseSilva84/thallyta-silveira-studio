const ACTIVE_BOOKING_STATUSES_TO_IGNORE = ['cancelled', 'no_show'];
const ACTIVE_HOLD_STATUSES = ['pending', 'approved'];

export const findConfirmedScheduleConflict = async (prisma, start, end) => {
  return prisma.booking.findFirst({
    where: {
      status: {
        notIn: ACTIVE_BOOKING_STATUSES_TO_IGNORE,
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
    select: { id: true, calEventId: true },
  });
};

export const findActivePaymentHoldConflict = async (prisma, start, end, { excludePaymentId = null, now = new Date() } = {}) => {
  return prisma.bookingPayment.findFirst({
    where: {
      ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
      booking: null,
      status: {
        in: ACTIVE_HOLD_STATUSES,
      },
      holdExpiresAt: {
        gt: now,
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
    select: { id: true, userId: true, status: true, approvedAt: true, createdAt: true },
  });
};

export const hasScheduleConflict = async (prisma, start, end, options = {}) => {
  const bookingConflict = await findConfirmedScheduleConflict(prisma, start, end);
  if (bookingConflict) return true;

  const holdConflict = await findActivePaymentHoldConflict(prisma, start, end, options);
  return Boolean(holdConflict);
};
