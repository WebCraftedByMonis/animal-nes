import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { validatePartnerSession } from '@/lib/auth/partner-auth'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('partner-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const partner = await validatePartnerSession(token)
    if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const country = searchParams.get('country') || ''

    const [orders, total] = await Promise.all([
      prisma.partnerOrder.findMany({
        where: {
          partnerId: partner.id,
          ...(country && country !== 'all'
            ? { company: { country } }
            : {}),
        },
        include: {
          company: { select: { id: true, companyName: true } },
          items: {
            include: {
              product: {
                select: { id: true, productName: true, image: true },
              },
              variant: {
                select: { id: true, packingVolume: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.partnerOrder.count({ where: { partnerId: partner.id } }),
    ])

    return NextResponse.json({
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching partner orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
