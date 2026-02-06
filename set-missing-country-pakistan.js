/**
 * Migration Script: Set missing country for companies and partners
 *
 * Usage:
 *   node set-missing-country-pakistan.js
 *   node set-missing-country-pakistan.js --dry-run
 *
 * Optional:
 *   DEFAULT_COUNTRY=Pakistan node set-missing-country-pakistan.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_COUNTRY = process.env.DEFAULT_COUNTRY || 'Pakistan';
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  try {
    console.log(`\n=== Set Missing Country (${DEFAULT_COUNTRY}) ===`);

    const companyWhere = {
      OR: [{ country: null }, { country: '' }],
    };

    const partnerWhere = {
      OR: [{ country: null }, { country: '' }],
    };

    const [companyCount, partnerCount] = await Promise.all([
      prisma.company.count({ where: companyWhere }),
      prisma.partner.count({ where: partnerWhere }),
    ]);

    console.log(`Companies missing country: ${companyCount}`);
    console.log(`Partners missing country: ${partnerCount}`);

    if (DRY_RUN) {
      console.log('\nDry run enabled. No changes were made.');
      return;
    }

    const [companyResult, partnerResult] = await Promise.all([
      prisma.company.updateMany({
        where: companyWhere,
        data: { country: DEFAULT_COUNTRY },
      }),
      prisma.partner.updateMany({
        where: partnerWhere,
        data: { country: DEFAULT_COUNTRY },
      }),
    ]);

    console.log('\nUpdate complete:');
    console.log(`  Companies updated: ${companyResult.count}`);
    console.log(`  Partners updated: ${partnerResult.count}`);
  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
