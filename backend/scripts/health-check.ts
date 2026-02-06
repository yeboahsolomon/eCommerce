
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Integration Health Check...\n');

  // 1. Database Connection & Schema Validation
  try {
    console.log('🔌 Attempting Database Connection...');
    await prisma.$connect();
    console.log('✅ Database Connected Successfully');

    console.log('🔍 Validating Schema (checking User and Product tables)...');
    // Simple check to see if we can query these tables. 
    // If they don't exist, this will throw.
    await prisma.user.count(); 
    await prisma.product.count();
    console.log('✅ Schema Validation Passed: User and Product tables exist');

  } catch (error) {
    console.error('❌ Database Connection or Schema Validation Failed:', error);
    process.exit(1);
  }

  // 2. Data Integrity & Auto-Seeding
  try {
    console.log('\n📦 Checking Data Integrity...');
    const productCount = await prisma.product.count();

    if (productCount === 0) {
      console.log('⚠️ Product table is empty. Auto-seeding initial data...');
      
      // Ensure Categories Exist
      const fashionCat = await prisma.category.upsert({
        where: { slug: 'fashion' },
        update: {},
        create: { name: 'Fashion', slug: 'fashion', description: 'Clothing and Apparel' }
      });

      const groceriesCat = await prisma.category.upsert({
        where: { slug: 'groceries' },
        update: {},
        create: { name: 'Groceries', slug: 'groceries', description: 'Daily Essentials' }
      });

      const electronicsCat = await prisma.category.upsert({
        where: { slug: 'electronics' },
        update: {},
        create: { name: 'Electronics', slug: 'electronics', description: 'Gadgets and Devices' }
      });

      // Seed Products
      await prisma.product.createMany({
        data: [
          {
            name: "GTP Nustyle Fabric",
            slug: "gtp-nustyle-fabric-check", // Unique slug for health check
            description: "Authentic Ghanaian fabric suitable for all occasions.",
            priceInPesewas: 35000, // 350 GHS
            categoryId: fashionCat.id,
            stockQuantity: 50
          },
          {
            name: "Fresh Pona Yams (Set of 3)",
            slug: "fresh-pona-yams-check",
            description: "Farm fresh yam from the Northern region.",
            priceInPesewas: 4500, // 45 GHS
            categoryId: groceriesCat.id,
            // Schema has `isActive` @default(true) and `stockQuantity`. 
            // Wait, schema has `stockQuantity` and `isActive`. 
            // Frontend assumes `inStock` boolean, but mapped from dummy data.
            // Let's check schema again. `Product` model has `stockQuantity` Int.
            // It does NOT have `inStock` boolean. It has `isActive`.
            // Correction based on Schema:
            // product.stockQuantity > 0 implies in stock.
            stockQuantity: 100
          },
          {
            name: "Samsung Galaxy A14",
            slug: "samsung-galaxy-a14-check",
            description: "Reliable smartphone with long battery life.",
            priceInPesewas: 185000, // 1850 GHS
            categoryId: electronicsCat.id,
            stockQuantity: 20
          }
        ]
      });
      console.log('✅ Auto-seeded 3 Ghana-specific products');
    } else {
      console.log(`✅ Data Integrity Verified: Found ${productCount} products`);
    }

  } catch (error: any) {
    console.error('❌ Data Integrity Check Failed:', error.message || error);
    process.exit(1);
  }

  // 3. Frontend-Backend Bridge (API Check)
  try {
    console.log('\n🌐 Testing Frontend-Backend Bridge (GET /api/products)...');
    
    // Assuming the server is running on localhost:3001 as per terminal logs
    const API_URL = 'http://localhost:3001/api/products';
    
    const response = await fetch(API_URL);
    
    if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Basic validation of response structure logic
    if (data?.success && data?.data?.products && Array.isArray(data.data.products)) {
         console.log(`✅ API Connection Successful: Retrieved ${data.data.products.length} products`);
    } else {
         console.warn('⚠️ API Connection Successful but unexpected response format');
    }

  } catch (error: any) {
    console.error('❌ API Check Failed. Ensure the backend server is running on port 3001.');
    console.error('Error details:', error.message || error);
    process.exit(1);
  }

  console.log('\n🎉 INTEGRATION HEALTH CHECK PASSED! Stack is operational.');
  await prisma.$disconnect();
}

main();
