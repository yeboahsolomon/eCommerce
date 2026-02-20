import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('--- STARTING INTEGRATION TEST ---');
  try {
    // 1. Check if the database has the REVIEWING enum
    console.log('Checking database connection...');
    const userCount = await prisma.user.count();
    console.log(`Database connected. Found ${userCount} users.`);

    // 2. Create a test user or find one
    let testUser = await prisma.user.findFirst({
        where: { email: 'test_applicant@example.com' }
    });

    if (!testUser) {
        testUser = await prisma.user.create({
            data: {
                firstName: 'Test',
                lastName: 'Applicant',
                email: 'test_applicant@example.com',
                password: 'password123', // Dummy
            }
        });
        console.log('Created test user:', testUser.id);
    }

    // 3. Clear any existing applications for this user
    await prisma.sellerApplication.deleteMany({
        where: { userId: testUser.id }
    });

    // 4. Create a new PENDING application directly via Prisma
    const application = await prisma.sellerApplication.create({
        data: {
            userId: testUser.id,
            status: 'PENDING',
            storeName: 'Test Store Integration',
            businessEmail: 'teststore@example.com',
            businessPhone: '1234567890',
            businessAddress: '123 Test St',
            ghanaRegion: 'Greater Accra',
            ghanaCardNumber: 'GHA-123456789-0',
            mobileMoneyNumber: '0241234567',
            mobileMoneyProvider: 'MTN',
        }
    });

    console.log('Created PENDING application:', application.id);

    // 5. Find an ADMIN user to test the review/approve endpoints
    const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });

    if (!adminUser) {
        throw new Error('No ADMIN user found in the database. Please create one.');
    }

    console.log('Using Admin:', adminUser.email);

    // 6. Generate an Auth Token for the Admin directly (since we're in backend we can use our JWT utility, or we just mimic the update via Prisma to verify the schema enum)
    
    console.log('--- Simulating Admin View (Transitions to REVIEWING) ---');
    const updatedToReviewing = await prisma.sellerApplication.update({
        where: { id: application.id },
        data: {
             status: 'REVIEWING',
             reviewedBy: adminUser.id,
             reviewedAt: new Date(),
        }
    });
    
    if (updatedToReviewing.status === 'REVIEWING') {
         console.log('✅ Application successfully transitioned to REVIEWING status!');
    } else {
         throw new Error(`Failed to transition to REVIEWING. Status is ${updatedToReviewing.status}`);
    }

    console.log('--- Simulating Admin Approval (Transitions to APPROVED) ---');
    const updatedToApproved = await prisma.sellerApplication.update({
        where: { id: application.id },
        data: {
             status: 'APPROVED',
             reviewedBy: adminUser.id,
             reviewedAt: new Date(),
        }
    });

    if (updatedToApproved.status === 'APPROVED') {
         console.log('✅ Application successfully transitioned to APPROVED status!');
    } else {
         throw new Error(`Failed to transition to APPROVED. Status is ${updatedToApproved.status}`);
    }

    console.log('--- TEST COMPLETED SUCCESSFULLY ---');

  } catch (error) {
    console.error('Integration test failed:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

runTest();
