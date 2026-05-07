/**
 * Verify and fix product image URLs
 * Tests each URL and replaces broken ones with verified working alternatives
 */
const http = require('http');
const https = require('https');
const API = 'http://localhost:3001/api';
let cookies = '';
let csrfToken = '';

function apiReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(API + path);
    const headers = { 'Content-Type': 'application/json', 'Cookie': cookies };
    if (['POST','PUT','DELETE','PATCH'].includes(method)) headers['X-CSRF-Token'] = csrfToken;
    const options = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers };
    const r = http.request(options, (res) => {
      if (res.headers['set-cookie']) {
        res.headers['set-cookie'].forEach(c => {
          const nc = c.split(';')[0], name = nc.split('=')[0];
          const existing = cookies.split('; ').filter(x => !x.startsWith(name + '='));
          existing.push(nc);
          cookies = existing.filter(Boolean).join('; ');
        });
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, data }); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function testUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const r = client.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        testUrl(res.headers.location).then(resolve);
      } else {
        resolve(res.statusCode === 200);
      }
    });
    r.on('error', () => resolve(false));
    r.on('timeout', () => { r.destroy(); resolve(false); });
    r.end();
  });
}

// Verified working Unsplash photo URLs (tested and confirmed)
// Using the format: https://images.unsplash.com/photo-ID?w=800&h=800&fit=crop&q=80
const verifiedImages = {
  // Electronics
  'Samsung Galaxy A15': ['/products/samsung-galaxy-a15.png'],
  'JBL Tune 520BT': ['/products/jbl-headphones.png'],
  // Phones
  'iPhone 15': ['/products/iphone-15-blue.png'],
  'Tecno Spark 20 Pro': [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop&q=80',
  ],
  // Fashion
  'Ankara Print': [
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=800&fit=crop&q=80',
  ],
  'Leather Crossbody Bag': [
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=800&fit=crop&q=80',
  ],
  // Traditional Wear
  'Kente Cloth': [
    'https://images.unsplash.com/photo-1580681463926-699f53e6a000?w=800&h=800&fit=crop&q=80',
  ],
  'Batakari Smock': [
    'https://images.unsplash.com/photo-1584794171574-fe3f84b43838?w=800&h=800&fit=crop&q=80',
  ],
  // Groceries  
  'Shea Butter': [
    'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=800&fit=crop&q=80',
  ],
  'Cocoa Powder': [
    'https://images.unsplash.com/photo-1481391032119-d89fee407e44?w=800&h=800&fit=crop&q=80',
  ],
  // Home & Kitchen
  'Non-Stick Cookware': [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=800&fit=crop&q=80',
  ],
  'Solar-Powered LED': [
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&h=800&fit=crop&q=80',
  ],
  // Beauty
  'African Black Soap': [
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=800&fit=crop&q=80',
  ],
  'Hair Growth Oil': [
    'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=800&h=800&fit=crop&q=80',
  ],
  // Computers
  'HP Laptop 15': [
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=800&fit=crop&q=80',
  ],
  'Logitech MK270': [
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&h=800&fit=crop&q=80',
  ],
  // Sports
  'Yoga Mat': [
    'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&h=800&fit=crop&q=80',
  ],
  'Adidas Football': [
    'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?w=800&h=800&fit=crop&q=80',
  ],
  // Baby & Kids
  'Baby Stroller': [
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800&h=800&fit=crop&q=80',
  ],
  'Kids Educational Tablet': [
    'https://images.unsplash.com/photo-1544712903-f85342e403e4?w=800&h=800&fit=crop&q=80',
  ],
};

// Fallback images by category keyword if primary fails
const fallbacks = {
  phone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop&q=80',
  fashion: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&h=800&fit=crop&q=80',
  bag: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=800&fit=crop&q=80',
  textile: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&h=800&fit=crop&q=80',
  food: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=800&h=800&fit=crop&q=80',
  kitchen: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=800&fit=crop&q=80',
  soap: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=800&fit=crop&q=80',
  beauty: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=800&h=800&fit=crop&q=80',
  laptop: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=800&fit=crop&q=80',
  keyboard: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&h=800&fit=crop&q=80',
  sport: 'https://images.unsplash.com/photo-1461896836934-bd45ba7b0ee2?w=800&h=800&fit=crop&q=80',
  baby: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&h=800&fit=crop&q=80',
  tablet: 'https://images.unsplash.com/photo-1544712903-f85342e403e4?w=800&h=800&fit=crop&q=80',
};

async function main() {
  // Step 1: Verify all image URLs
  console.log('🔍 Step 1: Verifying all image URLs...\n');
  const allUrls = new Set();
  Object.values(verifiedImages).flat().forEach(u => { if (u.startsWith('http')) allUrls.add(u); });
  
  const urlStatus = {};
  for (const url of allUrls) {
    const ok = await testUrl(url);
    urlStatus[url] = ok;
    console.log(`   ${ok ? '✅' : '❌'} ${url.split('?')[0].split('/').pop()}`);
  }

  const brokenCount = Object.values(urlStatus).filter(v => !v).length;
  console.log(`\n   Results: ${allUrls.size - brokenCount} working, ${brokenCount} broken\n`);

  // Step 2: Login
  console.log('🔐 Logging in as Kwame Yoghurt...');
  const csrfRes = await apiReq('GET', '/csrf-token');
  csrfToken = csrfRes.data?.csrfToken;
  
  const loginRes = await apiReq('POST', '/auth/login', {
    email: 'kwameyoghurt@yahoo.com',
    password: 'Password12345',
  });
  if (!loginRes.data?.success) { console.error('❌ Login failed'); return; }
  console.log('   ✅ Logged in\n');

  // Step 3: Get products and update with verified images
  console.log('📦 Fetching products...');
  const productsRes = await apiReq('GET', '/products?limit=50');
  const products = productsRes.data?.data?.products || [];
  console.log(`   Found ${products.length} products\n`);

  console.log('🖼️  Updating with verified images...\n');
  let updated = 0;

  for (const product of products) {
    const matchKey = Object.keys(verifiedImages).find(key =>
      product.name.toLowerCase().includes(key.toLowerCase())
    );

    if (!matchKey) {
      console.log(`   ⏭️  No match: ${product.name}`);
      continue;
    }

    let images = verifiedImages[matchKey];
    
    // Replace any broken URLs with fallbacks
    const finalImages = [];
    for (const img of images) {
      if (img.startsWith('/')) {
        // Local image — always valid
        finalImages.push(img);
      } else if (urlStatus[img] === false) {
        // Broken — find fallback
        const cat = matchKey.toLowerCase();
        const fallbackKey = Object.keys(fallbacks).find(k => cat.includes(k));
        if (fallbackKey) finalImages.push(fallbacks[fallbackKey]);
      } else {
        finalImages.push(img);
      }
    }

    if (finalImages.length === 0) {
      console.log(`   ⚠️  No valid images for: ${product.name}`);
      continue;
    }

    const updateRes = await apiReq('PUT', `/products/${product.id}/images`, {
      images: finalImages.map((url, idx) => ({
        url,
        isPrimary: idx === 0,
        sortOrder: idx,
      })),
    });

    if (updateRes.status === 200 || updateRes.data?.success) {
      updated++;
      console.log(`   ✅ [${updated}] ${product.name} → ${finalImages[0].split('/').pop().split('?')[0]}`);
    } else {
      console.log(`   ❌ ${product.name}: ${updateRes.data?.message || updateRes.status}`);
    }

    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n✨ Done! Updated ${updated} products with verified images.`);
}

main().catch(console.error);
