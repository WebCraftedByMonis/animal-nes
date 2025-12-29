import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Pagination params
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '16', 10)
    const skip = (page - 1) * limit

    // Sort params
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    // Filter params
    const search = searchParams.get('search') || ''
    const paymentRequired = searchParams.get('paymentRequired')

    // Build where clause
    const where: any = {
      isActive: true, // Only show active forms
    }

    // Search filter - searches across title and description
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    // Payment filter
    if (paymentRequired && paymentRequired !== 'all') {
      where.paymentRequired = paymentRequired === 'true'
    }

    // Build orderBy
    let orderBy: any = {}
    if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder }
    } else if (sortBy === 'title') {
      orderBy = { title: sortOrder }
    }

    // Execute queries
    const [items, total] = await Promise.all([
      prisma.dynamicForm.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          slug: true,
          thumbnailUrl: true,
          thumbnailPublicId: true,
          paymentRequired: true,
          paymentAmount: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              fields: true,
              submissions: true,
            },
          },
        },
      }),
      prisma.dynamicForm.count({ where })
    ])

    return NextResponse.json({
      data: items,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('Error fetching forms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    )
  }
}
