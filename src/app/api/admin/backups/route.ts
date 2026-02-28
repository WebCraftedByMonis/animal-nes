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
      const id = Number(row.id);
      if (!id) { failed++; errors.push(`Row skipped — missing id`); continue; }
      try {
        const data = {
          companyName: row.companyName ?? null,
          mobileNumber: row.mobileNumber ?? null,
          address: row.address ?? null,
          country: row.country ?? null,
          email: row.email ?? null,
        };
        await prisma.company.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
        imported++;
      } catch (e: any) {
        failed++;
        errors.push(`Company id=${id}: ${e.message}`);
      }
    }
  }

  if (type === 'partners') {
    for (const raw of rows) {
      const row = raw as Record<string, any>;
      const id = Number(row.id);
      if (!id || !row.partnerName) {
        failed++;
        errors.push(`Row skipped — missing id or partnerName`);
        continue;
      }
      try {
        const data = {
          partnerName: String(row.partnerName),
          partnerEmail: row.partnerEmail ?? null,
          shopName: row.shopName ?? null,
          partnerMobileNumber: row.partnerMobileNumber ? String(row.partnerMobileNumber) : null,
          cityName: row.cityName ?? null,
          country: row.country ?? null,
          fullAddress: row.fullAddress ?? null,
          rvmpNumber: row.rvmpNumber ?? null,
          qualificationDegree: row.qualificationDegree ?? null,
          zipcode: row.zipcode ?? null,
          state: row.state ?? null,
          areaTown: row.areaTown ?? null,
          specialization: row.specialization ?? null,
          species: row.species ?? null,
          partnerType: row.partnerType ?? null,
          numberOfAnimals: row.numberOfAnimals ? Number(row.numberOfAnimals) : null,
          isPremium: row.isPremium === true || row.isPremium === 'true' || row.isPremium === 1,
          referralCode: row.referralCode ?? null,
          walletBalance: row.walletBalance ? Number(row.walletBalance) : 0,
        };
        await prisma.partner.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
        imported++;
      } catch (e: any) {
        failed++;
        errors.push(`Partner id=${id}: ${e.message}`);
      }
    }
  }

  if (type === 'products') {
    for (const raw of rows) {
      const row = raw as Record<string, any>;
      const id = Number(row.id);
      const companyId = Number(row.companyId);
      const partnerId = Number(row.partnerId);
      if (!id || !row.productName || !companyId || !partnerId) {
        failed++;
        errors.push(`Row skipped — missing id, productName, companyId, or partnerId`);
        continue;
      }
      try {
        const data = {
          productName: String(row.productName),
          genericName: row.genericName ?? null,
          category: row.category ?? null,
          subCategory: row.subCategory ?? null,
          subsubCategory: row.subsubCategory ?? null,
          productType: row.productType ?? null,
          description: row.description ?? null,
          productLink: row.productLink ?? null,
          dosage: row.dosage ?? null,
          outofstock: row.outofstock === true || row.outofstock === 'true' || row.outofstock === 1,
          isFeatured: row.isFeatured === true || row.isFeatured === 'true' || row.isFeatured === 1,
          isActive: row.isActive === true || row.isActive === 'true' || row.isActive === 1,
          company: { connect: { id: companyId } },
          partner: { connect: { id: partnerId } },
        };
        await prisma.product.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
        imported++;
      } catch (e: any) {
        failed++;
        errors.push(`Product id=${id}: ${e.message}`);
      }
    }
  }

  return NextResponse.json({ imported, failed, errors: errors.slice(0, 20) });
}
