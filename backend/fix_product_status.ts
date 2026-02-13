
import prisma from './src/config/database';

async function main() {
  try {
    console.log('--- Activating Products ---');
    const result = await prisma.product.updateMany({
      where: { isActive: false },
      data: { isActive: true }
    });
    console.log(`Activated ${result.count} products.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
