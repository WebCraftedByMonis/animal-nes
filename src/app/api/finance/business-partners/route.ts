import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 60

// Validation schemas
const partnerSchema = z.object({
  name: z.string().min(1, 'Partner name is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  partnerType: z.string().min(1, 'Partner type is required'),
  sharePercentage: z.number().min(0).max(100),
  bankDetails: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  notes: z.string().optional().nullable(),
})

// GET - Fetch all business partners with filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const partnerType = searchParams.get('partnerType')
    const isActive = searchParams.get('isActive')
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const skip = (page - 1) * limit

    const where: any = {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { partnerType: { contains: search } },
      ],
    }

    if (partnerType) {
      where.partnerType = partnerType
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const [partners, total] = await Promise.all([
      prisma.businessPartner.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          distributions: {
            select: {
              id: true,
              shareAmount: true,
              status: true,
            },
          },
          expenses: {
            select: {
              id: true,
              amount: true,
            },
          },
        },
      }),
      prisma.businessPartner.count({ where }),
    ])

    return NextResponse.json({
      data: partners,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('Error fetching business partners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch business partners' },
      { status: 500 }
    )
  }
}

// POST - Create new business partner
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = partnerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const partner = await prisma.businessPartner.create({
      data: validation.data,
    })

    return NextResponse.json(partner, { status: 201 })
  } catch (error) {
    console.error('Error creating business partner:', error)
    return NextResponse.json(
      { error: 'Failed to create business partner' },
      { status: 500 }
    )
  }
}

// PUT - Update business partner
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    const validation = partnerSchema.partial().safeParse(updateData)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const partner = await prisma.businessPartner.update({
      where: { id: parseInt(id) },
      data: validation.data,
    })

    return NextResponse.json(partner)
  } catch (error) {
    console.error('Error updating business partner:', error)
    return NextResponse.json(
      { error: 'Failed to update business partner' },
      { status: 500 }
    )
  }
}

// DELETE - Delete business partner
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    await prisma.businessPartner.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json(
      { message: 'Business partner deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting business partner:', error)
    return NextResponse.json(
      { error: 'Failed to delete business partner' },
      { status: 500 }
    )
  }
}
