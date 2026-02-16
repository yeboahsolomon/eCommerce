import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({ select: { name: true } });
  console.log('Categories:', categories.map(c => c.name).join(', '));
  await prisma.$disconnect();
}

main();
