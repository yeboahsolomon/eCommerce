import prisma from './src/config/database.js';

async function main() {
  try {
    const deleted = await prisma.user.deleteMany({});
    console.log(`Successfully deleted ${deleted.count} users.`);
  } catch (error) {
    console.error('Error deleting users. Attempting to delete related records first...');
    // If there are foreign key constraints for non-cascading relations like Orders
    await prisma.order.deleteMany({});
    await prisma.sellerProfile.deleteMany({});
    
    const deleted = await prisma.user.deleteMany({});
    console.log(`Successfully deleted ${deleted.count} users after clearing related records.`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
