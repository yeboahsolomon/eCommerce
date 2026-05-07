/**
 * Seed 20 products as seller "Kwame Yoghurt"
 * Usage: node scripts/seed-products.js
 */

const http = require('http');

const API = 'http://localhost:3001/api';
let cookies = '';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(API + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
    };

    const req = http.request(options, (res) => {
      // Capture set-cookie headers
      if (res.headers['set-cookie']) {
        const newCookies = res.headers['set-cookie'].map(c => c.split(';')[0]);
        newCookies.forEach(nc => {
          const name = nc.split('=')[0];
          // Replace or add
          const existing = cookies.split('; ').filter(c => !c.startsWith(name + '='));
          existing.push(nc);
          cookies = existing.filter(Boolean).join('; ');
        });
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Product definitions — 2 per category, 20 total
const products = [
  // ===== ELECTRONICS =====
  {
    name: 'Samsung Galaxy A15 – 128GB Dual SIM',
    description: 'The Samsung Galaxy A15 features a vibrant 6.5" Super AMOLED display, 50MP triple camera system, and a massive 5000mAh battery for all-day power. Perfect for everyday use in Ghana with dual SIM support and 4G LTE connectivity.',
    priceInPesewas: 189900,
    comparePriceInPesewas: 229900,
    categorySlug: 'electronics',
    stockQuantity: 25,
    images: ['https://picsum.photos/seed/samsung-a15/800/800', 'https://picsum.photos/seed/samsung-a15-back/800/800'],
  },
  {
    name: 'JBL Tune 520BT Wireless Headphones',
    description: 'Experience JBL Pure Bass sound with the Tune 520BT wireless on-ear headphones. Up to 57 hours of battery life, Bluetooth 5.3, and a lightweight foldable design. Ideal for commuting in Accra or studying at UG.',
    priceInPesewas: 34900,
    comparePriceInPesewas: 44900,
    categorySlug: 'electronics',
    stockQuantity: 40,
    images: ['https://picsum.photos/seed/jbl-520bt/800/800', 'https://picsum.photos/seed/jbl-520bt-side/800/800'],
  },

  // ===== PHONES =====
  {
    name: 'iPhone 15 – 128GB (Blue)',
    description: 'Apple iPhone 15 with Dynamic Island, 48MP camera, A16 Bionic chip, and USB-C. Ceramic Shield front, aerospace-grade aluminum design. Fully supported by Ghanaian networks.',
    priceInPesewas: 1299900,
    comparePriceInPesewas: 1399900,
    categorySlug: 'phones',
    stockQuantity: 10,
    images: ['https://picsum.photos/seed/iphone15-blue/800/800', 'https://picsum.photos/seed/iphone15-back/800/800'],
  },
  {
    name: 'Tecno Spark 20 Pro – 256GB',
    description: 'The Tecno Spark 20 Pro packs a 108MP main camera, 6.78" FHD+ display, and Helio G99 processor. Comes with 8GB RAM + 256GB storage at an unbeatable price for the Ghanaian market.',
    priceInPesewas: 159900,
    comparePriceInPesewas: 199900,
    categorySlug: 'phones',
    stockQuantity: 30,
    images: ['https://picsum.photos/seed/tecno-spark20/800/800', 'https://picsum.photos/seed/tecno-spark20-box/800/800'],
  },

  // ===== FASHION =====
  {
    name: 'Men\'s Ankara Print Casual Shirt',
    description: 'Stylish men\'s casual shirt made from premium African ankara fabric. Available in vibrant blue and gold patterns. Perfect for casual Friday at the office or weekend outings. Made in Ghana by local tailors.',
    priceInPesewas: 15900,
    comparePriceInPesewas: 22900,
    categorySlug: 'fashion',
    stockQuantity: 50,
    images: ['https://picsum.photos/seed/ankara-shirt/800/800', 'https://picsum.photos/seed/ankara-shirt-2/800/800'],
  },
  {
    name: 'Ladies Leather Crossbody Bag – Brown',
    description: 'Elegant genuine leather crossbody bag with gold-tone hardware. Adjustable strap, multiple compartments, and RFID-blocking pocket. Handcrafted quality that complements any outfit.',
    priceInPesewas: 24900,
    comparePriceInPesewas: 34900,
    categorySlug: 'fashion',
    stockQuantity: 35,
    images: ['https://picsum.photos/seed/leather-bag/800/800', 'https://picsum.photos/seed/leather-bag-open/800/800'],
  },

  // ===== TRADITIONAL WEAR =====
  {
    name: 'Premium Kente Cloth – 6 Yards (Royal Blue & Gold)',
    description: 'Authentic handwoven Kente cloth from Bonwire, Ashanti Region. 6 yards of premium quality fabric in royal blue and gold. Perfect for special occasions, weddings, and cultural celebrations.',
    priceInPesewas: 89900,
    comparePriceInPesewas: 119900,
    categorySlug: 'traditional-wear',
    stockQuantity: 15,
    images: ['https://picsum.photos/seed/kente-blue/800/800', 'https://picsum.photos/seed/kente-gold/800/800'],
  },
  {
    name: 'Batakari Smock – Northern Ghana Tradition',
    description: 'Handwoven Batakari (Fugu) smock from Tamale, Northern Region. Made from authentic cotton strips in traditional patterns. A must-have for cultural events and festivals.',
    priceInPesewas: 45900,
    comparePriceInPesewas: 59900,
    categorySlug: 'traditional-wear',
    stockQuantity: 20,
    images: ['https://picsum.photos/seed/batakari/800/800', 'https://picsum.photos/seed/batakari-detail/800/800'],
  },

  // ===== GROCERIES =====
  {
    name: 'Shea Butter – Pure Organic 500g (Northern Ghana)',
    description: '100% pure unrefined shea butter sourced directly from women cooperatives in the Upper West Region. Rich in vitamins A and E. Perfect for cooking, skincare, and hair care.',
    priceInPesewas: 4500,
    comparePriceInPesewas: 6500,
    categorySlug: 'groceries',
    stockQuantity: 100,
    images: ['https://picsum.photos/seed/shea-butter/800/800', 'https://picsum.photos/seed/shea-butter-jar/800/800'],
  },
  {
    name: 'Organic Cocoa Powder – 250g Premium Grade',
    description: 'Premium cocoa powder from the Cocoa Board of Ghana. Single-origin, ethically sourced from farms in the Western Region. Rich chocolate flavor for baking, beverages, and cooking.',
    priceInPesewas: 3500,
    comparePriceInPesewas: 4900,
    categorySlug: 'groceries',
    stockQuantity: 80,
    images: ['https://picsum.photos/seed/cocoa-powder/800/800', 'https://picsum.photos/seed/cocoa-beans/800/800'],
  },

  // ===== HOME & KITCHEN =====
  {
    name: 'Non-Stick Cookware Set – 5 Pieces (Black)',
    description: 'Complete 5-piece non-stick cookware set including frying pan, saucepan, and stock pot with lids. PFOA-free coating, heat-resistant handles, and compatible with all stove types including gas (popular in Ghana).',
    priceInPesewas: 32900,
    comparePriceInPesewas: 45900,
    categorySlug: 'home-kitchen',
    stockQuantity: 20,
    images: ['https://picsum.photos/seed/cookware-set/800/800', 'https://picsum.photos/seed/cookware-detail/800/800'],
  },
  {
    name: 'Solar-Powered LED Rechargeable Lantern',
    description: 'Rechargeable LED lantern with built-in solar panel and USB charging. 3 brightness levels, up to 12 hours runtime. Essential for every Ghanaian home during load-shedding (dumsor).',
    priceInPesewas: 8900,
    comparePriceInPesewas: 12900,
    categorySlug: 'home-kitchen',
    stockQuantity: 60,
    images: ['https://picsum.photos/seed/solar-lantern/800/800', 'https://picsum.photos/seed/solar-lantern-glow/800/800'],
  },

  // ===== BEAUTY & PERSONAL CARE =====
  {
    name: 'African Black Soap – 200g (Original Ghana)',
    description: 'Traditional African black soap handmade in Ghana using plantain ash, cocoa pods, and palm oil. Natural cleanser for face and body. Helps with acne, eczema, and dark spots.',
    priceInPesewas: 2500,
    comparePriceInPesewas: 3900,
    categorySlug: 'beauty-personal-care',
    stockQuantity: 150,
    images: ['https://picsum.photos/seed/black-soap/800/800', 'https://picsum.photos/seed/black-soap-bar/800/800'],
  },
  {
    name: 'Natural Hair Growth Oil – 100ml (Chebe & Castor Blend)',
    description: 'Premium hair growth oil blending Chebe powder from Chad with Jamaican black castor oil and baobab oil. Strengthens natural hair, reduces breakage, and promotes length retention.',
    priceInPesewas: 7900,
    comparePriceInPesewas: 11900,
    categorySlug: 'beauty-personal-care',
    stockQuantity: 70,
    images: ['https://picsum.photos/seed/hair-oil/800/800', 'https://picsum.photos/seed/hair-oil-bottle/800/800'],
  },

  // ===== COMPUTERS & ACCESSORIES =====
  {
    name: 'HP Laptop 15 – Intel Core i5, 8GB RAM, 256GB SSD',
    description: 'HP Laptop 15 with 11th Gen Intel Core i5 processor, 8GB DDR4 RAM, 256GB SSD, and 15.6" FHD display. Pre-installed Windows 11. Perfect for students and professionals in Ghana.',
    priceInPesewas: 599900,
    comparePriceInPesewas: 699900,
    categorySlug: 'computers-accessories',
    stockQuantity: 8,
    images: ['https://picsum.photos/seed/hp-laptop/800/800', 'https://picsum.photos/seed/hp-laptop-open/800/800'],
  },
  {
    name: 'Wireless Keyboard & Mouse Combo – Logitech MK270',
    description: 'Logitech MK270 wireless keyboard and mouse combo. Reliable 2.4GHz connection, long battery life (up to 24 months for keyboard). Spill-resistant design, compact and quiet keys.',
    priceInPesewas: 16900,
    comparePriceInPesewas: 22900,
    categorySlug: 'computers-accessories',
    stockQuantity: 45,
    images: ['https://picsum.photos/seed/logitech-mk270/800/800', 'https://picsum.photos/seed/logitech-mouse/800/800'],
  },

  // ===== SPORTS & OUTDOORS =====
  {
    name: 'Yoga Mat – 6mm Premium Non-Slip (Purple)',
    description: 'Premium 6mm thick yoga mat with non-slip texture on both sides. Lightweight, easy to carry, and moisture-resistant. Perfect for yoga sessions at home or in Accra fitness studios.',
    priceInPesewas: 8900,
    comparePriceInPesewas: 12900,
    categorySlug: 'sports-outdoors',
    stockQuantity: 35,
    images: ['https://picsum.photos/seed/yoga-mat/800/800', 'https://picsum.photos/seed/yoga-mat-rolled/800/800'],
  },
  {
    name: 'Adidas Football – FIFA Quality Pro Match Ball',
    description: 'Official size 5 Adidas football with FIFA Quality Pro certification. Seamless surface for true flight, durable outer shell. Ready for matches at Accra Sports Stadium or community pitches.',
    priceInPesewas: 14900,
    comparePriceInPesewas: 19900,
    categorySlug: 'sports-outdoors',
    stockQuantity: 40,
    images: ['https://picsum.photos/seed/adidas-ball/800/800', 'https://picsum.photos/seed/football-field/800/800'],
  },

  // ===== BABY & KIDS =====
  {
    name: 'Baby Stroller – Foldable Lightweight (Grey)',
    description: 'Lightweight foldable baby stroller with 5-point harness, adjustable canopy, and storage basket. One-hand fold mechanism. Suitable for ages 0-3 years. Easy to transport in trotros and taxis.',
    priceInPesewas: 49900,
    comparePriceInPesewas: 69900,
    categorySlug: 'baby-kids',
    stockQuantity: 12,
    images: ['https://picsum.photos/seed/baby-stroller/800/800', 'https://picsum.photos/seed/stroller-folded/800/800'],
  },
  {
    name: 'Kids Educational Tablet – 7 Inch (Pre-loaded Apps)',
    description: 'Kid-friendly 7-inch tablet with shockproof case and parental controls. Pre-loaded with educational apps, games, and e-books. 32GB storage, WiFi enabled. Keep children learning during holidays.',
    priceInPesewas: 29900,
    comparePriceInPesewas: 39900,
    categorySlug: 'baby-kids',
    stockQuantity: 25,
    images: ['https://picsum.photos/seed/kids-tablet/800/800', 'https://picsum.photos/seed/kids-tablet-case/800/800'],
  },
];

async function main() {
  console.log('🔐 Step 1: Fetching CSRF token...');
  const csrfRes = await request('GET', '/csrf-token');
  const csrfToken = csrfRes.data?.csrfToken;
  if (!csrfToken) {
    console.error('❌ Failed to get CSRF token:', csrfRes.data);
    return;
  }
  console.log('   ✅ CSRF token obtained');

  // Update headers to include CSRF for POST requests
  const originalRequest = request;
  request = function(method, path, body) {
    return new Promise((resolve, reject) => {
      const url = new URL(API + path);
      const headers = {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      };
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        headers['X-CSRF-Token'] = csrfToken;
      }
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      };

      const req = http.request(options, (res) => {
        if (res.headers['set-cookie']) {
          const newCookies = res.headers['set-cookie'].map(c => c.split(';')[0]);
          newCookies.forEach(nc => {
            const name = nc.split('=')[0];
            const existing = cookies.split('; ').filter(c => !c.startsWith(name + '='));
            existing.push(nc);
            cookies = existing.filter(Boolean).join('; ');
          });
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  console.log('🔐 Step 2: Logging in as Kwame Yoghurt...');
  const loginRes = await request('POST', '/auth/login', {
    email: 'kwameyoghurt@yahoo.com',
    password: 'Password12345',
  });

  if (!loginRes.data?.success) {
    console.error('❌ Login failed:', loginRes.data?.message || loginRes.data);
    return;
  }
  console.log('   ✅ Logged in as:', loginRes.data?.data?.user?.firstName, loginRes.data?.data?.user?.lastName);

  console.log('\n📦 Step 3: Fetching categories...');
  const catRes = await request('GET', '/categories');
  const categories = catRes.data?.data?.categories || [];
  
  // Build slug -> id map
  const catMap = {};
  categories.forEach(c => { catMap[c.slug] = c.id; });
  console.log('   ✅ Found', Object.keys(catMap).length, 'categories:', Object.keys(catMap).join(', '));

  console.log('\n🛒 Step 4: Creating 20 products...\n');
  
  let created = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const categoryId = catMap[p.categorySlug];
    
    if (!categoryId) {
      console.log(`   ⚠️  Skipping "${p.name}" — category "${p.categorySlug}" not found`);
      failed++;
      continue;
    }

    const payload = {
      name: p.name,
      description: p.description,
      priceInPesewas: p.priceInPesewas,
      comparePriceInPesewas: p.comparePriceInPesewas,
      categoryId,
      stockQuantity: p.stockQuantity,
      trackInventory: true,
      lowStockThreshold: 5,
      isActive: true,
      isFeatured: i < 6, // Feature the first 6 products
      images: p.images,
    };

    const res = await request('POST', '/products', payload);

    if (res.data?.success) {
      created++;
      console.log(`   ✅ [${created}/20] ${p.name} → ${p.categorySlug} (₵${(p.priceInPesewas / 100).toFixed(2)})`);
    } else {
      failed++;
      console.log(`   ❌ [FAIL] ${p.name}: ${res.data?.message || JSON.stringify(res.data?.errors?.[0]?.message || res.data).substring(0, 100)}`);
    }

    // Small delay to avoid overwhelming the server
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✨ Done! Created: ${created}, Failed: ${failed}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
