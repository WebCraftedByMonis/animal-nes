// /api/cart/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()

  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const now = new Date()
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.id },
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Fetch company-level discounts for all companies in the cart
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

    // Merge company-level discounts into each cart item's product discounts
    const cartItemsWithCompanyDiscounts = cartItems.map(item => {
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

    return NextResponse.json({ cart: cartItemsWithCompanyDiscounts }, { status: 200 })
  } catch (error) {
    console.error('Error fetching cart:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
