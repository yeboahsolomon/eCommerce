/**
 * Update all 20 products with real product images
 * Uses generated images + curated Unsplash photos
 */

const http = require('http');
const API = 'http://localhost:3001/api';
let cookies = '';
let csrfToken = '';

function req(method, path, body) {
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
    const r = http.request(options, (res) => {
      if (res.headers['set-cookie']) {
        res.headers['set-cookie'].forEach(c => {
          const nc = c.split(';')[0];
          const name = nc.split('=')[0];
          const existing = cookies.split('; ').filter(x => !x.startsWith(name + '='));
          existing.push(nc);
          cookies = existing.filter(Boolean).join('; ');
        });
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

// Curated image map: product name → real image URLs
// Uses locally-served generated images + high-quality Unsplash photos
const imageMap = {
  'Samsung Galaxy A15': [
    '/products/samsung-galaxy-a15.png',
  ],
  'JBL Tune 520BT': [
    '/products/jbl-headphones.png',
  ],
  'iPhone 15': [
    '/products/iphone-15-blue.png',
  ],
  'Tecno Spark 20 Pro': [
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop&q=80',
  ],
  'Ankara Print': [
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=800&h=800&fit=crop&q=80',
  ],
  'Leather Crossbody Bag': [
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=800&fit=crop&q=80',
  ],
  'Kente Cloth': [
    'https://images.unsplash.com/photo-1590735213408-9d3e5ec94844?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580681463926-699f53e6a000?w=800&h=800&fit=crop&q=80',
  ],
  'Batakari Smock': [
    'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584794171574-fe3f84b43838?w=800&h=800&fit=crop&q=80',
  ],
  'Shea Butter': [
    'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=800&fit=crop&q=80',
  ],
  'Cocoa Powder': [
    'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1481391032119-d89fee407e44?w=800&h=800&fit=crop&q=80',
  ],
  'Non-Stick Cookware': [
    'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=800&fit=crop&q=80',
  ],
  'Solar-Powered LED': [
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1558449028-b53a39d100fc?w=800&h=800&fit=crop&q=80',
  ],
  'African Black Soap': [
    'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=800&fit=crop&q=80',
  ],
  'Hair Growth Oil': [
    'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=800&h=800&fit=crop&q=80',
  ],
  'HP Laptop 15': [
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=800&fit=crop&q=80',
  ],
  'Logitech MK270': [
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800&h=800&fit=crop&q=80',
  ],
  'Yoga Mat': [
    'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=800&fit=crop&q=80',
  ],
  'Adidas Football': [
    'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800&h=800&fit=crop&q=80',
  ],
  'Baby Stroller': [
    'https://images.unsplash.com/photo-1586048095926-64fe5f3e4dad?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1622706657750-cfacd3e23a43?w=800&h=800&fit=crop&q=80',
  ],
  'Kids Educational Tablet': [
    'https://images.unsplash.com/photo-1544712903-f85342e403e4?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800&h=800&fit=crop&q=80',
  ],
};

async function main() {
  // Step 1: Get CSRF token
  console.log('🔐 Getting CSRF token...');
  const csrfRes = await req('GET', '/csrf-token');
  csrfToken = csrfRes.data?.csrfToken;

  // Step 2: Login as Kwame Yoghurt
  console.log('🔐 Logging in as Kwame Yoghurt...');
  const loginRes = await req('POST', '/auth/login', {
    email: 'kwameyoghurt@yahoo.com',
    password: 'Password12345',
  });
  if (!loginRes.data?.success) {
    console.error('❌ Login failed:', loginRes.data);
    return;
  }
  console.log('   ✅ Logged in');

  // Step 3: Get all products by this seller
  console.log('\n📦 Fetching seller products...');
  const productsRes = await req('GET', '/products?limit=50');
  const allProducts = productsRes.data?.data?.products || productsRes.data?.products || [];
  
  console.log(`   Found ${allProducts.length} products total`);

  // Step 4: Update each product with proper images
  console.log('\n🖼️  Updating product images...\n');
  
  let updated = 0;
  for (const product of allProducts) {
    // Find matching image set by partial name match
    const matchKey = Object.keys(imageMap).find(key => 
      product.name.toLowerCase().includes(key.toLowerCase())
    );

    if (!matchKey) {
      console.log(`   ⏭️  No image match for: ${product.name}`);
      continue;
    }

    const images = imageMap[matchKey];
    
    // Update product images via the images endpoint
    const updateRes = await req('PUT', `/products/${product.id}/images`, {
      images: images.map((url, idx) => ({
        url,
        isPrimary: idx === 0,
        sortOrder: idx,
      })),
    });

    if (updateRes.status === 200 || updateRes.data?.success) {
      updated++;
      console.log(`   ✅ [${updated}] ${product.name} → ${images.length} image(s)`);
    } else {
      console.log(`   ❌ ${product.name}: ${updateRes.data?.message || updateRes.status}`);
    }

    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n✨ Done! Updated ${updated} products with real images.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
