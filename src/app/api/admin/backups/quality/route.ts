import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { validateAdminSession } from '@/lib/auth/admin-auth'
import * as XLSX from 'xlsx'

async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin-token')?.value
  if (!token) return null
  return validateAdminSession(token)
}

export const runtime = 'nodejs'
export const maxDuration = 60

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

const EXCEL_MAX_CELL_LENGTH = 32767

function sanitizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'string' && v.length > EXCEL_MAX_CELL_LENGTH ? v.slice(0, EXCEL_MAX_CELL_LENGTH) : v
  }
  return out
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const noTaxonomy = searchParams.get('noTaxonomy') === 'true'
  const noPrice    = searchParams.get('noPrice')    === 'true'
  const noImage    = searchParams.get('noImage')    === 'true'

  if (!noTaxonomy && !noPrice && !noImage) {
    return NextResponse.json({ error: 'Select at least one quality filter' }, { status: 400 })
  }

  const orConditions: object[] = []

  if (noTaxonomy) {
    orConditions.push(
      { category: null },
      { category: '' },
      { category: 'Uncategorized' },
      { genericName: null },
      { genericName: '' },
      { subCategory: null },
      { subCategory: '' },
      { subCategory: 'General' },
      { subsubCategory: null },
      { subsubCategory: '' },
    )
  }

  if (noPrice) {
    orConditions.push({ variants: { none: { customerPrice: { not: null } } } })
  }

  if (noImage) {
    orConditions.push({ image: { is: null } })
  }

  const products = await prisma.product.findMany({
    where: { isActive: true, OR: orConditions },
    include: {
      company: { select: { id: true, companyName: true } },
      partner: { select: { id: true, partnerName: true } },
      variants: { orderBy: { id: 'asc' } },
      image: true,
    },
    orderBy: { id: 'asc' },
  })

  const rows = products.flatMap((p) => {
    const base = {
      ProductID:      p.id,
      ProductName:    p.productName,
      GenericName:    p.genericName,
      Category:       p.category,
      SubCategory:    p.subCategory,
      SubSubCategory: p.subsubCategory,
      ProductType:    p.productType,
      CompanyID:      p.companyId,
      CompanyName:    p.company?.companyName ?? null,
      PartnerID:      p.partnerId,
      PartnerName:    p.partner?.partnerName ?? null,
      Description:    p.description,
      ProductLink:    p.productLink,
      Dosage:         p.dosage,
      OutOfStock:     p.outofstock,
      IsFeatured:     p.isFeatured,
      IsActive:       p.isActive,
      ImageID:        p.image?.id        ?? null,
      ImageURL:       p.image?.url       ?? null,
      ImageAlt:       p.image?.alt       ?? null,
      ImagePublicId:  p.image?.publicId  ?? null,
      CreatedAt:      toIso(p.createdAt),
      UpdatedAt:      toIso(p.updatedAt),
    }
    if (p.variants.length === 0) {
      return [{ ...base, VariantID: null, PackingVolume: null, CompanyPrice: null, DealerPrice: null, 'Customer Price': null, Inventory: null }]
    }
    return p.variants.map((v) => ({
      ...base,
      VariantID:       v.id,
      PackingVolume:   v.packingVolume,
      CompanyPrice:    v.companyPrice,
      DealerPrice:     v.dealerPrice,
      'Customer Price': v.customerPrice,
      Inventory:       v.inventory,
    }))
  })

  const workbook  = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(rows.map(sanitizeRow))
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Quality Report')

  const buffer   = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  const stamp    = new Date().toISOString().slice(0, 10)
  const filename = `quality-report-${stamp}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
