import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Identifying Test Categories...');
  
  try {
    const toDelete = await prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: 'Test Category' } },
          { slug: { contains: 'test-category' } }
        ]
      },
      select: { id: true, name: true }
    });
    
    console.log(`Found ${toDelete.length} categories to delete:`);
    toDelete.forEach(c => console.log(` - [${c.id}] ${c.name}`));

    if (toDelete.length > 0) {
      const ids = toDelete.map(c => c.id);
      const { count } = await prisma.category.deleteMany({
        where: { id: { in: ids } }
      });
      console.log(`✅ Successfully deleted ${count} categories.`);
    } else {
      console.log('No test categories found.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
