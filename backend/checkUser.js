import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'junioryanata@gmail.com' }
  });
  console.log('User from DB:', user);
}

main().finally(() => prisma.$disconnect());
