import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Migrating ADMIN users to SUPERADMIN...');
  const result = await prisma.user.updateMany({
    where: {
      role: 'ADMIN',
    },
    data: {
      role: 'SUPERADMIN',
    },
  });
  console.log(`Updated ${result.count} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
