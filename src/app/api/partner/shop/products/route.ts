import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { validatePartnerSession } from '@/lib/auth/partner-auth'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('partner-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const partner = await validatePartnerSession(token)
    if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const companyId = searchParams.get('companyId') || ''
    const minPrice = parseFloat(searchParams.get('minPrice') || '0')
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '0')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sort = searchParams.get('sort') || 'newest'

    const where: any = {
      isActive: true,
      outofstock: false,
      // Filter by partner's country
      ...(partner.country ? {
        company: { country: partner.country }
      } : {}),
    }

    if (search) {
      where.OR = [
        { productName: { contains: search } },
        { genericName: { contains: search } },
        { category: { contains: search } },
      ]
    }

    if (category) {
      where.category = { contains: category }
    }

    if (companyId) {
      where.companyId = parseInt(companyId)
    }

    // Price filter on companyPrice
    if (minPrice > 0 || maxPrice > 0) {
      where.variants = {
        some: {
          companyPrice: {
            ...(minPrice > 0 ? { gte: minPrice } : {}),
            ...(maxPrice > 0 ? { lte: maxPrice } : {}),
          }
        }
      }
    }

    const orderBy: any = sort === 'price_asc'
      ? { variants: { _count: 'asc' } }
      : sort === 'price_desc'
      ? { variants: { _count: 'desc' } }
      : sort === 'name_asc'
      ? { productName: 'asc' }
      : { createdAt: 'desc' }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          image: true,
          company: { select: { id: true, companyName: true } },
          variants: true,
          discounts: {
            where: {
              isActive: true,
              startDate: { lte: new Date() },
              endDate: { gte: new Date() },
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    // Also fetch categories and companies for filters
    const categories = await prisma.product.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
    })

    const companies = await prisma.company.findMany({
      where: partner.country ? { country: partner.country } : {},
      select: { id: true, companyName: true },
    })

    return NextResponse.json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      categories: categories.map(c => c.category).filter(Boolean),
      companies,
    })
  } catch (error) {
    console.error('Error fetching partner shop products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
