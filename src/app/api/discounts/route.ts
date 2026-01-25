import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for creating/updating discounts
const discountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  percentage: z.number().min(0.01, 'Percentage must be greater than 0').max(100, 'Percentage cannot exceed 100'),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  isActive: z.boolean().optional().default(true),
  companyId: z.number().optional().nullable(),
  productIds: z.array(z.number()).optional(), // Support multiple products
  variantId: z.number().optional().nullable(),
  applyToAllCompanyProducts: z.boolean().optional().default(false),
})

// GET - List all discounts with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    const status = searchParams.get('status') // active, scheduled, expired, all
    const companyId = searchParams.get('companyId')
    const productId = searchParams.get('productId')
    const search = searchParams.get('search')

    // Build where clause
    const where: any = {}
    const now = new Date()

    if (status && status !== 'all') {
      if (status === 'active') {
        where.isActive = true
        where.startDate = { lte: now }
        where.endDate = { gte: now }
      } else if (status === 'scheduled') {
        where.isActive = true
        where.startDate = { gt: now }
      } else if (status === 'expired') {
        where.endDate = { lt: now }
      } else if (status === 'disabled') {
        where.isActive = false
      }
    }

    if (companyId) {
      where.OR = [
        { companyId: parseInt(companyId) },
        { product: { companyId: parseInt(companyId) } },
        { variant: { product: { companyId: parseInt(companyId) } } }
      ]
    }

    if (productId) {
      where.OR = [
        { productId: parseInt(productId) },
        { variant: { productId: parseInt(productId) } }
      ]
    }

    if (search) {
      where.name = { contains: search }
    }

    const [discounts, total] = await Promise.all([
      prisma.discount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: {
              id: true,
              companyName: true,
              image: { select: { url: true } }
            }
          },
          product: {
            select: {
              id: true,
              productName: true,
              image: { select: { url: true } }
            }
          },
          variant: {
            select: {
              id: true,
              packingVolume: true,
              customerPrice: true,
              product: {
                select: {
                  id: true,
                  productName: true,
                  image: { select: { url: true } }
                }
              }
            }
          }
        }
      }),
      prisma.discount.count({ where })
    ])

    return NextResponse.json({
      data: discounts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Error fetching discounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch discounts' },
      { status: 500 }
    )
  }
}

// POST - Create discounts (supports company-wide, multi-product, or single product/variant)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = discountSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const {
      companyId,
      productIds,
      variantId,
      startDate,
      endDate,
      applyToAllCompanyProducts,
      ...discountData
    } = validation.data

    // Validate date range
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end <= start) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    // Validate that at least one scope is provided
    if (!companyId && (!productIds || productIds.length === 0) && !variantId) {
      return NextResponse.json(
        { error: 'Please select a company, products, or variant for the discount' },
        { status: 400 }
      )
    }

    const createdDiscounts = []

    // Case 1: Company-wide discount (all products of a company)
    if (companyId && applyToAllCompanyProducts) {
      const company = await prisma.company.findUnique({ where: { id: companyId } })
      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }

      const discount = await prisma.discount.create({
        data: {
          ...discountData,
          startDate: start,
          endDate: end,
          companyId: companyId,
          productId: null,
          variantId: null,
        },
        include: {
          company: { select: { id: true, companyName: true } }
        }
      })
      createdDiscounts.push(discount)
    }
    // Case 2: Multiple products selected
    else if (productIds && productIds.length > 0) {
      // Verify all products exist
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } }
      })

      if (products.length !== productIds.length) {
        return NextResponse.json({ error: 'One or more products not found' }, { status: 404 })
      }

      // Create a discount for each product
      for (const productId of productIds) {
        const discount = await prisma.discount.create({
          data: {
            ...discountData,
            startDate: start,
            endDate: end,
            companyId: null,
            productId: productId,
            variantId: null,
          },
          include: {
            product: { select: { id: true, productName: true } }
          }
        })
        createdDiscounts.push(discount)
      }
    }
    // Case 3: Single variant
    else if (variantId) {
      const variant = await prisma.productVariant.findUnique({ where: { id: variantId } })
      if (!variant) {
        return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
      }

      const discount = await prisma.discount.create({
        data: {
          ...discountData,
          startDate: start,
          endDate: end,
          companyId: null,
          productId: null,
          variantId: variantId,
        },
        include: {
          variant: {
            select: {
              id: true,
              packingVolume: true,
              product: { select: { id: true, productName: true } }
            }
          }
        }
      })
      createdDiscounts.push(discount)
    }

    return NextResponse.json({
      message: `Created ${createdDiscounts.length} discount(s) successfully`,
      discounts: createdDiscounts
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating discount:', error)
    return NextResponse.json(
      { error: 'Failed to create discount' },
      { status: 500 }
    )
  }
}
