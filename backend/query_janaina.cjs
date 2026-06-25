const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgres://postgres:UPDhZz9EpZQhVw3g4YCpDg8xoF6abOUkvX9Tmadd0Ju5claU10i5CD0sP8rS3fAB@byxe87w8y3vtoznp8m7buk7e:5432/postgres?sslmode=require'
    }
  }
});

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
