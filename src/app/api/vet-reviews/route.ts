import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { auth } from '@/lib/auth'

// Zod schema for review validation
const vetReviewSchema = z.object({
  partnerId: z.number().int().min(1, 'Partner ID is required'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  comment: z.string().min(1, 'Comment is required'),
})

// GET - Fetch reviews for a partner or all reviews
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const partnerId = searchParams.get('partnerId')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
    const limitParam = searchParams.get('limit') || '10'
    const showUnapproved = searchParams.get('showUnapproved') === 'true'

    const limit = limitParam === 'all' ? undefined : parseInt(limitParam, 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const skip = limit ? (page - 1) * limit : undefined

    const whereClause: any = {}

    // Filter by partnerId if provided
    if (partnerId) {
      whereClause.partnerId = parseInt(partnerId)
    }

    // Only show approved reviews unless explicitly requested
    if (!showUnapproved) {
      whereClause.isApproved = true
    }

    const [items, total] = await Promise.all([
      prisma.vetReview.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          partner: {
            select: {
              id: true,
              partnerName: true,
              specialization: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.vetReview.count({
        where: whereClause,
      }),
    ])

    // Calculate average rating if partnerId is provided
    let averageRating = null
    if (partnerId) {
      const result = await prisma.vetReview.aggregate({
        where: {
          partnerId: parseInt(partnerId),
          isApproved: true,
        },
        _avg: {
          rating: true,
        },
      })
      averageRating = result._avg.rating
    }

    return NextResponse.json({
      data: items,
      total,
      averageRating,
    })
  } catch (error) {
    console.error('Error fetching vet reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vet reviews' },
      { status: 500 }
    )
  }
}

// POST - Create a new review
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    console.log('=== VET REVIEW POST REQUEST DEBUG ===')
    console.log('User ID:', session.user.id)
    console.log('Raw request body:', JSON.stringify(body, null, 2))

    // Validate input
    const validation = vetReviewSchema.safeParse(body)

    if (!validation.success) {
      console.log('Validation errors:', validation.error.errors)
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    // Check if partner exists
    const partner = await prisma.partner.findUnique({
      where: { id: data.partnerId },
      select: {
        id: true,
        partnerName: true,
        partnerEmail: true,
      },
    })

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    // Check if user has already reviewed this partner
    const existingReview = await prisma.vetReview.findUnique({
      where: {
        userId_partnerId: {
          userId: session.user.id,
          partnerId: data.partnerId,
        },
      },
    })

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this veterinarian' },
        { status: 400 }
      )
    }

    // Create the review
    const review = await prisma.vetReview.create({
      data: {
        userId: session.user.id,
        partnerId: data.partnerId,
        rating: data.rating,
        comment: data.comment,
        isApproved: true, // Reviews are posted immediately as per requirements
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        partner: {
          select: {
            id: true,
            partnerName: true,
            partnerEmail: true,
          },
        },
      },
    })

    console.log('✅ Review created successfully:', review.id)

    // Send notification email to doctor
    if (partner.partnerEmail) {
      try {
        const { sendReviewNotificationToDoctor } = await import('@/lib/email-service')
        await sendReviewNotificationToDoctor(partner, review)
        console.log(`✅ Review notification sent to Dr. ${partner.partnerName}`)
      } catch (emailError) {
        console.error('⚠️ Error sending review notification email:', emailError)
        // Don't fail the review creation if email fails
      }
    }

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error('=== VET REVIEW CREATION ERROR ===')
    console.error('Error creating vet review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a review (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      )
    }

    const reviewId = parseInt(id)
    if (isNaN(reviewId)) {
      return NextResponse.json(
        { error: 'Invalid review ID' },
        { status: 400 }
      )
    }

    // Find the review
    const review = await prisma.vetReview.findUnique({
      where: { id: reviewId },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Delete the review
    await prisma.vetReview.delete({
      where: { id: reviewId },
    })

    return NextResponse.json(
      { message: 'Review deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting vet review:', error)
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    )
  }
}

// PATCH - Update review approval status (Admin only)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, isApproved } = body

    if (!id || isApproved === undefined) {
      return NextResponse.json(
        { error: 'Review ID and approval status are required' },
        { status: 400 }
      )
    }

    const reviewId = parseInt(id)
    if (isNaN(reviewId)) {
      return NextResponse.json(
        { error: 'Invalid review ID' },
        { status: 400 }
      )
    }

    // Update the review
    const updatedReview = await prisma.vetReview.update({
      where: { id: reviewId },
      data: { isApproved },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        partner: {
          select: {
            id: true,
            partnerName: true,
          },
        },
      },
    })

    return NextResponse.json(updatedReview)
  } catch (error) {
    console.error('Error updating vet review:', error)
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    )
  }
}
