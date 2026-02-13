
import app from './src/index'; // Import app to test routes directly? No, hard to do with running server.
// Better to just fetch from the running server if possible, or use the database directly to simulate the query logic.
// Accessing the database directly to simulate the query exactly as the route does is safer/easier than making HTTP requests if I don't have a fetch polyfill guaranteed (though node 18+ has it).
// Let's use the DB query logic from `products.routes.ts` directly.

import prisma from './src/config/database';

async function main() {
  try {
    console.log('--- Simulating Homepage Query ---');
    
    const limit = 8;
    const sortBy = 'createdAt';
    const order = 'desc';

    const where: any = {
      isActive: true, // Route sets this hardcoded
    };

    // The frontend call: api.getProducts({ limit: 8, sortBy: 'createdAt', order: 'desc' })
    // No 'featured' param is passed, so it should NOT be in 'where'

    console.log('Query "where":', JSON.stringify(where, null, 2));
    console.log('Query "orderBy":', { [sortBy]: order });

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 5,
        },
      },
      orderBy: { [sortBy]: order },
      take: limit,
    });

    console.log(`Found ${products.length} products.`);
    products.forEach(p => {
      console.log(`- [${p.id}] ${p.name} | Active: ${p.isActive} | Created: ${p.createdAt.toISOString()}`);
    });
    
    // Check if the specific product we know exists is in this list
    const target = products.find(p => p.name === 'Ronan Moody');
    if (target) {
        console.log("✅ Target product 'Ronan Moody' IS in the result set.");
    } else {
        console.log("❌ Target product 'Ronan Moody' is NOT in the result set.");
        
        // Find it to see why
        const actual = await prisma.product.findFirst({ where: { name: 'Ronan Moody' } });
        console.log("Actual product state:", actual);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
