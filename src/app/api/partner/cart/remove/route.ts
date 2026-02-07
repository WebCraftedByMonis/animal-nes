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

    const { cartItemId } = await req.json()

    if (!cartItemId) {
      return NextResponse.json({ error: 'cartItemId is required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.partnerCartItem.findFirst({
      where: { id: cartItemId, partnerId: partner.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }

    await prisma.partnerCartItem.delete({ where: { id: cartItemId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from partner cart:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
