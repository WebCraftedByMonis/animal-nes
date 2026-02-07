import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { validateCompanySession } from '@/lib/auth/company-auth'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('company-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const company = await validateCompanySession(token)
    if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const discounts = await prisma.discount.findMany({
      where: { companyId: company.id },
      include: {
        product: { select: { id: true, productName: true } },
        variant: { select: { id: true, packingVolume: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Also fetch company products for the picker
    const products = await prisma.product.findMany({
      where: { companyId: company.id },
      select: {
        id: true,
        productName: true,
        variants: { select: { id: true, packingVolume: true } },
      },
    })

    return NextResponse.json({ discounts, products })
  } catch (error) {
    console.error('Error fetching discounts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('company-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const company = await validateCompanySession(token)
    if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, percentage, startDate, endDate, isActive, scope, productId, variantId } = body

    if (!name || !percentage || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate ownership if product/variant scope
    if (scope === 'product' && productId) {
      const product = await prisma.product.findFirst({ where: { id: productId, companyId: company.id } })
      if (!product) return NextResponse.json({ error: 'Product not found or not owned by your company' }, { status: 400 })
    }

    if (scope === 'variant' && variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: variantId, product: { companyId: company.id } },
      })
      if (!variant) return NextResponse.json({ error: 'Variant not found or not owned by your company' }, { status: 400 })
    }

    const discount = await prisma.discount.create({
      data: {
        name,
        percentage: parseFloat(percentage),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive !== false,
        companyId: company.id,
        productId: scope === 'product' || scope === 'variant' ? productId : null,
        variantId: scope === 'variant' ? variantId : null,
      },
    })

    return NextResponse.json({ discount })
  } catch (error) {
    console.error('Error creating discount:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('company-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const company = await validateCompanySession(token)
    if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, name, percentage, startDate, endDate, isActive } = body

    if (!id) return NextResponse.json({ error: 'Discount ID required' }, { status: 400 })

    // Verify ownership
    const existing = await prisma.discount.findFirst({ where: { id, companyId: company.id } })
    if (!existing) return NextResponse.json({ error: 'Discount not found' }, { status: 404 })

    const discount = await prisma.discount.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(percentage !== undefined && { percentage: parseFloat(percentage) }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ discount })
  } catch (error) {
    console.error('Error updating discount:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('company-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const company = await validateCompanySession(token)
    if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = parseInt(searchParams.get('id') || '')

    if (!id) return NextResponse.json({ error: 'Discount ID required' }, { status: 400 })

    // Verify ownership
    const existing = await prisma.discount.findFirst({ where: { id, companyId: company.id } })
    if (!existing) return NextResponse.json({ error: 'Discount not found' }, { status: 404 })

    await prisma.discount.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting discount:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
