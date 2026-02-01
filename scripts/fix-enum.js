require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('Starting migration of PartnerStatus...');

  try {
    // 1. Alter column to TEXT to break dependency on old Enum
    console.log('Altering status column to TEXT...');
    // We use executeRawUnsafe to bypass any client-side validation
    await prisma.$executeRawUnsafe(`ALTER TABLE "Partner" ALTER COLUMN "status" TYPE text;`);

    // 2. Update values to match new Enum
    console.log('Updating values...');
    
    // Onboarding -> ONBOARDING
    const r1 = await prisma.$executeRawUnsafe(`UPDATE "Partner" SET "status" = 'ONBOARDING' WHERE "status" = 'Onboarding';`);
    console.log(`Updated Onboarding: ${r1}`);

    // Sandbox -> DRAFT
    const r2 = await prisma.$executeRawUnsafe(`UPDATE "Partner" SET "status" = 'DRAFT' WHERE "status" = 'Sandbox';`);
    console.log(`Updated Sandbox -> DRAFT: ${r2}`);

    // Issue -> SUSPENDED
    const r3 = await prisma.$executeRawUnsafe(`UPDATE "Partner" SET "status" = 'SUSPENDED' WHERE "status" = 'Issue';`);
    console.log(`Updated Issue -> SUSPENDED: ${r3}`);

    // Production -> LIVE
    const r4 = await prisma.$executeRawUnsafe(`UPDATE "Partner" SET "status" = 'LIVE' WHERE "status" = 'Production';`);
    console.log(`Updated Production -> LIVE: ${r4}`);

    // 3. Drop the old enum type cleanup (Prisma might recreate it as PartnerStatus_new then rename)
    // We'll let prisma db push handle the conversion back to Enum, which should work since values are now valid.
    
    console.log('Migration of values complete. You can now run "npx prisma db push" safely.');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
