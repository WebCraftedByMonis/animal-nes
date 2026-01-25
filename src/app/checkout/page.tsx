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
