import 'dotenv/config';
import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to clean strings
const s = (v) => (v == null || v === '' ? null : String(v).trim());

async function importProducts() {
  try {
    console.log('📂 Reading Excel file...');

    const workbook = XLSX.readFile('./Final Madina Medicose monis List.xlsx');
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    console.log(`Found ${rows.length} products to import.\n`);

    // Cache for companies and partners to avoid repeated lookups
    const companyCache = new Map();
    const partnerCache = new Map();

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 2; // Excel rows start at 1, plus header

      const productName = s(row.ProductName);
      const companyName = s(row.CompanyName);
      const partnerName = s(row.PartnerName);

      if (!productName) {
        console.log(`⚠️ Row ${rowNum}: Skipping - no ProductName`);
        skippedCount++;
        continue;
      }

      try {
        // Get or create Company
        let companyId = null;
        if (companyName) {
          if (companyCache.has(companyName)) {
            companyId = companyCache.get(companyName);
          } else {
            let company = await prisma.company.findFirst({
              where: { companyName }
            });
            if (!company) {
              company = await prisma.company.create({
                data: { companyName }
              });
              console.log(`  ✨ Created company: ${companyName}`);
            }
            companyId = company.id;
            companyCache.set(companyName, companyId);
          }
        }

        // Get or create Partner
        let partnerId = null;
        if (partnerName) {
          if (partnerCache.has(partnerName)) {
            partnerId = partnerCache.get(partnerName);
          } else {
            let partner = await prisma.partner.findFirst({
              where: { partnerName }
            });
            if (!partner) {
              partner = await prisma.partner.create({
                data: { partnerName }
              });
              console.log(`  ✨ Created partner: ${partnerName}`);
            }
            partnerId = partner.id;
            partnerCache.set(partnerName, partnerId);
          }
        }

        if (!companyId || !partnerId) {
          console.log(`⚠️ Row ${rowNum}: Missing company or partner for "${productName}"`);
          skippedCount++;
          continue;
        }

        // Check if product already exists
        const existingProduct = await prisma.product.findFirst({
          where: {
            productName,
            companyId,
            partnerId
          }
        });

        if (existingProduct) {
          console.log(`⏩ Row ${rowNum}: Product already exists - "${productName}"`);
          skippedCount++;
          continue;
        }

        // Create Product with Variant
        const product = await prisma.product.create({
          data: {
            productName,
            genericName: s(row.GenericName),
            category: s(row.Category),
            subCategory: s(row.SubCategory),
            subsubCategory: s(row.SubSubCategory),
            productType: s(row.ProductType),
            companyId,
            partnerId,
            description: s(row.Description),
            productLink: s(row.ProductLink),
            dosage: s(row.Dosage),
            outofstock: row.OutOfStock === true || row.OutOfStock === 'true' || row.OutOfStock === 1,
            isFeatured: row.IsFeatured === true || row.IsFeatured === 'true' || row.IsFeatured === 1,
            isActive: row.IsActive === true || row.IsActive === 'true' || row.IsActive === 1 || row.IsActive === '',
            variants: {
              create: {
                packingVolume: s(row.PackingVolume) || productName,
                companyPrice: parseFloat(row.CompanyPrice) || null,
                dealerPrice: parseFloat(row.DealerPrice) || null,
                customerPrice: parseFloat(row['Customer Price']) || null,
                inventory: parseInt(row.Inventory) || 0
              }
            }
          }
        });

        console.log(`✅ Row ${rowNum}: Created "${productName}" (ID: ${product.id})`);
        successCount++;

      } catch (error) {
        console.error(`❌ Row ${rowNum}: Error creating "${productName}":`, error.message);
        errorCount++;
      }
    }

    console.log('\n========================================');
    console.log('📊 Import Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⏩ Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('========================================');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importProducts().catch(console.error);
