// Script to set all products in stock with inventory = 100
// Run with: node set-all-products-instock.js
// NOTE: this only updates stock status (outofstock) and inventory.
// It does NOT touch isActive — manual deactivation decisions are preserved.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to update all products...\n');

  try {
    // Update all products to be in stock (outofstock = false)
    const productsUpdate = await prisma.product.updateMany({
      data: {
        outofstock: false,
      },
    });

    console.log(`Updated ${productsUpdate.count} products to be in stock.\n`);

    // Update all product variants to have inventory = 100
    const variantsUpdate = await prisma.productVariant.updateMany({
      data: {
        inventory: 100,
      },
    });

    console.log(`Updated ${variantsUpdate.count} product variants with inventory = 100.\n`);

    console.log('All products are now in stock with inventory = 100! (isActive unchanged)');
  } catch (error) {
    console.error('Error updating products:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
