import 'dotenv/config';
import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FILE_PATH = './partners FOR UAE.xlsx';

const toStringOrNull = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

const toNumberOrNull = (value) => {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const toIntOrNull = (value) => {
  const num = toNumberOrNull(value);
  if (num == null) return null;
  return Number.isFinite(num) ? Math.trunc(num) : null;
};

const toBooleanOrNull = (value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  return null;
};

const compactData = (data) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

const buildWhere = (partnerEmail, partnerName, partnerMobileNumber, cityName, country) => {
  const where = {};
  if (partnerEmail) {
    where.partnerEmail = partnerEmail;
    return where;
  }
  if (partnerName) where.partnerName = partnerName;
  if (partnerMobileNumber) where.partnerMobileNumber = partnerMobileNumber;
  if (cityName) where.cityName = cityName;
  if (country) where.country = country;
  return where;
};

async function importPartners() {
  console.log('Reading Excel file...');

  const workbook = XLSX.readFile(FILE_PATH);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  console.log(`Found ${rows.length} rows.`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNum = index + 2; // header row is 1

    const partnerName = toStringOrNull(row.partnerName);
    if (!partnerName) {
      console.log(`Row ${rowNum}: Skipped (missing partnerName).`);
      skippedCount++;
      continue;
    }

    const partnerEmail = toStringOrNull(row.partnerEmail);
    const partnerMobileNumber = toStringOrNull(row.partnerMobileNumber);
    const cityName = toStringOrNull(row.cityName);
    const country = toStringOrNull(row.country);

    const data = compactData({
      partnerName,
      partnerEmail,
      shopName: toStringOrNull(row.shopName),
      partnerMobileNumber,
      cityName,
      country,
      fullAddress: toStringOrNull(row.fullAddress),
      rvmpNumber: toStringOrNull(row.rvmpNumber),
      qualificationDegree: toStringOrNull(row.qualificationDegree),
      zipcode: toStringOrNull(row.zipcode),
      state: toStringOrNull(row.state),
      areaTown: toStringOrNull(row.areaTown),
      specialization: toStringOrNull(row.specialization),
      species: toStringOrNull(row.species),
      partnerType: toStringOrNull(row.partnerType),
      numberOfAnimals: toIntOrNull(row.numberOfAnimals),
      isPremium: toBooleanOrNull(row.isPremium),
      referralCode: toStringOrNull(row.referralCode),
      walletBalance: toNumberOrNull(row.walletBalance),
    });

    try {
      const where = buildWhere(partnerEmail, partnerName, partnerMobileNumber, cityName, country);
      if (Object.keys(where).length === 0) {
        console.log(`Row ${rowNum}: Skipped (not enough unique data to match).`);
        skippedCount++;
        continue;
      }

      const existing = await prisma.partner.findFirst({ where });

      if (existing) {
        await prisma.partner.update({
          where: { id: existing.id },
          data
        });
        console.log(`Row ${rowNum}: Updated ${partnerName} (ID ${existing.id}).`);
        updatedCount++;
      } else {
        const created = await prisma.partner.create({ data });
        console.log(`Row ${rowNum}: Created ${partnerName} (ID ${created.id}).`);
        createdCount++;
      }
    } catch (error) {
      console.error(`Row ${rowNum}: Error for ${partnerName}: ${error.message}`);
      errorCount++;
    }
  }

  console.log('----------------------------------------');
  console.log(`Created: ${createdCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

importPartners()
  .catch((error) => {
    console.error('Fatal error:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
