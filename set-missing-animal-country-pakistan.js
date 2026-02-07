/**
 * Migration Script: Set missing country for animals (SellAnimal)
 *
 * Usage:
 *   node set-missing-animal-country-pakistan.js
 *   node set-missing-animal-country-pakistan.js --dry-run
 *
 * Optional:
 *   DEFAULT_COUNTRY=Pakistan node set-missing-animal-country-pakistan.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_COUNTRY = process.env.DEFAULT_COUNTRY || 'Pakistan';
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  try {
    console.log(`\n=== Set Missing Animal Country (${DEFAULT_COUNTRY}) ===`);

    const animalWhere = {
      OR: [{ country: null }, { country: '' }],
    };

    const animalCount = await prisma.sellAnimal.count({ where: animalWhere });

    console.log(`Animals missing country: ${animalCount}`);

    if (DRY_RUN) {
      console.log('\nDry run enabled. No changes were made.');
      return;
    }

    const animalResult = await prisma.sellAnimal.updateMany({
      where: animalWhere,
      data: { country: DEFAULT_COUNTRY },
    });

    console.log('\nUpdate complete:');
    console.log(`  Animals updated: ${animalResult.count}`);
  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
