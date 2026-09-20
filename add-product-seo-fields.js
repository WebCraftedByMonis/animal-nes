// scripts/add-product-seo-fields.js
// Adds the new SEO/schema columns to Product and creates the ProductFaq
// table (see prisma/schema.prisma). Run this once against the target
// database after deploying — same pattern as add-featured-company-table.js.
// Safe to re-run: skips anything that already exists.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const NEW_COLUMNS = [
  { name: 'metaTitle', ddl: 'ADD COLUMN `metaTitle` VARCHAR(255) NULL' },
  { name: 'metaDescription', ddl: 'ADD COLUMN `metaDescription` TEXT NULL' },
  { name: 'focusKeyword', ddl: 'ADD COLUMN `focusKeyword` VARCHAR(255) NULL' },
  { name: 'schemaBrand', ddl: 'ADD COLUMN `schemaBrand` VARCHAR(255) NULL' },
  { name: 'sku', ddl: 'ADD COLUMN `sku` VARCHAR(100) NULL' },
  { name: 'gtin', ddl: 'ADD COLUMN `gtin` VARCHAR(20) NULL' },
  { name: 'mpn', ddl: 'ADD COLUMN `mpn` VARCHAR(100) NULL' },
];

async function columnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table,
    column
  );
  return rows.length > 0;
}

async function main() {
  try {
    console.log('🔧 Adding Product SEO/schema columns...\n');

    for (const { name, ddl } of NEW_COLUMNS) {
      if (await columnExists('Product', name)) {
        console.log(`✓ Product.${name} already exists, skipping`);
        continue;
      }
      await prisma.$executeRawUnsafe(`ALTER TABLE \`Product\` ${ddl}`);
      console.log(`✅ Added Product.${name}`);
    }

    console.log('\n🔧 Creating ProductFaq table...\n');

    const existingTable = await prisma.$queryRaw`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ProductFaq'
    `;

    if (existingTable.length > 0) {
      console.log('✓ ProductFaq table already exists!');
    } else {
      await prisma.$executeRaw`
        CREATE TABLE \`ProductFaq\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`productId\` INT NOT NULL,
          \`question\` TEXT NOT NULL,
          \`answer\` TEXT NOT NULL,
          \`order\` INT NOT NULL DEFAULT 0,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;

      await prisma.$executeRaw`
        CREATE INDEX \`ProductFaq_productId_idx\` ON \`ProductFaq\`(\`productId\`)
      `;

      await prisma.$executeRaw`
        ALTER TABLE \`ProductFaq\`
          ADD CONSTRAINT \`ProductFaq_productId_fkey\`
          FOREIGN KEY (\`productId\`) REFERENCES \`Product\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      `;

      console.log('✅ Successfully created ProductFaq table!');
    }

    console.log('\n🎉 Database update completed! Run `npx prisma generate` next.\n');
  } catch (error) {
    console.error('❌ Error updating schema:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
