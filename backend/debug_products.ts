
import prisma from './src/config/database';

async function main() {
  try {
    console.log('--- Connecting to DB ---');
    const products = await prisma.product.findMany({
      include: {
        seller: {
          include: {
            user: {
              select: { email: true }
            }
          }
        }
      }
    });

    console.log(`Found ${products.length} products.`);
    products.forEach(p => {
      console.log(`- [${p.id}] ${p.name} | Active: ${p.isActive} | Stock: ${p.stockQuantity} | Seller: ${p.seller?.user?.email}`);
    });

    if (products.length === 0) {
      console.log('No products found in the database.');
    }

  } catch (error) {
    console.error('Error querying DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
