import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bulkPriceUpdateSchema = z.object({
  companyIds: z.array(z.number()).optional(),
  partnerIds: z.array(z.number()).optional(),
  productIds: z.array(z.number()).optional(),
  updateAllProducts: z.boolean().optional(),
  priceType: z.enum(['companyPrice', 'dealerPrice', 'customerPrice']),
  updateType: z.enum(['exact', 'percentage', 'addition', 'subtraction']),
  value: z.number(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = bulkPriceUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { companyIds, partnerIds, productIds, updateAllProducts, priceType, updateType, value } = validation.data

    // Get all product variants that match the criteria
    let productVariants

    if (updateAllProducts) {
      // For global update, get ALL product variants
      productVariants = await prisma.productVariant.findMany({
        include: {
          product: {
            include: {
              company: true,
              partner: true
            }
          }
        }
      })
    } else {
      // If no specific products, companies, or partners selected, return error
      if (!companyIds?.length && !partnerIds?.length && !productIds?.length) {
        return NextResponse.json(
          { error: 'Must select at least one company, partner, or product' },
          { status: 400 }
        )
      }

      // Build where clause for products
      const where: any = {}

      if (companyIds && companyIds.length > 0) {
        where.companyId = { in: companyIds }
      }

      if (partnerIds && partnerIds.length > 0) {
        where.partnerId = { in: partnerIds }
      }

      if (productIds && productIds.length > 0) {
        where.id = { in: productIds }
      }

      // Get filtered product variants
      productVariants = await prisma.productVariant.findMany({
        where: {
          product: where
        },
        include: {
          product: {
            include: {
              company: true,
              partner: true
            }
          }
        }
      })
    }

    if (productVariants.length === 0) {
      return NextResponse.json(
        { error: 'No products found matching the criteria' },
        { status: 404 }
      )
    }

    // Calculate new prices and update variants
    const updatePromises = productVariants.map(async (variant) => {
      const currentPrice = variant[priceType as keyof typeof variant] as number | null
      let newPrice: number | null = null

      if (currentPrice !== null) {
        switch (updateType) {
          case 'exact':
            newPrice = value
            break
          case 'percentage':
            newPrice = currentPrice + (currentPrice * value / 100)
            break
          case 'addition':
            newPrice = currentPrice + value
            break
          case 'subtraction':
            newPrice = Math.max(0, currentPrice - value) // Ensure price doesn't go negative
            break
        }

        // Round to 2 decimal places
        newPrice = Math.round((newPrice || 0) * 100) / 100
      }

      return prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          [priceType]: newPrice
        }
      })
    })

    await Promise.all(updatePromises)

    // Create a summary of updates
    const summary = {
      totalVariantsUpdated: productVariants.length,
      companiesAffected: [...new Set(productVariants.map(v => v.product.company?.companyName).filter(Boolean))],
      partnersAffected: [...new Set(productVariants.map(v => v.product.partner?.partnerName).filter(Boolean))],
      priceType,
      updateType,
      value,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      message: 'Bulk price update completed successfully',
      summary
    }, { status: 200 })

  } catch (error) {
    console.error('Error in bulk price update:', error)
    return NextResponse.json(
      { error: 'Failed to update prices', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyIds = searchParams.get('companyIds')?.split(',').map(Number).filter(Boolean) || []
    const partnerIds = searchParams.get('partnerIds')?.split(',').map(Number).filter(Boolean) || []
    const productIds = searchParams.get('productIds')?.split(',').map(Number).filter(Boolean) || []

    // Build where clause
    const where: any = {}

    if (companyIds.length > 0) {
      where.companyId = { in: companyIds }
    }

    if (partnerIds.length > 0) {
      where.partnerId = { in: partnerIds }
    }

    if (productIds.length > 0) {
      where.id = { in: productIds }
    }

    // Get products with their variants
    const products = await prisma.product.findMany({
      where,
      include: {
        company: {
          select: { id: true, companyName: true }
        },
        partner: {
          select: { id: true, partnerName: true }
        },
        variants: true,
        image: {
          select: { url: true, alt: true }
        }
      },
      orderBy: {
        productName: 'asc'
      }
    })

    // Calculate price statistics
    const priceStats = {
      totalProducts: products.length,
      totalVariants: products.reduce((sum, p) => sum + p.variants.length, 0),
      avgCompanyPrice: 0,
      avgDealerPrice: 0,
      avgCustomerPrice: 0,
      priceRanges: {
        companyPrice: { min: 0, max: 0 },
        dealerPrice: { min: 0, max: 0 },
        customerPrice: { min: 0, max: 0 }
      }
    }

    const allVariants = products.flatMap(p => p.variants)

    if (allVariants.length > 0) {
      const companyPrices = allVariants.map(v => v.companyPrice).filter(Boolean) as number[]
      const dealerPrices = allVariants.map(v => v.dealerPrice).filter(Boolean) as number[]
      const customerPrices = allVariants.map(v => v.customerPrice).filter(Boolean) as number[]

      if (companyPrices.length > 0) {
        priceStats.avgCompanyPrice = companyPrices.reduce((a, b) => a + b, 0) / companyPrices.length
        priceStats.priceRanges.companyPrice = { min: Math.min(...companyPrices), max: Math.max(...companyPrices) }
      }

      if (dealerPrices.length > 0) {
        priceStats.avgDealerPrice = dealerPrices.reduce((a, b) => a + b, 0) / dealerPrices.length
        priceStats.priceRanges.dealerPrice = { min: Math.min(...dealerPrices), max: Math.max(...dealerPrices) }
      }

      if (customerPrices.length > 0) {
        priceStats.avgCustomerPrice = customerPrices.reduce((a, b) => a + b, 0) / customerPrices.length
        priceStats.priceRanges.customerPrice = { min: Math.min(...customerPrices), max: Math.max(...customerPrices) }
      }
    }

    return NextResponse.json({
      products,
      stats: priceStats
    }, { status: 200 })

  } catch (error) {
    console.error('Error fetching price management data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}