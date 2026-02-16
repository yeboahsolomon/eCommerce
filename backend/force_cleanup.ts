import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Force Cleanup...');
  
  try {
    const allCategories = await prisma.category.findMany();
    console.log(`Found ${allCategories.length} total categories.`);
    
    const toDelete = allCategories.filter(c => {
      const name = c.name.toLowerCase();
      const slug = (c.slug || '').toLowerCase();
      // Aggressive matching
      return name.includes('test') || slug.includes('test') || name.includes('catego') && !name.includes('categories'); 
      // Note: 'catego' matches 'Test Category'. 'Categories' is safe (e.g. 'All Categories' if it existed).
      // Actually, legitimate categories: Electronics, Fashion, etc. None have 'test'.
    });
    
    console.log(`Identified ${toDelete.length} suspicious categories:`);
    toDelete.forEach(c => console.log(` - [${c.id}] ${c.name} (${c.slug})`));

    if (toDelete.length > 0) {
      for (const cat of toDelete) {
        console.log(`Deleting category [${cat.id}]...`);
        try {
          await prisma.category.delete({ where: { id: cat.id } });
          console.log(`  ✅ Deleted.`);
        } catch (e) {
          console.error(`  ❌ Failed to delete [${cat.id}]:`, e);
          // Try deleting related products first? Cascading delete might be missing.
          // Check for products in this category
           const products = await prisma.product.findMany({ where: { categoryId: cat.id } });
           if (products.length > 0) {
             console.log(`    Found ${products.length} products in this category. Deleting them first...`);
             await prisma.product.deleteMany({ where: { categoryId: cat.id } });
             console.log(`    Deleted products. Retrying category delete...`);
             await prisma.category.delete({ where: { id: cat.id } });
             console.log(`    ✅ Category deleted after products.`);
           }
        }
      }
    } else {
      console.log('No suspicious categories found.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
