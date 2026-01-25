import { prisma } from '@/lib/prisma'

interface Discount {
  id: number
  name: string
  description: string | null
  percentage: number
  startDate: Date
  endDate: Date
  isActive: boolean
  companyId: number | null
  productId: number | null
  variantId: number | null
}

/**
 * Calculate the discounted price based on original price and percentage
 */
export function calculateDiscountedPrice(originalPrice: number, percentage: number): number {
  const discount = (originalPrice * percentage) / 100
  return Math.round((originalPrice - discount) * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculate the savings amount
 */
export function calculateSavings(originalPrice: number, percentage: number): number {
  return Math.round((originalPrice * percentage / 100) * 100) / 100
}

/**
 * Check if a discount is currently active (within date range and isActive flag)
 */
export function isDiscountActive(discount: Discount): boolean {
  if (!discount.isActive) return false

  const now = new Date()
  const startDate = new Date(discount.startDate)
  const endDate = new Date(discount.endDate)

  return now >= startDate && now <= endDate
}

/**
 * Get the status of a discount: active, scheduled, or expired
 */
export function getDiscountStatus(discount: Discount): 'active' | 'scheduled' | 'expired' | 'disabled' {
  if (!discount.isActive) return 'disabled'

  const now = new Date()
  const startDate = new Date(discount.startDate)
  const endDate = new Date(discount.endDate)

  if (now < startDate) return 'scheduled'
  if (now > endDate) return 'expired'
  return 'active'
}

/**
 * Get the best active discount for a product or variant
 * Prioritizes: variant-level > product-level > company-level discounts
 * Returns the highest percentage discount if multiple are active at the same level
 */
export async function getActiveDiscount(
  productId: number,
  variantId?: number,
  companyId?: number
): Promise<Discount | null> {
  const now = new Date()

  // Build conditions for finding discounts
  const whereConditions: any[] = []

  // Check for variant-level discount if variantId is provided
  if (variantId) {
    whereConditions.push({
      variantId: variantId,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now }
    })
  }

  // Check for product-level discount
  whereConditions.push({
    productId: productId,
    variantId: null,
    companyId: null,
    isActive: true,
    startDate: { lte: now },
    endDate: { gte: now }
  })

  // Check for company-level discount if companyId is provided
  if (companyId) {
    whereConditions.push({
      companyId: companyId,
      productId: null,
      variantId: null,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now }
    })
  }

  const discounts = await prisma.discount.findMany({
    where: {
      OR: whereConditions
    },
    orderBy: {
      percentage: 'desc' // Get highest discount first
    }
  })

  if (discounts.length === 0) return null

  // Prioritize variant-level discount if exists
  if (variantId) {
    const variantDiscount = discounts.find(d => d.variantId === variantId)
    if (variantDiscount) return variantDiscount
  }

  // Then product-level discount
  const productDiscount = discounts.find(d => d.productId === productId && !d.variantId && !d.companyId)
  if (productDiscount) return productDiscount

  // Finally company-level discount
  if (companyId) {
    const companyDiscount = discounts.find(d => d.companyId === companyId)
    if (companyDiscount) return companyDiscount
  }

  // Return the highest discount
  return discounts[0]
}

/**
 * Get all active discounts for a product and its variants
 */
export async function getActiveDiscountsForProduct(productId: number, companyId?: number): Promise<Discount[]> {
  const now = new Date()

  const whereConditions: any[] = [
    { productId: productId },
    { variant: { productId: productId } }
  ]

  if (companyId) {
    whereConditions.push({ companyId: companyId })
  }

  return prisma.discount.findMany({
    where: {
      OR: whereConditions,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now }
    }
  })
}

/**
 * Check if discount is ending soon (within specified hours)
 */
export function isEndingSoon(discount: Discount, hoursThreshold: number = 24): boolean {
  if (!isDiscountActive(discount)) return false

  const now = new Date()
  const endDate = new Date(discount.endDate)
  const hoursRemaining = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60)

  return hoursRemaining > 0 && hoursRemaining <= hoursThreshold
}

/**
 * Format remaining time for discount
 */
export function formatTimeRemaining(endDate: Date): string {
  const now = new Date()
  const end = new Date(endDate)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return 'Expired'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}h remaining`
  if (hours > 0) return `${hours}h ${minutes}m remaining`
  return `${minutes}m remaining`
}

/**
 * Apply discount to a price if discount is valid
 */
export function applyDiscount(
  originalPrice: number,
  discount: Discount | null
): { price: number; originalPrice: number; discount: Discount | null; savings: number } {
  if (!discount || !isDiscountActive(discount)) {
    return {
      price: originalPrice,
      originalPrice: originalPrice,
      discount: null,
      savings: 0
    }
  }

  const discountedPrice = calculateDiscountedPrice(originalPrice, discount.percentage)
  const savings = calculateSavings(originalPrice, discount.percentage)

  return {
    price: discountedPrice,
    originalPrice: originalPrice,
    discount: discount,
    savings: savings
  }
}
