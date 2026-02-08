import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { validateAdminSession } from '@/lib/auth/admin-auth';
import * as XLSX from 'xlsx';

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

function fileNameForType(type: BackupType) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${type}-backup-${stamp}.xlsx`;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await validateAdminSession(token);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as BackupType | null;

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
  const filename = fileNameForType(type);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
