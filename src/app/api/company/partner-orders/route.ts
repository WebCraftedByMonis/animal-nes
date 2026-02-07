import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { validateCompanySession } from '@/lib/auth/company-auth'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('company-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const company = await validateCompanySession(token)
    if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const where: any = { companyId: company.id }

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { partner: { partnerName: { contains: search } } },
        { partner: { partnerEmail: { contains: search } } },
        { partner: { shopName: { contains: search } } },
      ]
    }

    const [orders, total] = await Promise.all([
      prisma.partnerOrder.findMany({
        where,
        include: {
          partner: {
            select: {
              id: true,
              partnerName: true,
              partnerEmail: true,
              partnerMobileNumber: true,
              shopName: true,
            },
          },
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
      prisma.partnerOrder.count({ where }),
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

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('company-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const company = await validateCompanySession(token)
    if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId, status } = await req.json()

    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId and status are required' }, { status: 400 })
    }

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Verify ownership
    const order = await prisma.partnerOrder.findFirst({
      where: { id: orderId, companyId: company.id },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const updatedOrder = await prisma.partnerOrder.update({
      where: { id: orderId },
      data: { status },
    })

    return NextResponse.json({ order: updatedOrder })
  } catch (error) {
    console.error('Error updating partner order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
