const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      name: {
        contains: 'Janaina',
        mode: 'insensitive',
      },
    },
    include: {
      birthdayRewards: true,
      bookingPayments: {
        orderBy: { createdAt: 'desc' },
        take: 3,
      }
    }
  });

  console.dir(users, { depth: null });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
