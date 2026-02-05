import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper: Convert cedis to pesewas
const toPesewas = (cedis: number) => Math.round(cedis * 100);

async function main() {
  console.log('🌱 Starting database seed...\n');
  
  // ==================== CATEGORIES ====================
  console.log('📁 Creating categories with hierarchy...');
  
  // Parent categories
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: { 
      name: 'Electronics', 
      slug: 'electronics',
      description: 'Phones, laptops, gadgets and more',
    },
  });

  const fashion = await prisma.category.upsert({
    where: { slug: 'fashion' },
    update: {},
    create: { 
      name: 'Fashion', 
      slug: 'fashion',
      description: 'Clothing, shoes, and accessories',
    },
  });

  const groceries = await prisma.category.upsert({
    where: { slug: 'groceries' },
    update: {},
    create: { 
      name: 'Groceries', 
      slug: 'groceries',
      description: 'Fresh food and household essentials',
    },
  });

  const homeKitchen = await prisma.category.upsert({
    where: { slug: 'home-kitchen' },
    update: {},
    create: { 
      name: 'Home & Kitchen', 
      slug: 'home-kitchen',
      description: 'Appliances and home essentials',
    },
  });

  // Child categories (hierarchy example)
  const phones = await prisma.category.upsert({
    where: { slug: 'phones' },
    update: {},
    create: {
      name: 'Phones',
      slug: 'phones',
      parentId: electronics.id,
      description: 'Smartphones and feature phones',
    },
  });

  const traditionalWear = await prisma.category.upsert({
    where: { slug: 'traditional-wear' },
    update: {},
    create: {
      name: 'Traditional Wear',
      slug: 'traditional-wear',
      parentId: fashion.id,
      description: 'Kente, African prints, and traditional attire',
    },
  });

  console.log(`   ✓ Created 6 categories (4 parent, 2 child)\n`);
  
  // ==================== ADMIN USER ====================
  console.log('👤 Creating admin user...');
  
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ghanamarket.com' },
    update: {},
    create: {
      email: 'admin@ghanamarket.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: '0244123456',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
    },
  });

  // Create cart for admin
  await prisma.cart.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id },
  });

  console.log(`   ✓ Admin user created: ${adminUser.email}\n`);

  // ==================== SAMPLE BUYER ====================
  console.log('👤 Creating sample buyer...');
  
  const buyerPassword = await bcrypt.hash('buyer123', 12);
  
  const buyerUser = await prisma.user.upsert({
    where: { email: 'kofi@example.com' },
    update: {},
    create: {
      email: 'kofi@example.com',
      password: buyerPassword,
      firstName: 'Kofi',
      lastName: 'Mensah',
      phone: '0551234567',
      role: 'BUYER',
      status: 'ACTIVE',
      addresses: {
        create: [
          {
            label: 'Home',
            type: 'HOME',
            fullName: 'Kofi Mensah',
            phone: '0551234567',
            region: 'Greater Accra',
            city: 'Accra',
            area: 'East Legon',
            streetAddress: 'Near the Shell Station, House No. 42',
            gpsAddress: 'GA-183-8164',
            isDefault: true,
          },
          {
            label: 'Office',
            type: 'WORK',
            fullName: 'Kofi Mensah',
            phone: '0551234567',
            region: 'Greater Accra',
            city: 'Accra',
            area: 'Airport City',
            streetAddress: 'One Airport Square, 5th Floor',
            isDefault: false,
          },
        ],
      },
    },
  });

  // Create cart for buyer
  await prisma.cart.upsert({
    where: { userId: buyerUser.id },
    update: {},
    create: { userId: buyerUser.id },
  });

  console.log(`   ✓ Buyer created: ${buyerUser.email} with 2 addresses\n`);
  
  // ==================== PRODUCTS (Prices in Pesewas) ====================
  console.log('📦 Creating products...');
  
  const products = [
    {
      name: 'GTP Nustyle Fabric - Traditional Print (6 Yards)',
      slug: 'gtp-nustyle-fabric-traditional-print',
      description: 'Beautiful traditional African print fabric, perfect for any occasion. Made with high-quality materials.',
      priceInPesewas: toPesewas(350),      // ₵350.00
      comparePriceInPesewas: toPesewas(400),  // ₵400.00
      categoryId: traditionalWear.id,
      stockQuantity: 50,
      sku: 'GTP-FAB-001',
      averageRating: 4.8,
      reviewCount: 24,
      isActive: true,
      isFeatured: true,
    },
    {
      name: 'Samsung Galaxy A14 (64GB) - Black',
      slug: 'samsung-galaxy-a14-64gb-black',
      description: 'Powerful smartphone with great camera and long battery life. Perfect for daily use.',
      priceInPesewas: toPesewas(1850),   // ₵1,850.00
      categoryId: phones.id,
      stockQuantity: 25,
      sku: 'SAM-A14-64B',
      averageRating: 4.5,
      reviewCount: 87,
      isActive: true,
      isFeatured: true,
    },
    {
      name: 'Fresh Pona Yams (Medium Size) - Set of 3',
      slug: 'fresh-pona-yams-medium-set-3',
      description: 'Fresh locally-sourced Pona yams, known for their delicious taste and quality.',
      priceInPesewas: toPesewas(45),      // ₵45.00
      categoryId: groceries.id,
      stockQuantity: 100,
      sku: 'GRO-YAM-003',
      averageRating: 4.9,
      reviewCount: 156,
      isActive: true,
    },
    {
      name: 'Binatone Blender with Grinder - 1.5L',
      slug: 'binatone-blender-grinder-1-5l',
      description: 'High-performance blender with grinder attachment. Perfect for smoothies and food prep.',
      priceInPesewas: toPesewas(420),     // ₵420.00
      comparePriceInPesewas: toPesewas(500), // ₵500.00
      categoryId: homeKitchen.id,
      stockQuantity: 15,
      sku: 'BIN-BLD-001',
      averageRating: 4.2,
      reviewCount: 45,
      isActive: true,
    },
    {
      name: 'Kente Cloth - Premium Handwoven',
      slug: 'kente-cloth-premium-handwoven',
      description: 'Authentic handwoven Kente cloth from skilled Ghanaian artisans.',
      priceInPesewas: toPesewas(1200),    // ₵1,200.00
      comparePriceInPesewas: toPesewas(1500), // ₵1,500.00
      categoryId: traditionalWear.id,
      stockQuantity: 10,
      sku: 'KNT-PRE-001',
      averageRating: 5.0,
      reviewCount: 32,
      isActive: true,
      isFeatured: true,
    },
    {
      name: 'JBL Bluetooth Speaker - Portable',
      slug: 'jbl-bluetooth-speaker-portable',
      description: 'Powerful portable Bluetooth speaker with excellent sound quality.',
      priceInPesewas: toPesewas(650),     // ₵650.00
      categoryId: electronics.id,
      stockQuantity: 30,
      sku: 'JBL-SPK-001',
      averageRating: 4.6,
      reviewCount: 78,
      isActive: true,
    },
  ];
  
  for (const product of products) {
    const created = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });

    // Add a sample image for each product
    await prisma.productImage.upsert({
      where: { id: `img-${created.id}` },
      update: {},
      create: {
        id: `img-${created.id}`,
        productId: created.id,
        url: `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000000)}?w=800`,
        isPrimary: true,
        sortOrder: 0,
      },
    });
  }
  
  console.log(`   ✓ Created ${products.length} products with images\n`);

  // ==================== SAMPLE COUPON ====================
  console.log('🎟️ Creating sample coupon...');
  
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      discountType: 'percentage',
      discountValue: 10,  // 10% off
      minOrderInPesewas: toPesewas(50),  // Min ₵50 order
      maxDiscountInPesewas: toPesewas(100),  // Max ₵100 discount
      usageLimit: 1000,
      isActive: true,
    },
  });

  console.log(`   ✓ Created WELCOME10 coupon (10% off)\n`);
  
  // ==================== SUMMARY ====================
  console.log('═'.repeat(50));
  console.log('✅ Database seeded successfully!\n');
  console.log('📊 Summary:');
  console.log(`   • Categories: 6 (with hierarchy)`);
  console.log(`   • Products: ${products.length} (prices in pesewas)`);
  console.log(`   • Admin: admin@ghanamarket.com / admin123`);
  console.log(`   • Buyer: kofi@example.com / buyer123 (with 2 addresses)`);
  console.log(`   • Coupon: WELCOME10 (10% off)`);
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
