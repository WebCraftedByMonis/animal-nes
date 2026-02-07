import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { validateAdminSession } from '@/lib/auth/admin-auth'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await validateAdminSession(token)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const companyId = searchParams.get('companyId') || ''

    const where: any = {}

    if (status) where.status = status
    if (companyId) where.companyId = parseInt(companyId)

    if (search) {
      where.OR = [
        { partner: { partnerName: { contains: search } } },
        { partner: { shopName: { contains: search } } },
        { company: { companyName: { contains: search } } },
      ]
    }

    const [orders, total, stats] = await Promise.all([
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
          company: {
            select: { id: true, companyName: true },
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
      // Get summary stats
      prisma.partnerOrder.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { total: true },
      }),
    ])

    // Get companies list for filter
    const companies = await prisma.company.findMany({
      select: { id: true, companyName: true },
      orderBy: { companyName: 'asc' },
    })

    return NextResponse.json({
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats,
      companies,
    })
  } catch (error) {
    console.error('Error fetching admin partner orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await validateAdminSession(token)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId, status } = await req.json()

    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId and status are required' }, { status: 400 })
    }

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const order = await prisma.partnerOrder.update({
      where: { id: orderId },
      data: { status },
    })

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error updating partner order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await validateAdminSession(token)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = parseInt(searchParams.get('id') || '')

    if (!id) return NextResponse.json({ error: 'Order ID required' }, { status: 400 })

    await prisma.partnerOrder.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting partner order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
