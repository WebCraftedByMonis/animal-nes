import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { validatePartnerSession } from '@/lib/auth/partner-auth'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('partner-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const partner = await validatePartnerSession(token)
    if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { productId, variantId } = await req.json()

    if (!productId || !variantId) {
      return NextResponse.json({ error: 'productId and variantId are required' }, { status: 400 })
    }

    // Validate variant exists and belongs to product
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    })

    if (!variant) {
      return NextResponse.json({ error: 'Invalid product/variant combination' }, { status: 400 })
    }

    // Upsert cart item
    const cartItem = await prisma.partnerCartItem.upsert({
      where: {
        partnerId_productId_variantId: {
          partnerId: partner.id,
          productId,
          variantId,
        },
      },
      update: {
        quantity: { increment: 1 },
      },
      create: {
        partnerId: partner.id,
        productId,
        variantId,
        quantity: 1,
      },
    })

    return NextResponse.json({ cartItem })
  } catch (error) {
    console.error('Error adding to partner cart:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
