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

    const { cartItemId, quantity } = await req.json()

    if (!cartItemId || quantity === undefined) {
      return NextResponse.json({ error: 'cartItemId and quantity are required' }, { status: 400 })
    }

    if (quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.partnerCartItem.findFirst({
      where: { id: cartItemId, partnerId: partner.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }

    const cartItem = await prisma.partnerCartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    })

    return NextResponse.json({ cartItem })
  } catch (error) {
    console.error('Error updating partner cart:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
