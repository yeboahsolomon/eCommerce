import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function seed() {
  console.log('🌱 Starting SuperAdmin seed process...');

  try {
    const adminEmail = process.env.ADMIN_SEED_EMAIL;
    const adminPassword = process.env.ADMIN_SEED_PASSWORD;
    const adminName = process.env.ADMIN_SEED_NAME || 'Super Admin';

    if (!adminEmail || !adminPassword) {
      console.error('❌ ERROR: ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be defined in .env');
      process.exit(1);
    }

    // 1. Migrate existing SUPERADMINs from User table
    const existingSuperAdminUsers = await prisma.user.findMany({
      where: { role: 'SUPERADMIN' }
    });

    console.log(`Found ${existingSuperAdminUsers.length} existing SUPERADMINs in the User table.`);

    for (const user of existingSuperAdminUsers) {
      const existingInNewTable = await prisma.superAdmin.findUnique({
        where: { email: user.email.toLowerCase() }
      });

      if (!existingInNewTable) {
        console.log(`Migrating ${user.email} to SuperAdmin table...`);
        await prisma.superAdmin.create({
          data: {
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email.toLowerCase(),
            passwordHash: user.password, // Re-use existing bcrypt hash
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            isActive: user.status === 'ACTIVE',
            lastLoginAt: user.lastLoginAt,
          }
        });
      }
    }

    // 2. Ensure the seeded SuperAdmin from .env exists
    const existingSeedAdmin = await prisma.superAdmin.findUnique({
      where: { email: adminEmail.toLowerCase() },
    });

    if (existingSeedAdmin) {
      console.log(`✅ SuperAdmin account for ${adminEmail} already exists.`);
    } else {
      console.log(`Creating initial SuperAdmin from .env credentials: ${adminEmail}`);
      const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);
      
      await prisma.superAdmin.create({
        data: {
          name: adminName,
          email: adminEmail.toLowerCase(),
          passwordHash: hashedPassword,
          isActive: true,
        },
      });
      console.log('✅ Initial SuperAdmin created successfully!');
    }

  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
    console.log('🌱 Seeding process complete.');
  }
}

seed();
