
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating full-text search index on Product table...');
  
  // Drop index if exists to avoid errors on re-run
  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS product_search_idx;`);

  // Create GIN index on name and description
  // Using 'english' configuration for now. 
  // Ideally, we might want simple dictionary or custom one for product names.
  await prisma.$executeRawUnsafe(`
    CREATE INDEX product_search_idx ON "Product" USING GIN (to_tsvector('english', name || ' ' || coalesce(description, '')));
  `);

  console.log('Index created successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
