import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { validatePartnerSession } from '@/lib/auth/partner-auth'

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('partner-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const partner = await validatePartnerSession(token)
    if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const country = searchParams.get('country') || ''

    const cartItems = await prisma.partnerCartItem.findMany({
      where: {
        partnerId: partner.id,
        ...(country && country !== 'all' ? { product: { company: { country } } } : {}),
      },
      include: {
        product: {
          include: {
            image: true,
            company: { select: { id: true, companyName: true } },
            discounts: {
              where: {
                isActive: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() },
              },
            },
          },
        },
        variant: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ cartItems })
  } catch (error) {
    console.error('Error fetching partner cart:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
