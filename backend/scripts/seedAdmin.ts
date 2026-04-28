import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding superadmin account...");

  const superAdminEmail = process.env.SUPERADMIN_EMAIL || "admin@ecommerce.com";
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD || "superadmin123";
  const superAdminPhone = process.env.SUPERADMIN_PHONE || "0200000000";

  // Check if a superadmin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "SUPERADMIN" },
  });

  if (existingAdmin) {
    console.log("A SUPERADMIN account already exists:", existingAdmin.email);
    console.log("Skipping seed.");
    return;
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(superAdminPassword, salt);

  // Create superadmin
  const newAdmin = await prisma.user.create({
    data: {
      email: superAdminEmail,
      password: passwordHash,
      firstName: "Super",
      lastName: "Admin",
      phone: superAdminPhone,
      role: "SUPERADMIN",
      status: "ACTIVE",
      emailVerified: true,
      phoneVerified: true,
    },
  });

  console.log("Successfully created SUPERADMIN account!");
  console.log("Email:", newAdmin.email);
}

main()
  .catch((e) => {
    console.error("Error seeding superadmin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
