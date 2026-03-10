const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SELLER_EMAIL = 'jonhwick@yahoo.com';

const products = [
  {
    name: "Samsung Galaxy S24 Ultra",
    slug: "samsung-galaxy-s24-ultra",
    description: "The ultimate Android smartphone with a stunning display, powerful Snapdragon processor, and professional-grade camera system featuring a 200MP main sensor. Includes built-in S-Pen.",
    priceInPesewas: 1549900,
    comparePriceInPesewas: 1600000,
    costInPesewas: 1300000,
    stockQuantity: 25,
    lowStockThreshold: 5,
    trackInventory: true,
    sku: "SAM-S24U-256-BLK",
    metaTitle: "Buy Samsung Galaxy S24 Ultra in Ghana",
    metaDescription: "Get the best price for the Samsung Galaxy S24 Ultra smartphone in Ghana. Advanced camera, S-Pen included.",
    isActive: true,
    isFeatured: true,
    weightInGrams: 232,
  },
  {
    name: "Apple MacBook Pro M3 14-inch",
    slug: "apple-macbook-pro-m3-14-inch",
    description: "Supercharged by M3, the 14-inch MacBook Pro delivers incredible performance for pro workflows. Features a brilliant Liquid Retina XDR display and up to 22 hours of battery life.",
    priceInPesewas: 2899900, 
    comparePriceInPesewas: 3100000,
    stockQuantity: 10,
    lowStockThreshold: 2,
    trackInventory: true,
    sku: "APP-MBP-M3-14",
    metaTitle: "Apple MacBook Pro M3 Laptop | Official Seller",
    metaDescription: "Apple MacBook Pro 14-inch with M3 chip. Powerful performance, long battery life, stunning display for professionals.",
    isActive: true,
    isFeatured: true,
    weightInGrams: 1550,
  },
  {
    name: "Sony WH-1000XM5 Noise Cancelling Headphones",
    slug: "sony-wh-1000xm5-noise-cancelling-headphones",
    description: "Industry-leading noise cancellation, exceptional sound quality, and all-day comfort. Experience pristine audio with these premium wireless headphones.",
    priceInPesewas: 450000,
    comparePriceInPesewas: 499900,
    stockQuantity: 40,
    lowStockThreshold: 10,
    trackInventory: true,
    sku: "SONY-WH1000XM5-BLK",
    metaTitle: "Sony WH-1000XM5 Headphones | Best Price Ghana",
    metaDescription: "Experience industry-leading noise cancellation with Sony WH-1000XM5 headphones. Premium sound and comfort.",
    isActive: true,
    isFeatured: false,
    weightInGrams: 250,
  },
  {
    name: "Nike Air Max 270 React",
    slug: "nike-air-max-270-react",
    description: "Lightweight, breathable sneakers featuring Nike's tallest Air unit yet. Perfect for everyday wear, running, and athletic training.",
    priceInPesewas: 120000,
    comparePriceInPesewas: 150000,
    stockQuantity: 50,
    lowStockThreshold: 5,
    trackInventory: true,
    sku: "NIKE-AM270-WHT-42",
    metaTitle: "Nike Air Max 270 Men's Sneakers",
    metaDescription: "Buy Nike Air Max 270 sneakers online. Comfortable, stylish running shoes for everyday wear.",
    isActive: true,
    isFeatured: false,
    weightInGrams: 800,
  },
  {
    name: "Nespresso Vertuo Next Coffee Machine",
    slug: "nespresso-vertuo-next-coffee-machine",
    description: "Brews a wide range of coffees at the touch of a button. Innovative Centrifusion technology ensures the perfect crema every time.",
    priceInPesewas: 280000,
    stockQuantity: 15,
    lowStockThreshold: 3,
    trackInventory: true,
    sku: "NESP-VERTUO-NEXT-GRY",
    metaTitle: "Nespresso Vertuo Next Coffee Machine",
    metaDescription: "Make cafe-quality coffee at home with the Nespresso Vertuo Next. Easy to use, compact design.",
    isActive: true,
    isFeatured: false,
    weightInGrams: 4000,
  },
  {
    name: "Apple Watch Series 9 GPS, 45mm",
    slug: "apple-watch-series-9-gps-45mm",
    description: "Essential smartwatch for a healthy life. Now with the S9 chip enabling a super bright display and a magical new double tap gesture.",
    priceInPesewas: 580000,
    comparePriceInPesewas: 650000,
    stockQuantity: 22,
    lowStockThreshold: 5,
    trackInventory: true,
    sku: "APP-WTC-S9-45-MID",
    metaTitle: "Apple Watch Series 9 45mm",
    metaDescription: "The latest Apple Watch Series 9 with powerful new features and the brightest display ever.",
    isActive: true,
    isFeatured: true,
    weightInGrams: 150,
  },
  {
    name: "Dyson V15 Detect Absolute Vacuum",
    slug: "dyson-v15-detect-absolute-vacuum",
    description: "The most powerful, intelligent cordless vacuum. Laser reveals microscopic dust, while the piezo sensor automatically adapts suction power.",
    priceInPesewas: 890000,
    stockQuantity: 8,
    lowStockThreshold: 2,
    trackInventory: true,
    sku: "DYS-V15-ABS",
    metaTitle: "Dyson V15 Detect Absolute Cordless Vacuum",
    metaDescription: "Deep clean your home with the intelligent Dyson V15 Detect. Features laser dust detection for microscopic particles.",
    isActive: true,
    isFeatured: true,
    weightInGrams: 3000,
  },
  {
    name: "Minimalist Wooden Dining Chair",
    slug: "minimalist-wooden-dining-chair",
    description: "Solid oak dining chair with an elegant, minimalist Scandinavian design. Features a curved backrest for ergonomic comfort.",
    priceInPesewas: 85000,
    comparePriceInPesewas: 110000,
    stockQuantity: 30,
    lowStockThreshold: 8,
    trackInventory: true,
    sku: "FURN-CHAIR-OAK-01",
    metaTitle: "Scandinavian Wooden Dining Chair",
    metaDescription: "Elegant, solid oak dining chair perfect for modern homes. Ergonomic design and durable construction.",
    isActive: true,
    isFeatured: false,
    weightInGrams: 5500,
  },
  {
    name: "LG 65-inch C3 OLED 4K Smart TV",
    slug: "lg-65-inch-c3-oled-4k-smart-tv",
    description: "Experience brilliant picture quality with LG OLED evo. The Alpha 9 Gen6 AI Processor 4K delivers an incredibly immersive visual experience.",
    priceInPesewas: 2150000,
    comparePriceInPesewas: 2400000,
    stockQuantity: 12,
    lowStockThreshold: 3,
    trackInventory: true,
    sku: "LG-OLED65C3-TV",
    metaTitle: "LG 65\" OLED C3 4K Smart TV",
    metaDescription: "Buy the LG 65-inch C3 OLED TV for unbeatable picture quality, perfect blacks, and vibrant colors. Great for gaming and movies.",
    isActive: true,
    isFeatured: true,
    weightInGrams: 24000,
  },
  {
    name: "Hydro Flask Insulated Water Bottle (32oz)",
    slug: "hydro-flask-insulated-water-bottle-32oz",
    description: "Keeps beverages cold for up to 24 hours and hot for up to 12. Made with pro-grade stainless steel and a durable powder coat finish.",
    priceInPesewas: 45000,
    stockQuantity: 100,
    lowStockThreshold: 20,
    trackInventory: true,
    sku: "HYD-FLK-32-BLU",
    metaTitle: "Hydro Flask 32oz Insulated Water Bottle",
    metaDescription: "Stay hydrated with the Hydro Flask 32 oz water bottle. Double-wall vacuum insulation keeps drinks cold for 24 hours.",
    isActive: true,
    isFeatured: false,
    weightInGrams: 430,
  },
  {
    name: "Anker PowerCore 20100mAh Portable Charger",
    slug: "anker-powercore-20100mah-portable-charger",
    description: "Ultra-high capacity power bank with fast-charging technology. Can charge most smartphones up to 5 times.",
    priceInPesewas: 35000,
    comparePriceInPesewas: 42000,
    stockQuantity: 65,
    lowStockThreshold: 15,
    trackInventory: true,
    sku: "ANK-PBC-20100-BLK",
    metaTitle: "Anker 20,100mAh Power Bank",
    metaDescription: "Keep your devices charged on the go with this high-capacity Anker portable charger. Fast, safe, and reliable.",
    isActive: true,
    isFeatured: false,
    weightInGrams: 350,
  },
  {
    name: "Bose QuietComfort Earbuds II",
    slug: "bose-quietcomfort-earbuds-ii",
    description: "The world's best noise cancellation in a pair of truly wireless earbuds. Customizes sound and noise cancellation to your ear's unique shape.",
    priceInPesewas: 320000,
    comparePriceInPesewas: 350000,
    stockQuantity: 28,
    lowStockThreshold: 5,
    trackInventory: true,
    sku: "BOSE-QCE2-BLK",
    metaTitle: "Bose QuietComfort Earbuds II Wireless",
    metaDescription: "Personalized audio and world-class noise cancellation from the Bose QC Earbuds II.",
    isActive: true,
    isFeatured: false,
    weightInGrams: 100,
  },
  {
    name: "Classic Men's Automatic Watch",
    slug: "classic-mens-automatic-watch",
    description: "Elegant timepiece featuring a reliable automatic movement, sapphire crystal face, and premium genuine leather strap. Water resistant up to 50m.",
    priceInPesewas: 145000,
    stockQuantity: 18,
    lowStockThreshold: 4,
    trackInventory: true,
    sku: "WTCH-M-AUTO-LTHR",
    metaTitle: "Classic Men's Automatic Leather Watch",
    metaDescription: "Timeless style meets precision engineering in this men's automatic watch with a leather strap.",
    isActive: true,
    isFeatured: true,
    weightInGrams: 150,
  },
  {
    name: "Yeti Rambler 20 oz Tumbler",
    slug: "yeti-rambler-20-oz-tumbler",
    description: "Tough, double-wall vacuum insulated tumbler with MagSlider lid. Perfect for coffee on the commute or cold drinks on the trail.",
    priceInPesewas: 38000,
    stockQuantity: 80,
    lowStockThreshold: 10,
    trackInventory: true,
    sku: "YETI-RMB-20-NAV",
    metaTitle: "Yeti Rambler 20oz Tumbler with MagSlider Lid",
    metaDescription: "Durable Yeti tumbler keeps hot drinks hot and cold drinks cold. Features the magnetic MagSlider lid.",
    isActive: true,
    isFeatured: false,
    weightInGrams: 360,
  },
  {
    name: "DJI Mini 3 Pro Drone with Controller",
    slug: "dji-mini-3-pro-drone-with-controller",
    description: "Lightweight, foldable drone weighing under 249g. Features 4K/60fps video, tri-directional obstacle sensing, and up to 34 minutes of flight time.",
    priceInPesewas: 1250000,
    comparePriceInPesewas: 1350000,
    stockQuantity: 14,
    lowStockThreshold: 3,
    trackInventory: true,
    sku: "DJI-MINI3-PRO-RC",
    metaTitle: "DJI Mini 3 Pro Drone | 4K Camera",
    metaDescription: "Capture stunning aerial footage with the lightweight and portable DJI Mini 3 Pro. Includes DJI RC controller.",
    isActive: true,
    isFeatured: true,
    weightInGrams: 249,
  }
];

const productImages = [
  "https://images.unsplash.com/photo-1707223706488-82e07ee50080?w=800&q=80",
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
  "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&q=80",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
  "https://images.unsplash.com/photo-1585515320512-eb7297eefb3b?w=800&q=80",
  "https://images.unsplash.com/photo-1434493789847-2f02bbf6b541?w=800&q=80",
  "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&q=80",
  "https://images.unsplash.com/photo-1503602642458-232111445657?w=800&q=80",
  "https://images.unsplash.com/photo-1593305841991-05c2901c51db?w=800&q=80",
  "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80",
  "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&q=80",
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80",
  "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80",
  "https://images.unsplash.com/photo-1614264626156-f40c721b01df?w=800&q=80",
  "https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=800&q=80"
];

async function seedProductsDir() {
  try {
    console.log(`Looking for seller profile: ${SELLER_EMAIL}...`);
    
    // Find the seller user
    const user = await prisma.user.findUnique({
      where: { email: SELLER_EMAIL },
      include: { sellerProfile: true }
    });

    if (!user || user.role !== 'SELLER') {
      console.log('User not found or is not a SELLER role.');
      return;
    }
    
    if (!user.sellerProfile) {
      console.log('Seller profile not found for this user.');
      return;
    }

    const sellerId = user.sellerProfile.id;

    console.log(`Found seller: ${user.sellerProfile.businessName}. Finding categories...`);

    // Get categories to randomly assign
    const categories = await prisma.category.findMany();
    if (categories.length === 0) {
      console.log('No categories found. Cannot add products.');
      return;
    }

    let successCount = 0;
    
    console.log(`Starting insertion of ${products.length} products to DB...`);
    
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        try {
            const category = categories[Math.floor(Math.random() * categories.length)];

            // Create product using Prisma directly
            const created = await prisma.product.create({
                data: {
                    name: product.name,
                    slug: `${product.slug}-${Math.floor(Math.random() * 10000)}`,
                    description: product.description,
                    priceInPesewas: product.priceInPesewas,
                    comparePriceInPesewas: product.comparePriceInPesewas,
                    costInPesewas: product.costInPesewas,
                    stockQuantity: product.stockQuantity,
                    lowStockThreshold: product.lowStockThreshold,
                    trackInventory: product.trackInventory,
                    sku: `${product.sku}-${Math.floor(Math.random() * 1000)}`,
                    metaTitle: product.metaTitle,
                    metaDescription: product.metaDescription,
                    isActive: product.isActive,
                    isFeatured: product.isFeatured,
                    weightInGrams: product.weightInGrams,
                    categoryId: category.id,
                    sellerId: sellerId,
                    images: {
                        create: [
                            {
                                url: productImages[i],
                                isPrimary: true,
                                altText: product.name
                            }
                        ]
                    }
                }
            });
            console.log(`✅ [${i + 1}/${products.length}] Added: ${created.name}`);
            successCount++;
        } catch (e) {
            console.log(`❌ [${i + 1}/${products.length}] Failed: ${product.name}`);
            console.error(e);
        }
    }

    console.log(`\n🎉 Process complete: Added ${successCount}/${products.length} products to DB directly.`);
  } catch (error) {
    console.error('Fatal Database Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedProductsDir();
