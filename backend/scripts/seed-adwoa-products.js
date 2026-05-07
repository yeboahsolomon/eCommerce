const http = require('http');
const API = 'http://localhost:3001/api';
let cookies = '', csrf = '';

function req(m, p, b) {
  return new Promise((resolve, reject) => {
    const url = new URL(API + p);
    const h = { 'Content-Type': 'application/json', Cookie: cookies };
    if (['POST','PUT'].includes(m)) h['X-CSRF-Token'] = csrf;
    const r = http.request({ hostname: url.hostname, port: url.port, path: url.pathname+url.search, method: m, headers: h }, res => {
      if (res.headers['set-cookie']) res.headers['set-cookie'].forEach(c => {
        const nc=c.split(';')[0], name=nc.split('=')[0];
        const ex=cookies.split('; ').filter(x=>!x.startsWith(name+'='));
        ex.push(nc); cookies=ex.filter(Boolean).join('; ');
      });
      let d=''; res.on('data',c=>d+=c);
      res.on('end',()=>{ try{resolve({s:res.statusCode,d:JSON.parse(d)})}catch{resolve({s:res.statusCode,d})} });
    });
    r.on('error',reject); if(b)r.write(JSON.stringify(b)); r.end();
  });
}

const U = (id) => `https://images.unsplash.com/${id}?w=800&h=800&fit=crop&q=80`;

const products = [
  // ===== ELECTRONICS (3) =====
  { name: 'Anker PowerCore 20000mAh Power Bank', cat: 'electronics', price: 24900, compare: 34900, stock: 45,
    desc: 'Never run out of battery again with the Anker PowerCore 20000mAh portable charger. Features dual USB-A output ports for charging two devices simultaneously, PowerIQ technology for optimized charging speed, and MultiProtect safety system. Perfect for long journeys across Ghana.\n\nKey Features:\n• 20000mAh capacity – charges most phones 4-5 times\n• Dual USB output with PowerIQ\n• LED power indicator\n• MultiProtect 10-point safety system\n• Compact design fits in your bag',
    img: U('photo-1609091839311-d5365f9ff1c5') },
  { name: 'Oraimo FreePods 3 TWS Earbuds', cat: 'electronics', price: 13900, compare: 18900, stock: 60,
    desc: 'The Oraimo FreePods 3 deliver crystal-clear audio with deep bass in a lightweight, ergonomic design. Active Noise Cancellation blocks out background noise, while 30 hours total playtime keeps the music going all day.\n\nKey Features:\n• Active Noise Cancellation (ANC)\n• 30 hours total playtime with charging case\n• IPX5 water resistance for workouts\n• Touch controls for calls and music\n• Bluetooth 5.3 for stable connection',
    img: U('photo-1590658268037-6bf12f032f55') },
  { name: 'Xiaomi Mi Band 8 Smart Fitness Tracker', cat: 'electronics', price: 8900, compare: 12900, stock: 35,
    desc: 'Track your fitness goals with the Xiaomi Mi Band 8. Features a vibrant 1.62" AMOLED display, 150+ workout modes, blood oxygen monitoring, and up to 16 days battery life. Water resistant to 50 meters.\n\nKey Features:\n• 1.62" AMOLED always-on display\n• Heart rate & SpO2 monitoring\n• 150+ workout modes including running and swimming\n• 16-day battery life\n• 5ATM water resistance',
    img: U('photo-1575311373937-040b8e1fd5b6') },

  // ===== PHONES (3) =====
  { name: 'Samsung Galaxy S24 Ultra – 256GB (Titanium Black)', cat: 'phones', price: 1899900, compare: 2099900, stock: 5,
    desc: 'The Samsung Galaxy S24 Ultra is the ultimate flagship smartphone with Galaxy AI built in. Features a stunning 6.8" QHD+ Dynamic AMOLED display, 200MP camera system, embedded S Pen, and Snapdragon 8 Gen 3 processor.\n\nKey Features:\n• 6.8" QHD+ Dynamic AMOLED 2X display (120Hz)\n• 200MP quad camera with 100x Space Zoom\n• Snapdragon 8 Gen 3 processor\n• Embedded S Pen with AI features\n• 5000mAh battery with 45W fast charging\n• Titanium frame, IP68 water resistant',
    img: U('photo-1610945265064-0e34e5519bbf') },
  { name: 'Google Pixel 8a – 128GB (Bay Blue)', cat: 'phones', price: 549900, compare: 649900, stock: 12,
    desc: 'Google Pixel 8a brings flagship-level AI photography to an affordable price. Powered by the Google Tensor G3 chip, it delivers stunning photo editing with Magic Eraser, Best Take, and real-time translation.\n\nKey Features:\n• 6.1" OLED display (120Hz)\n• Google Tensor G3 chip with AI features\n• 64MP main camera with Magic Eraser\n• 7 years of OS and security updates\n• 4492mAh battery with fast charging\n• IP67 water and dust resistant',
    img: U('photo-1598327105666-5b89351aff97') },
  { name: 'Infinix Note 40 Pro – 256GB (Vintage Green)', cat: 'phones', price: 289900, compare: 349900, stock: 20,
    desc: 'The Infinix Note 40 Pro features wireless magnetic charging technology and a premium curved AMOLED display. With MediaTek Dimensity 7020 processor and 108MP camera, it delivers flagship experience at mid-range pricing.\n\nKey Features:\n• 6.78" curved AMOLED display (120Hz)\n• 108MP main camera with OIS\n• MediaTek Dimensity 7020 processor\n• 68W wired + 20W wireless magnetic charging\n• 5000mAh battery\n• JBL-tuned dual speakers',
    img: U('photo-1592899677977-9c10ca588bbd') },

  // ===== FASHION (3) =====
  { name: 'African Wax Print Maxi Dress – Multicolor', cat: 'fashion', price: 18900, compare: 27900, stock: 30,
    desc: 'Stunning African wax print maxi dress with bold multicolor patterns. Flattering A-line silhouette with adjustable waist tie. Made from 100% cotton ankara fabric by skilled Ghanaian seamstresses.\n\nKey Features:\n• 100% premium cotton ankara fabric\n• A-line flattering silhouette\n• Adjustable waist tie\n• Available in sizes S-XXL\n• Machine washable\n• Handmade in Accra, Ghana',
    img: U('photo-1590735213920-68192a487bc2') },
  { name: 'Men\'s Premium Leather Belt – Genuine Cowhide', cat: 'fashion', price: 7900, compare: 12900, stock: 50,
    desc: 'Classic men\'s belt crafted from genuine cowhide leather with a polished silver buckle. 35mm width works perfectly with both formal and casual outfits. Built to last with reinforced stitching.\n\nKey Features:\n• 100% genuine cowhide leather\n• Polished alloy pin buckle\n• 35mm width – versatile for all occasions\n• Sizes 30-44 available\n• Reinforced stitching for durability\n• Gift-boxed packaging',
    img: U('photo-1553062407-98eeb64c6a62') },
  { name: 'Women\'s Canvas Tote Bag – Handwoven Accent', cat: 'fashion', price: 12900, compare: 17900, stock: 40,
    desc: 'Stylish canvas tote bag with handwoven African accent strips. Spacious enough for laptops, books, and daily essentials. Features interior zip pocket and magnetic snap closure.\n\nKey Features:\n• Heavy-duty cotton canvas body\n• Handwoven African accent design\n• Interior zip pocket + phone slot\n• Magnetic snap closure\n• Reinforced leather handles\n• Dimensions: 40cm x 35cm x 12cm',
    img: U('photo-1544816155-12df9643f363') },

  // ===== TRADITIONAL WEAR (3) =====
  { name: 'Women\'s Kente Clutch Purse – Handwoven', cat: 'traditional-wear', price: 15900, compare: 22900, stock: 25,
    desc: 'Elegant clutch purse featuring authentic handwoven kente fabric from Bonwire, Ashanti Region. Lined with satin interior, gold-tone clasp, and detachable chain strap for versatile styling.\n\nKey Features:\n• Authentic handwoven kente exterior\n• Satin-lined interior\n• Gold-tone frame clasp\n• Detachable chain strap\n• Fits phone, cards, lipstick, and keys\n• Dimensions: 25cm x 15cm',
    img: U('photo-1584917865442-de89df76afd3') },
  { name: 'Adinkra Symbol T-Shirt – Unisex (Black)', cat: 'traditional-wear', price: 6900, compare: 9900, stock: 75,
    desc: 'Premium cotton t-shirt featuring the Gye Nyame Adinkra symbol, representing the supremacy of God in Akan culture. Screen-printed with eco-friendly water-based inks on ring-spun cotton.\n\nKey Features:\n• 100% ring-spun combed cotton (180gsm)\n• Gye Nyame symbol screen print\n• Eco-friendly water-based inks\n• Pre-shrunk fabric\n• Unisex fit, sizes XS-3XL\n• Ribbed crew neckline',
    img: U('photo-1503341504253-dff4f94032fc') },
  { name: 'Beaded Necklace Set – Ghanaian Krobo Beads', cat: 'traditional-wear', price: 11900, compare: 16900, stock: 30,
    desc: 'Handcrafted necklace set made with authentic Krobo powder glass beads from the Eastern Region of Ghana. Set includes one statement necklace and matching bracelet. Each piece is unique.\n\nKey Features:\n• Authentic Krobo powder glass beads\n• Handcrafted by local artisans\n• Set includes necklace + bracelet\n• Adjustable length with extension chain\n• Hypoallergenic brass findings\n• Each set is uniquely handmade',
    img: U('photo-1535632066927-ab7c9ab60908') },

  // ===== GROCERIES (3) =====
  { name: 'Dried Hibiscus Flowers (Sobolo) – 500g', cat: 'groceries', price: 3500, compare: 5500, stock: 100,
    desc: 'Premium dried hibiscus flowers for making traditional Ghanaian sobolo drink. Sourced from organic farms in the Upper East Region. Rich in Vitamin C and antioxidants.\n\nKey Features:\n• 500g resealable pack\n• Organically grown – no pesticides\n• Rich deep red color\n• Makes 10+ liters of sobolo\n• High in Vitamin C and antioxidants\n• Sourced from Upper East Region farms',
    img: U('photo-1558642452-9d2a7deb7f62') },
  { name: 'Palm Oil – Pure Red (1 Liter)', cat: 'groceries', price: 2800, compare: 3900, stock: 80,
    desc: 'Premium unrefined red palm oil traditionally processed in the Western Region. Essential for authentic Ghanaian dishes like palm nut soup, red-red, and banku with tilapia.\n\nKey Features:\n• 1 liter bottle\n• Traditionally processed – unrefined\n• Rich red color and authentic flavor\n• High in Vitamin A and E\n• No preservatives or additives\n• Perfect for palm nut soup and red-red',
    img: U('photo-1474979266404-7f28db3f3248') },
  { name: 'Roasted Groundnuts (Peanuts) – 1kg Pack', cat: 'groceries', price: 1800, compare: 2500, stock: 120,
    desc: 'Freshly roasted groundnuts from Tamale, Northern Region. Crunchy, flavorful, and perfect as a snack or for making groundnut soup and paste. Available salted or unsalted.\n\nKey Features:\n• 1kg resealable pack\n• Freshly dry-roasted for maximum crunch\n• Sourced from Northern Region farms\n• Available in salted or unsalted\n• High in protein and healthy fats\n• Perfect for snacking or cooking',
    img: U('photo-1567892737950-30c4db37cd89') },

  // ===== HOME & KITCHEN (3) =====
  { name: 'Stainless Steel Water Bottle – 750ml Insulated', cat: 'home-kitchen', price: 5900, compare: 8900, stock: 55,
    desc: 'Double-wall vacuum insulated stainless steel water bottle. Keeps drinks cold for 24 hours or hot for 12 hours. BPA-free, leak-proof lid, and sweat-proof exterior.\n\nKey Features:\n• 750ml capacity\n• Double-wall vacuum insulation\n• Keeps cold 24hrs / hot 12hrs\n• 18/8 food-grade stainless steel\n• BPA-free leak-proof lid\n• Sweat-proof powder-coated exterior',
    img: U('photo-1602143407151-7111542de6e8') },
  { name: 'Blender – 1.5L Heavy Duty with Grinder', cat: 'home-kitchen', price: 19900, compare: 27900, stock: 20,
    desc: 'Powerful 1.5-liter blender with 700W motor and stainless steel blades. Includes dry grinding jar for spices and grains. Perfect for making smoothies, fufu flour, and grinding pepper.\n\nKey Features:\n• 700W powerful motor\n• 1.5L main jar + 0.5L grinder jar\n• 4 stainless steel blades\n• 3-speed + pulse function\n• Overheat protection\n• Non-slip rubber base',
    img: U('photo-1570222094114-d054a817e56b') },
  { name: 'Mosquito Net – King Size Treated (White)', cat: 'home-kitchen', price: 6900, compare: 9900, stock: 70,
    desc: 'Long-lasting insecticide-treated mosquito net for king-size beds. WHO-recommended protection against malaria-carrying mosquitoes. Easy to hang with reinforced edges.\n\nKey Features:\n• King size: 180cm x 200cm x 170cm\n• Long-lasting insecticide treatment (3 years)\n• Fine 156-mesh polyester\n• WHO-approved for malaria prevention\n• Reinforced hanging loops\n• Machine washable (gentle cycle)',
    img: U('photo-1631049307264-da0ec9d70304') },

  // ===== BEAUTY & PERSONAL CARE (3) =====
  { name: 'Coconut Oil – Extra Virgin Cold Pressed 500ml', cat: 'beauty-personal-care', price: 4500, compare: 6900, stock: 65,
    desc: 'Pure extra virgin coconut oil cold-pressed from fresh coconuts. Multi-purpose for hair conditioning, skin moisturizing, cooking, and oil pulling. Unrefined with natural coconut aroma.\n\nKey Features:\n• 500ml glass bottle\n• Cold-pressed from fresh coconuts\n• 100% unrefined extra virgin\n• Multi-purpose: hair, skin, cooking\n• No chemicals or preservatives\n• Rich in lauric acid and MCTs',
    img: U('photo-1526947425960-945c6e72858f') },
  { name: 'Aloe Vera Gel – 100% Pure Organic 250ml', cat: 'beauty-personal-care', price: 3900, compare: 5900, stock: 80,
    desc: 'Pure organic aloe vera gel for soothing sunburns, moisturizing skin, and conditioning hair. Cold-processed to preserve nutrients. No artificial colors, fragrances, or alcohol.\n\nKey Features:\n• 250ml pump bottle\n• 100% pure organic aloe vera\n• Cold-processed to preserve nutrients\n• Soothes sunburn and irritation\n• Lightweight, non-greasy formula\n• No parabens, alcohol, or artificial colors',
    img: U('photo-1556228578-0d85b1a4d571') },
  { name: 'Charcoal Face Wash – Deep Cleansing 150ml', cat: 'beauty-personal-care', price: 5500, compare: 7900, stock: 45,
    desc: 'Activated charcoal face wash that deeply cleanses pores and removes excess oil without stripping natural moisture. Enriched with tea tree oil and salicylic acid for clear skin.\n\nKey Features:\n• 150ml tube\n• Activated charcoal draws out impurities\n• Tea tree oil for anti-bacterial action\n• Salicylic acid for gentle exfoliation\n• Suitable for oily and combination skin\n• SLS-free, paraben-free formula',
    img: U('photo-1556228720-195a672e8a03') },

  // ===== COMPUTERS & ACCESSORIES (3) =====
  { name: 'USB-C Hub 7-in-1 – HDMI, USB 3.0, SD Card', cat: 'computers-accessories', price: 13900, compare: 19900, stock: 30,
    desc: '7-in-1 USB-C hub adapter for MacBook and laptops. Expand your connectivity with HDMI 4K output, 3x USB 3.0, SD/TF card readers, and 100W PD charging pass-through.\n\nKey Features:\n• 4K HDMI output (30Hz)\n• 3x USB 3.0 ports (5Gbps)\n• SD + TF card reader slots\n• 100W USB-C PD charging pass-through\n• Aluminum alloy body with heat dissipation\n• Plug-and-play, no drivers needed',
    img: U('photo-1625842268584-8f3296236761') },
  { name: 'Laptop Stand – Adjustable Aluminum (Silver)', cat: 'computers-accessories', price: 9900, compare: 14900, stock: 35,
    desc: 'Ergonomic adjustable laptop stand made from premium aluminum alloy. Raises screen to eye level to reduce neck strain. Compatible with 10-17 inch laptops. Foldable for portability.\n\nKey Features:\n• Premium aluminum alloy construction\n• Adjustable height (6 angles)\n• Compatible with 10-17 inch laptops\n• Ventilated design prevents overheating\n• Anti-slip silicone pads\n• Foldable and portable (weighs 260g)',
    img: U('photo-1527814050087-3793815479db') },
  { name: 'Webcam HD 1080p – Built-in Microphone', cat: 'computers-accessories', price: 11900, compare: 16900, stock: 25,
    desc: 'Full HD 1080p webcam with built-in noise-canceling microphone. Auto-focus and auto light correction ensure you look great on Zoom, Teams, and Google Meet calls.\n\nKey Features:\n• Full HD 1080p at 30fps\n• Built-in noise-canceling dual microphone\n• Auto-focus up to 5 meters\n• Auto light correction for low-light rooms\n• Universal clip fits monitors and laptops\n• USB plug-and-play, no drivers needed',
    img: U('photo-1587826080692-f439cd0b70da') },

  // ===== SPORTS & OUTDOORS (3) =====
  { name: 'Resistance Bands Set – 5 Levels with Handles', cat: 'sports-outdoors', price: 7900, compare: 11900, stock: 40,
    desc: 'Complete resistance band set with 5 color-coded bands (10-50 lbs), 2 cushioned handles, 2 ankle straps, and door anchor. Perfect for home workouts and physical therapy.\n\nKey Features:\n• 5 bands: 10, 20, 30, 40, 50 lbs\n• Stackable up to 150 lbs total\n• Natural latex – snap-resistant\n• 2 cushioned handles + 2 ankle straps\n• Door anchor included\n• Portable carry bag for gym or travel',
    img: U('photo-1598289431512-b97b0917affc') },
  { name: 'Running Shoes – Lightweight Mesh (Unisex)', cat: 'sports-outdoors', price: 16900, compare: 24900, stock: 30,
    desc: 'Ultra-lightweight running shoes with breathable mesh upper and cushioned EVA sole. Designed for road running, gym workouts, and daily casual wear. Available in multiple colors.\n\nKey Features:\n• Breathable knit mesh upper\n• Cushioned EVA midsole for impact absorption\n• Rubber outsole with grip pattern\n• Lightweight: only 280g per shoe\n• Pull-tab heel for easy on/off\n• Available sizes: EU 36-46',
    img: U('photo-1542291026-7eec264c27ff') },
  { name: 'Camping Headlamp – Rechargeable LED 300 Lumens', cat: 'sports-outdoors', price: 4900, compare: 7900, stock: 50,
    desc: 'Rechargeable LED headlamp with 300 lumens brightness and 5 lighting modes. IPX4 water resistant, adjustable beam angle, and lightweight design for camping, hiking, and emergencies.\n\nKey Features:\n• 300 lumens max brightness\n• 5 modes: high, medium, low, strobe, SOS\n• USB-C rechargeable (800mAh battery)\n• Up to 30 hours runtime on low\n• IPX4 water resistant\n• Adjustable 60° beam angle',
    img: U('photo-1504280390367-361c6d9f38f4') },

  // ===== BABY & KIDS (3) =====
  { name: 'Baby Carrier – Ergonomic 4-Position (Grey)', cat: 'baby-kids', price: 13900, compare: 19900, stock: 20,
    desc: 'Ergonomic baby carrier with 4 carrying positions: front-facing in, front-facing out, hip, and back carry. Supports babies from 3.5 to 15kg. Padded shoulder straps and lumbar support.\n\nKey Features:\n• 4 carrying positions\n• Suitable for 3.5-15kg (3-36 months)\n• Wide padded shoulder straps\n• Lumbar support waist belt\n• Breathable mesh panel for ventilation\n• Machine washable',
    img: U('photo-1515488042361-ee00e0ddd4e4') },
  { name: 'Kids Coloring Book Set – 200 Pages with Crayons', cat: 'baby-kids', price: 3500, compare: 5500, stock: 60,
    desc: 'Jumbo coloring book set featuring 200 pages of animals, vehicles, shapes, and Ghanaian cultural motifs. Includes a box of 24 non-toxic washable crayons. Ages 3-8.\n\nKey Features:\n• 200 coloring pages – tear-out design\n• Includes 24 washable crayons\n• Themes: animals, vehicles, shapes, Ghana culture\n• Printed on thick paper (no bleed-through)\n• Educational: develops motor skills\n• Suitable for ages 3-8',
    img: U('photo-1513364776144-60967b0f800f') },
  { name: 'Baby Feeding Set – BPA-Free 6 Pieces (Blue)', cat: 'baby-kids', price: 5900, compare: 8900, stock: 35,
    desc: 'Complete baby feeding set with suction plate, suction bowl, sippy cup, bib, spoon, and fork. Made from food-grade silicone, BPA-free, and dishwasher safe. Perfect for self-feeding toddlers.\n\nKey Features:\n• 6 pieces: plate, bowl, cup, bib, spoon, fork\n• 100% food-grade silicone\n• BPA-free, PVC-free, phthalate-free\n• Strong suction base prevents spills\n• Microwave and dishwasher safe\n• Suitable for 6 months+',
    img: U('photo-1590004987778-bece5c9adab6') },
];

async function main() {
  console.log('🔐 Getting CSRF token...');
  const c = await req('GET', '/csrf-token'); csrf = c.d.csrfToken;
  
  console.log('🔐 Logging in as Adwoa Priscilla...');
  const login = await req('POST', '/auth/login', { email: 'adwoapriscilla@google.com', password: 'Password67890' });
  if (!login.d?.success) { console.error('❌ Login failed:', login.d?.message || login.d); return; }
  console.log('   ✅ Logged in as:', login.d?.data?.user?.firstName, login.d?.data?.user?.lastName);

  console.log('\n📦 Fetching categories...');
  const cats = await req('GET', '/categories');
  const catMap = {};
  (cats.d?.data?.categories || []).forEach(c => { catMap[c.slug] = c.id; });
  console.log('   ✅', Object.keys(catMap).length, 'categories\n');

  console.log('🛒 Creating 30 products for Adwoa\'s Paradise...\n');
  let ok = 0, fail = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const categoryId = catMap[p.cat];
    if (!categoryId) { console.log(`   ⚠️ Skip: ${p.name} (category "${p.cat}" not found)`); fail++; continue; }

    const res = await req('POST', '/products', {
      name: p.name, description: p.desc, priceInPesewas: p.price,
      comparePriceInPesewas: p.compare, categoryId, stockQuantity: p.stock,
      trackInventory: true, lowStockThreshold: 5, isActive: true,
      isFeatured: i < 8, images: [p.img],
    });

    if (res.d?.success) {
      ok++;
      // Update images with proper structure
      const prodId = res.d?.data?.id;
      if (prodId) {
        await req('PUT', `/products/${prodId}/images`, {
          images: [{ url: p.img, isPrimary: true, sortOrder: 0 }]
        });
      }
      console.log(`   ✅ [${ok}/30] ${p.name} → ${p.cat} (₵${(p.price/100).toFixed(2)})`);
    } else {
      fail++;
      console.log(`   ❌ ${p.name}: ${res.d?.message || JSON.stringify(res.d).substring(0,80)}`);
    }
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n✨ Done! Created: ${ok}, Failed: ${fail}`);
}

main().catch(console.error);
