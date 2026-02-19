import 'dotenv/config';
import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const s = (v) => (v == null || v === '' ? null : String(v).trim());

async function fixProductImages() {
  try {
    console.log('📂 Reading Excel file...');

    const workbook = XLSX.readFile('./Dr Jawad Petone shop Monis products.xlsx');
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    console.log(`Found ${rows.length} rows in Excel.\n`);

    let added = 0;
    let skipped = 0;
    let noUrl = 0;
    let notFound = 0;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 2;

      const productName = s(row.ProductName);
      const imageUrl = s(row.ImageURL);

      if (!productName) {
        skipped++;
        continue;
      }

      if (!imageUrl) {
        console.log(`⚠️  Row ${rowNum}: No ImageURL for "${productName}" — skipping`);
        noUrl++;
        continue;
      }

      // Find product by name
      const product = await prisma.product.findFirst({
        where: { productName },
        include: { image: true },
      });

      if (!product) {
        console.log(`❌ Row ${rowNum}: Product not found in DB — "${productName}"`);
        notFound++;
        continue;
      }

      // Already has an image — skip
      if (product.image) {
        console.log(`⏩ Row ${rowNum}: Already has image — "${productName}"`);
        skipped++;
        continue;
      }

      // Create the ProductImage record
      await prisma.productImage.create({
        data: {
          url: imageUrl,
          alt: productName,
          productId: product.id,
        },
      });

      console.log(`✅ Row ${rowNum}: Image added for "${productName}"`);
      added++;
    }

    console.log('\n========================================');
    console.log('📊 Summary:');
    console.log(`   ✅ Images added : ${added}`);
    console.log(`   ⏩ Skipped      : ${skipped}`);
    console.log(`   ⚠️  No URL       : ${noUrl}`);
    console.log(`   ❌ Not in DB    : ${notFound}`);
    console.log('========================================');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProductImages().catch(console.error);
