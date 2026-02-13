
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const products = await prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
      },
    });

    console.log('--- Recent Products ---');
    products.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`Name: ${p.name}`);
      console.log(`Images Count: ${p.images.length}`);
      p.images.forEach(img => {
        console.log(` - Image ID: ${img.id}`);
        console.log(` - URL: ${img.url}`);
        console.log(` - Is Primary: ${img.isPrimary}`);
      });
      console.log('-----------------------');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
