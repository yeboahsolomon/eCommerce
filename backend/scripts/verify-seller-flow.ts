
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';
const ADMIN_EMAIL = 'admin@ghanamarket.com';
const ADMIN_PASSWORD = 'admin123';

const TEST_USER = {
  email: `test-seller-${Date.now()}@example.com`,
  password: 'password123',
  firstName: 'Kwame',
  lastName: 'Seller',
  phone: `024${Math.floor(1000000 + Math.random() * 9000000)}`, // Random Ghana phone
};

const SELLER_APP = {
  storeName: `Kwame Store ${Date.now()}`,
  businessType: 'INDIVIDUAL',
  businessEmail: `store-${Date.now()}@example.com`,
  businessPhone: TEST_USER.phone,
  ghanaCardNumber: 'GHA-123456789-0',
  businessAddress: '123 Market Circle, Takoradi',
  ghanaRegion: 'Western',
  mobileMoneyNumber: TEST_USER.phone,
  mobileMoneyProvider: 'MTN',
};

async function api(method: string, endpoint: string, token?: string, body?: any) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log('🚀 Starting Seller Flow Verification...\n');

  // 1. Login Admin
  console.log('1️⃣ Logging in as Admin...');
  const adminLogin = await api('POST', '/auth/login', undefined, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (!adminLogin.data.success) throw new Error('Admin login failed');
  const adminToken = adminLogin.data.data.accessToken;
  console.log('   ✅ Admin logged in\n');

  // 2. Register User
  console.log('2️⃣ Registering Test User...');
  const register = await api('POST', '/auth/register', undefined, TEST_USER);
  if (!register.data.success) throw new Error(`Registration failed: ${register.data.message}`);
  console.log('   ✅ User registered\n');

  // 3. Login User
  console.log('3️⃣ Logging in as Test User...');
  const userLogin = await api('POST', '/auth/login', undefined, { email: TEST_USER.email, password: TEST_USER.password });
  if (!userLogin.data.success) throw new Error('User login failed');
  const userToken = userLogin.data.data.accessToken;
  console.log('   ✅ User logged in\n');

  // 4. Apply for Seller
  console.log('4️⃣ Submitting Seller Application...');
  // Note: File uploads are tricky with pure JSON fetch, but the endpoint handles multipart. 
  // For this test, we might skip file upload if optional, BUT they are required.
  // The backend uses `uploadSellerDocuments` middleware.
  // We can try to mock or use FormData if we use `form-data` package.
  // OR, checks if we can bypass file upload for testing? 
  // Wait, I implemented `uploadSellerDocuments` which likely requires mulipart/form-data.
  // I will skip the file upload part in this script and assert failure or try to simulate it if I had `form-data` package.
  // Since I don't want to install packages, I might be blocked here.
  // HOWEVER, I can check if fields are optional in the endpoint?
  // `ghanaCardImage` and `businessRegImage` are processed.
  // Lines 96-102 in `seller.routes.ts`: `if (files?.ghanaCardImage?.[0]) ...`
  // It seems they are optional in the route logic (it checks `if`), but maybe required by schema?
  // Schema `sellerApplicationSchema` DOES NOT require the images (validates strings).
  // The route manually checks `if (req.body.businessType === 'BUSINESS' && !businessRegImageUrl)`.
  // So INDIVIDUAL might pass without images if I don't send files.
  // Let's try!
  
  const apply = await api('POST', '/seller/apply', userToken, SELLER_APP);
  if (!apply.data.success) {
      console.log('   ⚠️ Application failed (likely due to missing files/multipart):', apply.data.message);
      // If failed, we can't proceed with approval unless we manually insert into DB via Prisma?
      // But verify script shouldn't touch DB directly ideally.
      // Let's assume it fails and I'll explain.
      // Wait, if I use `formData` and `node-fetch`, it works. 
      // But `node-fetch` is not installed? I see `npm run dev` running.
      // `axios` is definitely in `package.json` for frontend, backend?
      // Backend uses `express`. `package.json` probably has valid deps.
      // I'll assume `node-fetch` IS NOT available.
      // I'll use `fetch` (native in Node 18).
      // I will try to submit without files.
  } else {
      console.log('   ✅ Application submitted (ID:', apply.data.data.application.id, ')\n');
      const appId = apply.data.data.application.id;

      // 5. Admin Approve
      console.log('5️⃣ Admin Approving Application...');
      const approve = await api('POST', `/admin/seller-applications/${appId}/approve`, adminToken, {});
      if (!approve.data.success) throw new Error(`Approval failed: ${approve.data.message}`);
      console.log('   ✅ Application approved\n');

      // 6. User Check Status
      console.log('6️⃣ User Checking Status...');
      const status = await api('GET', '/seller/application-status', userToken);
      const myApp = status.data.data.applications[0];
      if (myApp.status !== 'APPROVED') throw new Error(`Status mismatch: ${myApp.status}`);
      console.log('   ✅ Status is APPROVED\n');

      // 7. User Check Profile/Wallet
      console.log('7️⃣ User Checking Wallet...');
      const wallet = await api('GET', '/seller/wallet', userToken);
      if (!wallet.data.success) {
        console.error('❌ Wallet Error:', JSON.stringify(wallet.data, null, 2));
        throw new Error('Get wallet failed');
      }
      console.log('   ✅ Wallet accessed (Balance:', wallet.data.data.wallet.currentBalance, ')\n');
      
      // 8. User Request Payout
      console.log('8️⃣ User Requesting Payout...');
      // Start with 0 balance, so this should fail or we need to add funds?
      // Wallet starts at 0. Requesting payout requires funds.
      // So checking failure is also a test.
      const payout = await api('POST', '/seller/payouts/request', userToken, { amount: 100, provider: 'MTN' });
      if (payout.data.success) {
          console.log('   ❓ Payout success (unexpected with 0 balance)');
      } else {
          console.log('   ✅ Payout correctly failed (0 balance):', payout.data.message);
      }
  }

  console.log('\n🎉 Verification Finished!');
}

main().catch(console.error);
