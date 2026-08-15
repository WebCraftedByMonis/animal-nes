// /api/cart/add/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { trackEvent, getSessionIdFromRequest } from '@/lib/tracking'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { productId, variantId } = await req.json()
  console.error('[cart-debug] add-to-cart request:', { productId, variantId, user: session.user.email })

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Validate that the variant exists
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    })

    if (!variant) {
      console.error(`[cart-debug] add-to-cart failed: variant ${variantId} not found`)
      return NextResponse.json({ message: 'Product variant not found' }, { status: 404 })
    }

    // Verify the variant belongs to the specified product
    if (variant.productId !== productId) {
      console.error(`[cart-debug] add-to-cart failed: variant ${variantId} belongs to product ${variant.productId}, not requested product ${productId}`)
      return NextResponse.json({ message: 'Invalid product-variant combination' }, { status: 400 })
    }

    await prisma.cartItem.upsert({
  where: {
    userId_productId_variantId: {
      userId: user.id,
      productId,
      variantId,
    },
  },
  update: {
    quantity: { increment: 1 },
  },
  create: {
    userId: user.id,
    productId,
    variantId,
    quantity: 1,
  },
})

    await trackEvent({
      type: 'CART_ADD',
      sessionId: getSessionIdFromRequest(req),
      userId: user.id,
      productId,
    })

    return NextResponse.json({ message: 'Added to cart' }, { status: 200 })
  } catch (error) {
    console.error('[cart-debug] add-to-cart error for', { productId, variantId }, ':', error instanceof Error ? error.stack : error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
