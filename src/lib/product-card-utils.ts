// Pure, client-safe helpers for rendering a product card from already-fetched
// data (no Prisma). Mirrors the inline logic ProductsClient.tsx has always
// used for its flat grid, factored out so ProductPortions.tsx (the portioned
// /products view) doesn't duplicate it.

export interface DiscountLike {
  id: number
  percentage: number
  startDate: string
  endDate: string
  isActive: boolean
  companyId: number | null
  productId: number | null
  variantId: number | null
}

export interface VariantLike {
  id?: number
  packingVolume: string | null
  customerPrice: number | null
}

export function pickCheapestVariant<T extends VariantLike>(variants: T[] | undefined): T | null {
  if (!variants || variants.length === 0) return null
  const priced = variants.filter((v) => v.customerPrice !== null)
  if (priced.length === 0) return variants[0]
  return priced.reduce((a, b) => ((a.customerPrice || 0) <= (b.customerPrice || 0) ? a : b))
}

// Priority: variant-level > product-level > company-level, same as
// ProductsClient.tsx's getActiveDiscount.
export function getActiveDiscount(discounts: DiscountLike[] | undefined, variantId?: number): DiscountLike | null {
  if (!discounts || discounts.length === 0) return null

  const now = new Date()
  const active = discounts.filter((d) => d.isActive && now >= new Date(d.startDate) && now <= new Date(d.endDate))
  if (active.length === 0) return null

  if (variantId) {
    const variantDiscount = active.find((d) => d.variantId === variantId)
    if (variantDiscount) return variantDiscount
  }

  const productDiscounts = active.filter((d) => d.productId !== null && d.variantId === null && d.companyId === null)
  if (productDiscounts.length > 0) return productDiscounts.reduce((a, b) => (a.percentage > b.percentage ? a : b))

  const companyDiscounts = active.filter((d) => d.companyId !== null && d.productId === null && d.variantId === null)
  if (companyDiscounts.length > 0) return companyDiscounts.reduce((a, b) => (a.percentage > b.percentage ? a : b))

  return active[0]
}

export function calculateDiscountedPrice(price: number, percentage: number): number {
  return Math.round((price - (price * percentage) / 100) * 100) / 100
}
