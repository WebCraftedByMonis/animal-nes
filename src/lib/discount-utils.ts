import { prisma } from '@/lib/prisma'

// Helper to get active discount for a product/variant
export async function getActiveDiscountForItem(productId: number, variantId: number, companyId?: number): Promise<{ percentage: number } | null> {
  const now = new Date()

  // First check for variant-specific discount
  const variantDiscount = await prisma.discount.findFirst({
    where: {
      variantId: variantId,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now }
    },
    orderBy: { percentage: 'desc' }
  })

  if (variantDiscount) return { percentage: variantDiscount.percentage }

  // Then check for product-level discount
  const productDiscount = await prisma.discount.findFirst({
    where: {
      productId: productId,
      variantId: null,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now }
    },
    orderBy: { percentage: 'desc' }
  })

  if (productDiscount) return { percentage: productDiscount.percentage }

  // Finally check for company-level discount
  if (companyId) {
    const companyDiscount = await prisma.discount.findFirst({
      where: {
        companyId: companyId,
        productId: null,
        variantId: null,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      orderBy: { percentage: 'desc' }
    })

    if (companyDiscount) return { percentage: companyDiscount.percentage }
  }

  return null
}

// Calculate discounted price
export function calculateDiscountedPrice(price: number, percentage: number): number {
  return Math.round((price - (price * percentage / 100)) * 100) / 100
}
