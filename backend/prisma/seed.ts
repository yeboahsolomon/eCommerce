import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');
  
  // ==================== CATEGORIES ====================
  console.log('📁 Creating categories...');
  
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'fashion' },
      update: {},
      create: { name: 'Fashion', slug: 'fashion' },
    }),
    prisma.category.upsert({
      where: { slug: 'electronics' },
      update: {},
      create: { name: 'Electronics', slug: 'electronics' },
    }),
    prisma.category.upsert({
      where: { slug: 'groceries' },
      update: {},
      create: { name: 'Groceries', slug: 'groceries' },
    }),
    prisma.category.upsert({
      where: { slug: 'home-kitchen' },
      update: {},
      create: { name: 'Home & Kitchen', slug: 'home-kitchen' },
    }),
  ]);
  
  console.log(`   ✓ Created ${categories.length} categories\n`);
  
  // ==================== ADMIN USER ====================
  console.log('👤 Creating admin user...');
  
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ghanamarket.com' },
    update: {},
    create: {
      email: 'admin@ghanamarket.com',
      password: hashedPassword,
      fullName: 'Admin User',
      phone: '0244123456',
      role: 'ADMIN',
    },
  });
  
  console.log(`   ✓ Admin user created: ${adminUser.email}\n`);
  
  // ==================== PRODUCTS ====================
  console.log('📦 Creating products...');
  
  const products = [
    {
      name: 'GTP Nustyle Fabric - Traditional Print (6 Yards)',
      slug: 'gtp-nustyle-fabric-traditional-print',
      description: 'Beautiful traditional African print fabric, perfect for any occasion. Made with high-quality materials.',
      price: 350,
      originalPrice: 400,
      image: 'https://images.unsplash.com/photo-1616682760884-21915db74026?q=80&w=800&auto=format&fit=crop',
      categoryId: categories[0].id,
      rating: 4.8,
      inStock: true,
      stockQuantity: 50,
    },
    {
      name: 'Samsung Galaxy A14 (64GB) - Black',
      slug: 'samsung-galaxy-a14-64gb-black',
      description: 'Powerful smartphone with great camera and long battery life. Perfect for daily use.',
      price: 1850,
      image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?q=80&w=800&auto=format&fit=crop',
      categoryId: categories[1].id,
      rating: 4.5,
      inStock: true,
      stockQuantity: 25,
    },
    {
      name: 'Fresh Pona Yams (Medium Size) - Set of 3',
      slug: 'fresh-pona-yams-medium-set-3',
      description: 'Fresh locally-sourced Pona yams, known for their delicious taste and quality.',
      price: 45,
      image: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?q=80&w=800&auto=format&fit=crop',
      categoryId: categories[2].id,
      rating: 4.9,
      inStock: true,
      stockQuantity: 100,
    },
    {
      name: 'Binatone Blender with Grinder - 1.5L',
      slug: 'binatone-blender-grinder-1-5l',
      description: 'High-performance blender with grinder attachment. Perfect for smoothies and food prep.',
      price: 420,
      originalPrice: 500,
      image: 'https://images.unsplash.com/photo-1570222094114-28a9d88a2b64?q=80&w=800&auto=format&fit=crop',
      categoryId: categories[3].id,
      rating: 4.2,
      inStock: true,
      stockQuantity: 15,
    },
    {
      name: 'Kente Cloth - Premium Handwoven',
      slug: 'kente-cloth-premium-handwoven',
      description: 'Authentic handwoven Kente cloth from skilled Ghanaian artisans.',
      price: 1200,
      originalPrice: 1500,
      image: 'https://images.unsplash.com/photo-1590735213920-68192a487bc2?q=80&w=800&auto=format&fit=crop',
      categoryId: categories[0].id,
      rating: 5.0,
      inStock: true,
      stockQuantity: 10,
    },
    {
      name: 'JBL Bluetooth Speaker - Portable',
      slug: 'jbl-bluetooth-speaker-portable',
      description: 'Powerful portable Bluetooth speaker with excellent sound quality.',
      price: 650,
      image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?q=80&w=800&auto=format&fit=crop',
      categoryId: categories[1].id,
      rating: 4.6,
      inStock: true,
      stockQuantity: 30,
    },
  ];
  
  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
  }
  
  console.log(`   ✓ Created ${products.length} products\n`);
  
  // ==================== SUMMARY ====================
  console.log('═'.repeat(50));
  console.log('✅ Database seeded successfully!\n');
  console.log('📊 Summary:');
  console.log(`   • Categories: ${categories.length}`);
  console.log(`   • Products: ${products.length}`);
  console.log(`   • Admin User: admin@ghanamarket.com / admin123`);
  console.log('═'.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
