import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, isActive } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No product IDs provided' }, { status: 400 })
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 })
    }

    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error('Bulk status update error:', error)
    return NextResponse.json({ error: 'Failed to update products' }, { status: 500 })
  }
}
