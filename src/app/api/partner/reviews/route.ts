import { NextRequest, NextResponse } from 'next/server'
import { validatePartnerSession } from '@/lib/auth/partner-auth'
import { prisma } from '@/lib/prisma'

// GET /api/partner/reviews - Fetch reviews for partner's products
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('partner-token')?.value

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const partner = await validatePartnerSession(token)

    if (!partner) {
      return NextResponse.json({ message: 'Invalid session' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const skip = (page - 1) * limit

    // Get all reviews for products belonging to this partner
    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where: {
          product: {
            partnerId: partner.id,
          },
        },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          product: {
            select: {
              id: true,
              productName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.productReview.count({
        where: {
          product: {
            partnerId: partner.id,
          },
        },
      }),
    ])

    return NextResponse.json({
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + reviews.length < total,
      },
    })
  } catch (error) {
    console.error('Error fetching partner reviews:', error)
    return NextResponse.json(
      { message: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// PUT /api/partner/reviews - Approve/Disapprove a review
export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('partner-token')?.value

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const partner = await validatePartnerSession(token)

    if (!partner) {
      return NextResponse.json({ message: 'Invalid session' }, { status: 401 })
    }

    const { id, isApproved } = await req.json()

    if (!id || typeof isApproved !== 'boolean') {
      return NextResponse.json(
        { message: 'Review ID and approval status are required' },
        { status: 400 }
      )
    }

    // Verify that this review belongs to the partner's product
    const review = await prisma.productReview.findUnique({
      where: { id: parseInt(id) },
      include: {
        product: true,
      },
    })

    if (!review) {
      return NextResponse.json(
        { message: 'Review not found' },
        { status: 404 }
      )
    }

    if (review.product.partnerId !== partner.id) {
      return NextResponse.json(
        { message: 'Unauthorized to modify this review' },
        { status: 403 }
      )
    }

    // Update review approval status
    const updatedReview = await prisma.productReview.update({
      where: { id: parseInt(id) },
      data: { isApproved },
    })

    return NextResponse.json(
      {
        message: isApproved ? 'Review approved' : 'Review disapproved',
        review: updatedReview,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating review:', error)
    return NextResponse.json(
      { message: 'Failed to update review' },
      { status: 500 }
    )
  }
}

// DELETE /api/partner/reviews - Delete a review
export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('partner-token')?.value

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const partner = await validatePartnerSession(token)

    if (!partner) {
      return NextResponse.json({ message: 'Invalid session' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { message: 'Review ID is required' },
        { status: 400 }
      )
    }

    // Verify that this review belongs to the partner's product
    const review = await prisma.productReview.findUnique({
      where: { id: parseInt(id) },
      include: {
        product: true,
      },
    })

    if (!review) {
      return NextResponse.json(
        { message: 'Review not found' },
        { status: 404 }
      )
    }

    if (review.product.partnerId !== partner.id) {
      return NextResponse.json(
        { message: 'Unauthorized to delete this review' },
        { status: 403 }
      )
    }

    // Delete the review
    await prisma.productReview.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json(
      { message: 'Review deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json(
      { message: 'Failed to delete review' },
      { status: 500 }
    )
  }
}
