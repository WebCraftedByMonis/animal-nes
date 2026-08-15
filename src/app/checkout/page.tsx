// app/checkout/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import CheckoutClient from './CheckoutClient'
import CheckoutLoginPrompt from './CheckoutLoginPrompt'

export default async function CheckoutPage() {
  const session = await auth()
  if (!session?.user?.email) {
    return <CheckoutLoginPrompt />
  }

  const now = new Date()

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      cart: {
        include: {
          product: {
            include: {
              image: true,
              company: true,
              discounts: {
                where: {
                  isActive: true,
                  startDate: { lte: now },
                  endDate: { gte: now }
                }
              }
            },
          },
          variant: {
            include: {
              discounts: {
                where: {
                  isActive: true,
                  startDate: { lte: now },
                  endDate: { gte: now }
                }
              }
            }
          },
        },
      },
      animalCart: { include: { animal: { include: { images: true } } } },
    },
  })

  // Fetch company-level discounts
  const cartItems = user?.cart || []
  const companyIds = [...new Set(cartItems.map(item => item.product?.companyId).filter(Boolean))] as number[]

  const companyDiscounts = companyIds.length > 0 ? await prisma.discount.findMany({
    where: {
      companyId: { in: companyIds },
      productId: null,
      variantId: null,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now }
    }
  }) : []

  // [checkout-debug] Flag anything that would blow up the checkout API
  // before it even gets there — e.g. a variant with no customerPrice.
  for (const item of cartItems) {
    if (!item.product || !item.variant) {
      console.error('[checkout-debug] cart item missing product/variant relation:', item.id)
    } else if (item.variant.customerPrice == null) {
      console.error(`[checkout-debug] product ${item.product.id} (${item.product.productName}) variant ${item.variant.id} (${item.variant.packingVolume}) has no customerPrice`)
    }
  }

  // Merge company-level discounts into cart items
  const cartItemsWithDiscounts = cartItems.map(item => {
    if (item.product) {
      const productCompanyDiscounts = companyDiscounts.filter(d => d.companyId === item.product?.companyId)
      return {
        ...item,
        product: {
          ...item.product,
          discounts: [...(item.product.discounts || []), ...productCompanyDiscounts]
        }
      }
    }
    return item
  })

  return <CheckoutClient cartItems={cartItemsWithDiscounts} animalCartItems={user?.animalCart || []} />
}
