import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { validateAdminSession } from '@/lib/auth/admin-auth';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-token')?.value;
  if (!token) return null;
  return validateAdminSession(token);
}

export const runtime = 'nodejs';
export const maxDuration = 60;

type BackupType = 'products' | 'companies' | 'partners';

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type, country = 'Pakistan', rows } = await request.json();

  if (!type || !['products', 'companies', 'partners'].includes(type)) {
    return NextResponse.json({ error: 'Invalid backup type' }, { status: 400 });
  }
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: 'rows must be an array' }, { status: 400 });
  }

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

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
        const rowId = row.id ? parseInt(String(row.id)) : null;
        let existing = null;
        if (rowId && !isNaN(rowId)) {
          existing = await prisma.company.findUnique({ where: { id: rowId } });
        }
        if (!existing) {
          existing = await prisma.company.findFirst({ where: { companyName } });
        }
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

        const rowId = row.id ? parseInt(String(row.id)) : null;
        let existing = null;
        if (rowId && !isNaN(rowId)) {
          existing = await prisma.partner.findUnique({ where: { id: rowId } });
        }
        if (!existing) {
          existing = await prisma.partner.findFirst({ where });
        }
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
        } else if (row.companyId) {
          const numId = parseInt(String(row.companyId));
          if (!isNaN(numId)) {
            const company = await prisma.company.findUnique({ where: { id: numId } });
            if (company) resolvedCompanyId = company.id;
          }
        }

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
        } else if (row.partnerId) {
          const numId = parseInt(String(row.partnerId));
          if (!isNaN(numId)) {
            const partner = await prisma.partner.findUnique({ where: { id: numId } });
            if (partner) resolvedPartnerId = partner.id;
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

        const rowProductId = row.id ? parseInt(String(row.id)) : null;
        let existing = null;
        if (rowProductId && !isNaN(rowProductId)) {
          existing = await prisma.product.findUnique({ where: { id: rowProductId } });
        }
        if (!existing) {
          existing = await prisma.product.findFirst({
            where: { productName, companyId: resolvedCompanyId, partnerId: resolvedPartnerId },
          });
        }

        const packingVolume  = s(row.packingVolume  ?? row.PackingVolume);
        const companyPrice   = row.companyPrice  != null && row.companyPrice  !== '' ? parseFloat(row.companyPrice)  : (row.CompanyPrice  != null && row.CompanyPrice  !== '' ? parseFloat(row.CompanyPrice)  : null);
        const dealerPrice    = row.dealerPrice   != null && row.dealerPrice   !== '' ? parseFloat(row.dealerPrice)   : (row.DealerPrice   != null && row.DealerPrice   !== '' ? parseFloat(row.DealerPrice)   : null);
        const customerPrice  = row.customerPrice != null && row.customerPrice !== '' ? parseFloat(row.customerPrice) : (row['Customer Price'] != null && row['Customer Price'] !== '' ? parseFloat(row['Customer Price']) : null);
        const inventory      = row.inventory != null && row.inventory !== '' ? parseInt(String(row.inventory)) : (row.Inventory != null && row.Inventory !== '' ? parseInt(String(row.Inventory)) : 0);
        const hasVariant     = packingVolume || companyPrice != null || dealerPrice != null || customerPrice != null;

        if (existing) {
          await prisma.product.update({ where: { id: existing.id }, data: productData });
          if (hasVariant) {
            const variantData = {
              packingVolume: packingVolume || productName,
              companyPrice:  Number.isFinite(companyPrice!)  ? companyPrice  : null,
              dealerPrice:   Number.isFinite(dealerPrice!)   ? dealerPrice   : null,
              customerPrice: Number.isFinite(customerPrice!) ? customerPrice : null,
              inventory:     Number.isFinite(inventory)      ? inventory     : 0,
            };
            const rowVariantId = row.variantId ? parseInt(String(row.variantId)) : null;
            let existingVariant = null;
            if (rowVariantId && !isNaN(rowVariantId)) {
              existingVariant = await prisma.productVariant.findUnique({ where: { id: rowVariantId } });
            }
            if (!existingVariant && packingVolume) {
              existingVariant = await prisma.productVariant.findFirst({
                where: { productId: existing.id, packingVolume },
              });
            }
            if (!existingVariant) {
              existingVariant = await prisma.productVariant.findFirst({ where: { productId: existing.id } });
            }
            if (existingVariant) {
              await prisma.productVariant.update({ where: { id: existingVariant.id }, data: variantData });
            } else {
              await prisma.productVariant.create({ data: { productId: existing.id, ...variantData } });
            }
          }
        } else {
          await prisma.product.create({
            data: {
              ...productData,
              ...(hasVariant ? {
                variants: {
                  create: {
                    packingVolume: packingVolume || productName,
                    companyPrice:  Number.isFinite(companyPrice!)  ? companyPrice  : null,
                    dealerPrice:   Number.isFinite(dealerPrice!)   ? dealerPrice   : null,
                    customerPrice: Number.isFinite(customerPrice!) ? customerPrice : null,
                    inventory:     Number.isFinite(inventory)      ? inventory     : 0,
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
