import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { validateAdminSession } from '@/lib/auth/admin-auth';
import * as XLSX from 'xlsx';

// ─── shared auth helper ───────────────────────────────────────────────────────
async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-token')?.value;
  if (!token) return null;
  return validateAdminSession(token);
}

export const runtime = 'nodejs';
export const maxDuration = 60;

type BackupType = 'products' | 'companies' | 'partners';

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

const EXCEL_MAX_CELL_LENGTH = 32767;

function truncateForExcel(value: unknown): unknown {
  if (typeof value === 'string' && value.length > EXCEL_MAX_CELL_LENGTH) {
    return value.slice(0, EXCEL_MAX_CELL_LENGTH);
  }
  return value;
}

function sanitizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    sanitized[key] = truncateForExcel(value);
  }
  return sanitized;
}

function fileNameForType(type: BackupType, country: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${type}-backup-${country}-${stamp}.xlsx`;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as BackupType | null;
  const country = searchParams.get('country') || 'Pakistan';

  if (!type || !['products', 'companies', 'partners'].includes(type)) {
    return NextResponse.json(
      { error: 'Invalid backup type. Use products, companies, or partners.' },
      { status: 400 }
    );
  }

  let rows: Record<string, unknown>[] = [];
  let sheetName = '';

  if (type === 'products') {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { company: { country: country } },
          { partner: { country: country } },
        ],
      },
      include: {
        company: { select: { id: true, companyName: true } },
        partner: { select: { id: true, partnerName: true } },
      },
      orderBy: { id: 'asc' },
    });

    rows = products.map((product) => ({
      id: product.id,
      productName: product.productName,
      genericName: product.genericName,
      category: product.category,
      subCategory: product.subCategory,
      subsubCategory: product.subsubCategory,
      productType: product.productType,
      companyId: product.companyId,
      companyName: product.company?.companyName ?? null,
      partnerId: product.partnerId,
      partnerName: product.partner?.partnerName ?? null,
      description: product.description,
      productLink: product.productLink,
      dosage: product.dosage,
      outofstock: product.outofstock,
      isFeatured: product.isFeatured,
      isActive: product.isActive,
      createdAt: toIso(product.createdAt),
      updatedAt: toIso(product.updatedAt),
    }));

    sheetName = 'Products';
  }

  if (type === 'companies') {
    const companies = await prisma.company.findMany({
      where: { country: country },
      orderBy: { id: 'asc' },
    });

    rows = companies.map((company) => ({
      id: company.id,
      companyName: company.companyName,
      mobileNumber: company.mobileNumber,
      address: company.address,
      country: company.country,
      email: company.email,
      createdAt: toIso(company.createdAt ?? undefined),
      updatedAt: toIso(company.updatedAt ?? undefined),
    }));

    sheetName = 'Companies';
  }

  if (type === 'partners') {
    const partners = await prisma.partner.findMany({
      where: { country: country },
      orderBy: { id: 'asc' },
    });

    rows = partners.map((partner) => ({
      id: partner.id,
      partnerName: partner.partnerName,
      partnerEmail: partner.partnerEmail,
      shopName: partner.shopName,
      partnerMobileNumber: partner.partnerMobileNumber,
      cityName: partner.cityName,
      country: partner.country,
      fullAddress: partner.fullAddress,
      rvmpNumber: partner.rvmpNumber,
      qualificationDegree: partner.qualificationDegree,
      zipcode: partner.zipcode,
      state: partner.state,
      areaTown: partner.areaTown,
      specialization: partner.specialization,
      species: partner.species,
      partnerType: partner.partnerType,
      numberOfAnimals: partner.numberOfAnimals,
      isPremium: partner.isPremium,
      referralCode: partner.referralCode,
      walletBalance: partner.walletBalance,
      createdAt: toIso(partner.createdAt ?? undefined),
      updatedAt: toIso(partner.updatedAt ?? undefined),
    }));

    sheetName = 'Partners';
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows.map(sanitizeRow));
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const filename = fileNameForType(type, country);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

// ─── POST — restore / upload backup ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const type = formData.get('type') as BackupType | null;
  const country = (formData.get('country') as string | null) || 'Pakistan';
  const file = formData.get('file') as File | null;

  if (!type || !['products', 'companies', 'partners'].includes(type)) {
    return NextResponse.json({ error: 'Invalid backup type' }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Read the xlsx file into rows
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const allRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(firstSheet, { defval: null });

  // For companies and partners the backup includes a `country` column — only
  // restore rows that match the currently selected country so a Pakistan backup
  // can't accidentally overwrite UAE records (and vice-versa).
  // Products don't carry a direct country field so we skip that filter for them.
  const rows = (type === 'products')
    ? allRows
    : allRows.filter((r: any) => !r.country || r.country === country);

  const skippedByCountry = allRows.length - rows.length;

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  if (skippedByCountry > 0) {
    errors.push(`${skippedByCountry} row(s) skipped — country does not match "${country}"`);
  }

  if (type === 'companies') {
    for (const raw of rows) {
      const row = raw as Record<string, any>;
      const s = (v: any) => (v == null || v === '' ? null : String(v).trim());
      const companyName = s(row.companyName);
      if (!companyName) { failed++; errors.push(`Row skipped — missing companyName`); continue; }
      try {
        const data = {
          companyName,
          mobileNumber: s(row.mobileNumber),
          address:      s(row.address),
          country:      s(row.country),
          email:        s(row.email),
        };
        const existing = await prisma.company.findFirst({ where: { companyName } });
        if (existing) {
          await prisma.company.update({ where: { id: existing.id }, data });
        } else {
          await prisma.company.create({ data });
        }
        imported++;
      } catch (e: any) {
        failed++;
        errors.push(`Company "${companyName}": ${e.message}`);
      }
    }
  }

  if (type === 'partners') {
    const s  = (v: any) => (v == null || v === '' ? null : String(v).trim());
    const n  = (v: any) => { if (v == null || v === '') return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
    const ni = (v: any) => { const x = n(v); return x == null ? null : Math.trunc(x); };
    const b  = (v: any) => {
      if (v == null || v === '') return null;
      if (typeof v === 'boolean') return v;
      const norm = String(v).trim().toLowerCase();
      if (['true', 'yes', 'y', '1'].includes(norm)) return true;
      if (['false', 'no', 'n', '0'].includes(norm)) return false;
      return null;
    };

    for (const raw of rows) {
      const row = raw as Record<string, any>;
      const partnerName         = s(row.partnerName);
      if (!partnerName) { failed++; errors.push(`Row skipped — missing partnerName`); continue; }

      const partnerEmail        = s(row.partnerEmail);
      const partnerMobileNumber = s(row.partnerMobileNumber);
      const cityName            = s(row.cityName);
      const rowCountry          = s(row.country);

      // Build only non-null fields (mirrors compactData in import script)
      const data: Record<string, any> = {};
      const set = (k: string, v: any) => { if (v != null) data[k] = v; };
      set('partnerName',         partnerName);
      set('partnerEmail',        partnerEmail);
      set('shopName',            s(row.shopName));
      set('partnerMobileNumber', partnerMobileNumber);
      set('cityName',            cityName);
      set('country',             rowCountry);
      set('fullAddress',         s(row.fullAddress));
      set('rvmpNumber',          s(row.rvmpNumber));
      set('qualificationDegree', s(row.qualificationDegree));
      set('zipcode',             s(row.zipcode));
      set('state',               s(row.state));
      set('areaTown',            s(row.areaTown));
      set('specialization',      s(row.specialization));
      set('species',             s(row.species));
      set('partnerType',         s(row.partnerType));
      set('numberOfAnimals',     ni(row.numberOfAnimals));
      set('isPremium',           b(row.isPremium));
      set('referralCode',        s(row.referralCode));
      set('walletBalance',       n(row.walletBalance));

      try {
        // Match by email first, then by name+mobile+city+country (mirrors import script)
        const where: Record<string, any> = {};
        if (partnerEmail) {
          where.partnerEmail = partnerEmail;
        } else {
          if (partnerName)         where.partnerName         = partnerName;
          if (partnerMobileNumber) where.partnerMobileNumber = partnerMobileNumber;
          if (cityName)            where.cityName            = cityName;
          if (rowCountry)          where.country             = rowCountry;
        }
        if (Object.keys(where).length === 0) {
          failed++; errors.push(`Row skipped — not enough unique data to match "${partnerName}"`); continue;
        }

        const existing = await prisma.partner.findFirst({ where });
        if (existing) {
          await prisma.partner.update({ where: { id: existing.id }, data });
        } else {
          await prisma.partner.create({ data });
        }
        imported++;
      } catch (e: any) {
        failed++;
        errors.push(`Partner "${partnerName}": ${e.message}`);
      }
    }
  }

  if (type === 'products') {
    const companyCache = new Map<string, number>();
    const partnerCache = new Map<string, number>();

    for (const raw of rows) {
      const row = raw as Record<string, any>;
      const s = (v: any) => (v == null || v === '' ? null : String(v).trim());

      const productName = s(row.productName ?? row.ProductName);
      const companyName = s(row.companyName ?? row.CompanyName);
      const partnerName = s(row.partnerName ?? row.PartnerName);

      if (!productName) {
        failed++;
        errors.push(`Row skipped — missing productName`);
        continue;
      }

      try {
        // Resolve companyId by name (lookup or create)
        let resolvedCompanyId: number | null = null;
        if (companyName) {
          if (companyCache.has(companyName)) {
            resolvedCompanyId = companyCache.get(companyName)!;
          } else {
            let company = await prisma.company.findFirst({ where: { companyName } });
            if (!company) company = await prisma.company.create({ data: { companyName } });
            resolvedCompanyId = company.id;
            companyCache.set(companyName, resolvedCompanyId);
          }
        }

        // Resolve partnerId by name (lookup or create)
        let resolvedPartnerId: number | null = null;
        if (partnerName) {
          if (partnerCache.has(partnerName)) {
            resolvedPartnerId = partnerCache.get(partnerName)!;
          } else {
            let partner = await prisma.partner.findFirst({ where: { partnerName } });
            if (!partner) partner = await prisma.partner.create({ data: { partnerName } });
            resolvedPartnerId = partner.id;
            partnerCache.set(partnerName, resolvedPartnerId);
          }
        }

        if (!resolvedCompanyId || !resolvedPartnerId) {
          failed++;
          errors.push(`Row skipped — could not resolve company or partner for "${productName}"`);
          continue;
        }

        const productData = {
          productName,
          genericName:    s(row.genericName    ?? row.GenericName),
          category:       s(row.category       ?? row.Category),
          subCategory:    s(row.subCategory    ?? row.SubCategory),
          subsubCategory: s(row.subsubCategory ?? row.SubSubCategory),
          productType:    s(row.productType    ?? row.ProductType),
          description:    s(row.description    ?? row.Description),
          productLink:    s(row.productLink    ?? row.ProductLink),
          dosage:         s(row.dosage         ?? row.Dosage),
          outofstock: [true, 'true', 1].includes(row.outofstock ?? row.OutOfStock),
          isFeatured: [true, 'true', 1].includes(row.isFeatured ?? row.IsFeatured),
          isActive:   [true, 'true', 1].includes(row.isActive   ?? row.IsActive),
          companyId: resolvedCompanyId,
          partnerId: resolvedPartnerId,
        };

        // Check if product already exists
        const existing = await prisma.product.findFirst({
          where: { productName, companyId: resolvedCompanyId, partnerId: resolvedPartnerId },
        });

        if (existing) {
          await prisma.product.update({ where: { id: existing.id }, data: productData });
        } else {
          // Create product with variant if variant columns are present
          const packingVolume = s(row.PackingVolume ?? row.packingVolume);
          const companyPrice  = parseFloat(row.CompanyPrice  ?? row.companyPrice)  || null;
          const dealerPrice   = parseFloat(row.DealerPrice   ?? row.dealerPrice)   || null;
          const customerPrice = parseFloat(row['Customer Price'] ?? row.customerPrice) || null;
          const inventory     = parseInt(row.Inventory ?? row.inventory)            || 0;

          const hasVariant = packingVolume || companyPrice || dealerPrice || customerPrice;
          await prisma.product.create({
            data: {
              ...productData,
              ...(hasVariant ? {
                variants: {
                  create: {
                    packingVolume: packingVolume || productName,
                    companyPrice,
                    dealerPrice,
                    customerPrice,
                    inventory,
                  },
                },
              } : {}),
            },
          });
        }
        imported++;
      } catch (e: any) {
        failed++;
        errors.push(`"${productName}": ${e.message}`);
      }
    }
  }

  return NextResponse.json({ imported, failed, errors: errors.slice(0, 20) });
}
