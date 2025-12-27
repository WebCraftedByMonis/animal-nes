import { NextRequest, NextResponse } from 'next/server'
import { validatePartnerSession } from '@/lib/auth/partner-auth'
import { prisma } from '@/lib/prisma'

// GET /api/partner/vet-reviews - Fetch vet reviews for this veterinarian partner
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

    // Get all vet reviews for this partner (veterinarian)
    const [reviews, total] = await Promise.all([
      prisma.vetReview.findMany({
        where: {
          partnerId: partner.id,
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
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.vetReview.count({
        where: {
          partnerId: partner.id,
        },
      }),
    ])

    // Calculate average rating
    const avgResult = await prisma.vetReview.aggregate({
      where: {
        partnerId: partner.id,
        isApproved: true,
      },
      _avg: {
        rating: true,
      },
    })

    return NextResponse.json({
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + reviews.length < total,
      },
      averageRating: avgResult._avg.rating || 0,
    })
  } catch (error) {
    console.error('Error fetching partner vet reviews:', error)
    return NextResponse.json(
      { message: 'Failed to fetch vet reviews' },
      { status: 500 }
    )
  }
}

// PUT /api/partner/vet-reviews - Approve/Disapprove a vet review
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

    // Verify that this review belongs to this partner
    const review = await prisma.vetReview.findUnique({
      where: { id: parseInt(id) },
    })

    if (!review) {
      return NextResponse.json(
        { message: 'Review not found' },
        { status: 404 }
      )
    }

    if (review.partnerId !== partner.id) {
      return NextResponse.json(
        { message: 'Unauthorized to modify this review' },
        { status: 403 }
      )
    }

    // Update review approval status
    const updatedReview = await prisma.vetReview.update({
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
    console.error('Error updating vet review:', error)
    return NextResponse.json(
      { message: 'Failed to update review' },
      { status: 500 }
    )
  }
}

// DELETE /api/partner/vet-reviews - Delete a vet review
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

    // Verify that this review belongs to this partner
    const review = await prisma.vetReview.findUnique({
      where: { id: parseInt(id) },
    })

    if (!review) {
      return NextResponse.json(
        { message: 'Review not found' },
        { status: 404 }
      )
    }

    if (review.partnerId !== partner.id) {
      return NextResponse.json(
        { message: 'Unauthorized to delete this review' },
        { status: 403 }
      )
    }

    // Delete the review
    await prisma.vetReview.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json(
      { message: 'Review deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting vet review:', error)
    return NextResponse.json(
      { message: 'Failed to delete review' },
      { status: 500 }
    )
  }
}
